import { generateKeyBetween } from "fractional-indexing";
import { useCallback, useRef, useState, type Dispatch, type RefObject } from "react";
import type { Card, Column, ColumnWithCards } from "../../api";
import { sendOp, type BoardSocket, type OpResult, type OpType } from "../../api/socket";
import { findCard, type BoardAction, type BoardState } from "../boardReducer";
import { positionBetween, resolvePlacement, type Command, type Placement } from "../commands";

export type DragSnapshot = { card: Card; columnId: string; index: number; placement: Placement };

export type ExecOptions = { state?: BoardState; rollbackCard?: Card; failPrefix?: string };

export type ExecResult = Card | true | null;

const TEMP_PREFIX = "temp-";
export const isTemp = (id: string) => id.startsWith(TEMP_PREFIX);
const tempId = () => `${TEMP_PREFIX}${crypto.randomUUID()}`;
export const SAVE_FAILED = "Não foi possível salvar";

function lastPosition(items: { position: string }[]) {
  return items.length ? items[items.length - 1]!.position : null;
}

type Deps = {
  boardId: string;
  dispatch: Dispatch<BoardAction>;
  boardRef: RefObject<BoardState>;
  socketRef: RefObject<BoardSocket | null>;
  setNotice: (notice: string | null) => void;
  reload: () => Promise<void>;
};

export function useBoardOps({ boardId, dispatch, boardRef, socketRef, setNotice, reload }: Deps) {
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const pendingRef = useRef(pending);

  const isPending = useCallback((id: string) => isTemp(id) || pendingRef.current.has(id), []);

  const markPending = useCallback((id: string, on: boolean) => {
    setPending((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      pendingRef.current = next;
      return next;
    });
  }, []);

  const run = useCallback(
    async <T>(type: OpType, payload: object, rollback: () => void, failPrefix = SAVE_FAILED): Promise<OpResult<T>> => {
      const socket = socketRef.current;
      const res: OpResult<T> = socket?.connected
        ? await sendOp<T>(socket, type, payload)
        : { opId: "", ok: false, status: 0, error: "sem conexão com o servidor" };
      if (res.ok) return res;

      rollback();
      if (res.status === 409 && res.current) {
        dispatch({ type: "cardUpsert", card: res.current as Card, force: true });
        setNotice(
          failPrefix === SAVE_FAILED
            ? "Esse card foi alterado por outra pessoa. Mostrando a versão mais recente."
            : `${failPrefix}: o card foi alterado por outra pessoa.`,
        );
      } else {
        setNotice(`${failPrefix}: ${res.error}.`);
        if (res.status === 0 || res.status === 404) void reload();
      }
      return res;
    },
    [dispatch, reload, setNotice, socketRef],
  );

  const upsert = useCallback((card: Card) => dispatch({ type: "cardUpsert", card, force: true }), [dispatch]);

  const exec = useCallback(
    async (cmd: Command, options: ExecOptions = {}): Promise<ExecResult> => {
      const state = options.state ?? boardRef.current;
      const failPrefix = options.failPrefix ?? SAVE_FAILED;
      const gone = () => {
        setNotice(`${failPrefix}: o card não existe mais.`);
        return null;
      };

      if (cmd.kind === "create") {
        const spot = resolvePlacement(state, cmd.card.id, cmd.to, isPending);
        if (!spot || isTemp(cmd.to.columnId)) return gone();
        const optimistic: Card = {
          ...cmd.card,
          columnId: cmd.to.columnId,
          position: positionBetween(spot.before, spot.after),
          version: 1,
          updatedAt: new Date().toISOString(),
        };
        markPending(cmd.card.id, true);
        upsert(optimistic);
        const res = await run<Card>(
          "createCard",
          { ...cmd.card, columnId: cmd.to.columnId },
          () => dispatch({ type: "cardRemove", id: cmd.card.id }),
          failPrefix,
        );
        if (!res.ok) {
          markPending(cmd.card.id, false);
          return null;
        }
        let created = res.result;
        if (spot.after) {
          const atEnd = created;
          const moved = await run<Card>(
            "moveCard",
            { id: created.id, columnId: created.columnId, beforeId: spot.before?.id, afterId: spot.after.id, version: created.version },
            () => upsert(atEnd),
            failPrefix,
          );
          if (moved.ok) created = moved.result;
        }
        upsert(created);
        markPending(cmd.card.id, false);
        return created;
      }

      const at = findCard(state, cmd.cardId);
      if (!at) return gone();
      const rollbackCard = options.rollbackCard ?? at.card;

      if (cmd.kind === "update") {
        upsert({ ...at.card, ...cmd.patch, version: at.card.version + 1 });
        const res = await run<Card>("updateCard", { id: cmd.cardId, ...cmd.patch, version: cmd.version }, () => upsert(rollbackCard), failPrefix);
        if (!res.ok) return null;
        upsert(res.result);
        return res.result;
      }

      if (cmd.kind === "move") {
        const spot = resolvePlacement(state, cmd.cardId, cmd.to, isPending);
        if (!spot) return gone();
        let position: string;
        try {
          position = positionBetween(spot.before, spot.after);
        } catch {
          upsert(rollbackCard);
          return null;
        }
        upsert({ ...at.card, columnId: cmd.to.columnId, position, version: at.card.version + 1 });
        const res = await run<Card>(
          "moveCard",
          { id: cmd.cardId, columnId: cmd.to.columnId, beforeId: spot.before?.id, afterId: spot.after?.id, version: cmd.version },
          () => upsert(rollbackCard),
          failPrefix,
        );
        if (!res.ok) return null;
        upsert(res.result);
        return res.result;
      }

      dispatch({ type: "cardRemove", id: cmd.cardId });
      const res = await run("deleteCard", { id: cmd.cardId, version: cmd.version }, () => upsert(rollbackCard), failPrefix);
      return res.ok ? true : null;
    },
    [boardRef, dispatch, isPending, markPending, run, setNotice, upsert],
  );

  const createColumn = useCallback(
    (title: string) => {
      const state = boardRef.current;
      if (!state) return;
      const temp: Column = { id: tempId(), title, boardId, position: generateKeyBetween(lastPosition(state.columns), null) };
      dispatch({ type: "columnUpsert", column: temp });
      void run<Column>("createColumn", { boardId, title }, () => dispatch({ type: "columnRemove", id: temp.id })).then((res) => {
        if (!res.ok) return;
        dispatch({ type: "columnRemove", id: temp.id });
        dispatch({ type: "columnUpsert", column: res.result });
      });
    },
    [boardId, boardRef, dispatch, run],
  );

  const deleteColumn = useCallback(
    (column: ColumnWithCards) => {
      if (isTemp(column.id)) return;
      dispatch({ type: "columnRemove", id: column.id });
      void run("deleteColumn", { id: column.id }, () => dispatch({ type: "columnUpsert", column }));
    },
    [dispatch, run],
  );

  const previewMove = useCallback(
    (id: string, columnId: string, index: number) => dispatch({ type: "cardPreview", id, columnId, index }),
    [dispatch],
  );

  const restore = useCallback((snapshot: DragSnapshot) => upsert(snapshot.card), [upsert]);

  return { isPending, exec, createColumn, deleteColumn, previewMove, restore };
}
