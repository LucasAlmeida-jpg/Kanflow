import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type Active,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Over,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useAuth } from "../auth";
import type { Card, ColumnWithCards } from "../api";
import { boardReducer, findCard, type BoardState } from "../board/boardReducer";
import { placementOf } from "../board/commands";
import { isTemp, useBoard, type ConnectionStatus, type DragSnapshot } from "../board/useBoard";
import {
  KanflowActivityPanel,
  KanflowAddForm,
  KanflowBoardCardOverlay,
  KanflowBoardColumn,
  KanflowCardEditor,
  KanflowShareDialog,
} from "../components/board";
import { KanflowAvatar, KanflowButton, KanflowCard, KanflowConfirmDialog, KanflowIcon } from "../components/ui";
import { cx } from "../lib/cx";

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: "Conectando...",
  online: "Online",
  offline: "Reconectando...",
};

const INSTRUCTIONS =
  "Para mover um card, pressione espaço ou enter. Use as setas para escolher o lugar e pressione espaço ou enter de novo para soltar. Esc cancela.";

type Target = { columnId: string; cardIndex: number | null };

type PendingDelete = { type: "card"; card: Card } | { type: "column"; column: ColumnWithCards } | null;

function latest(board: BoardState, target: PendingDelete): PendingDelete {
  if (target?.type === "card") {
    const card = findCard(board, target.card.id)?.card;
    return card ? { type: "card", card } : null;
  }
  if (target?.type === "column") {
    const column = board?.columns.find((c) => c.id === target.column.id);
    return column ? { type: "column", column } : null;
  }
  return null;
}

function deleteCopy(target: NonNullable<PendingDelete>) {
  if (target.type === "card") {
    return {
      title: "Apagar card?",
      description: `O card "${target.card.title}" será apagado para todos neste quadro.`,
      confirmLabel: "Apagar card",
    };
  }
  const count = target.column.cards.length;
  const cards = count === 0 ? "" : count === 1 ? " e o card dela" : ` e os ${count} cards dela`;
  return {
    title: "Apagar coluna?",
    description: `A coluna "${target.column.title}"${cards} ${count === 0 ? "será apagada" : "serão apagados"} para todos neste quadro.`,
    confirmLabel: "Apagar coluna",
  };
}

function targetOf(board: BoardState, over: Over | null): Target | null {
  if (!over) return null;
  if (over.data.current?.type === "column") return { columnId: over.data.current.columnId as string, cardIndex: null };
  const at = findCard(board, String(over.id));
  return at ? { columnId: at.column.id, cardIndex: at.index } : null;
}

function isBelow(active: Active, over: Over) {
  const rect = active.rect.current.translated;
  return !!rect && rect.top > over.rect.top + over.rect.height / 2;
}

export function BoardView() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    board,
    members,
    inviteMember,
    removeMember,
    error,
    status,
    notice,
    dismissNotice,
    createColumn,
    deleteColumn,
    createCard,
    updateCard,
    deleteCard,
    previewMove,
    commitMove,
    restore,
    isPending,
    undo,
    redo,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
  } = useBoard(id, user?.id);
  const [drag, setDrag] = useState<DragSnapshot | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const editing = editingId ? findCard(board, editingId) : null;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']") || document.querySelector("dialog[open]")) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  const deleteTarget = latest(board, pendingDelete);

  function confirmDelete() {
    if (deleteTarget?.type === "card") void deleteCard(deleteTarget.card.id);
    if (deleteTarget?.type === "column") deleteColumn(deleteTarget.column);
    setPendingDelete(null);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const cardTitle = (cardId: UniqueIdentifier) => findCard(board, String(cardId))?.card.title ?? "card";
  const columnTitle = (over: Over | null) => {
    const target = targetOf(board, over);
    return board?.columns.find((c) => c.id === target?.columnId)?.title ?? "uma coluna";
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Card ${cardTitle(active.id)} pego.`,
    onDragOver: ({ active, over }) =>
      over ? `Card ${cardTitle(active.id)} sobre ${columnTitle(over)}.` : `Card ${cardTitle(active.id)} fora das colunas.`,
    onDragEnd: ({ active, over }) =>
      over ? `Card ${cardTitle(active.id)} solto em ${columnTitle(over)}.` : `Card ${cardTitle(active.id)} solto fora das colunas. Movimento cancelado.`,
    onDragCancel: ({ active }) => `Movimento do card ${cardTitle(active.id)} cancelado.`,
  };

  function onDragStart({ active }: DragStartEvent) {
    const at = findCard(board, String(active.id));
    if (!at) return;
    const placement = placementOf(board, at.card.id, isPending);
    if (!placement) return;
    setDrag({ card: at.card, columnId: at.column.id, index: at.index, placement });
    setOverColumnId(at.column.id);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    const at = findCard(board, String(active.id));
    const target = targetOf(board, over);
    if (!at || !target || !over) return;
    setOverColumnId(target.columnId);
    if (target.columnId === at.column.id) return;
    const column = board!.columns.find((c) => c.id === target.columnId)!;
    const index = target.cardIndex === null ? column.cards.length : target.cardIndex + (isBelow(active, over) ? 1 : 0);
    previewMove(at.card.id, target.columnId, index);
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const snapshot = drag;
    setDrag(null);
    setOverColumnId(null);
    if (!snapshot || !board) return;
    if (!over) return restore(snapshot);

    let state: BoardState = board;
    const at = findCard(state, String(active.id));
    const target = targetOf(state, over);
    if (at && target && target.columnId === at.column.id && target.cardIndex !== null && over.id !== active.id) {
      state = boardReducer(state, { type: "cardPreview", id: at.card.id, columnId: target.columnId, index: target.cardIndex });
      previewMove(at.card.id, target.columnId, target.cardIndex);
    }
    void commitMove(state, snapshot);
  }

  function onDragCancel() {
    if (drag) restore(drag);
    setDrag(null);
    setOverColumnId(null);
  }

  if (error) {
    return (
      <main className="page">
        <p className="error" role="alert">
          {error}
        </p>
        <Link to="/" className="back-link">
          <KanflowIcon name="arrow-left" />
          Voltar para os quadros
        </Link>
      </main>
    );
  }
  if (!board) return <main className="page muted">Carregando...</main>;

  return (
    <main className="page board-page">
      <header className="board-header">
        <h2>{board.title}</h2>
        <span className={cx("board-status", `is-${status}`)} role="status">
          {STATUS_LABEL[status]}
        </span>
        <div className="board-toolbar">
          <KanflowButton
            variant="ghost"
            size="sm"
            disabled={!canUndo}
            onClick={undo}
            aria-label={canUndo ? `Desfazer ${undoLabel}` : "Desfazer"}
            title={canUndo ? `Desfazer ${undoLabel} (Ctrl+Z)` : "Nada para desfazer"}
          >
            <KanflowIcon name="undo" />
            Desfazer
          </KanflowButton>
          <KanflowButton
            variant="ghost"
            size="sm"
            disabled={!canRedo}
            onClick={redo}
            aria-label={canRedo ? `Refazer ${redoLabel}` : "Refazer"}
            title={canRedo ? `Refazer ${redoLabel} (Ctrl+Shift+Z)` : "Nada para refazer"}
          >
            <KanflowIcon name="redo" />
            Refazer
          </KanflowButton>
          <div className="board-people">
            <ul className="avatar-stack" aria-label={`${members.length} pessoas no quadro: ${members.map((m) => m.name).join(", ")}`}>
              {members.slice(0, 4).map((m) => (
                <li key={m.id}>
                  <KanflowAvatar name={m.name} size="sm" highlight={m.id === user?.id} />
                </li>
              ))}
              {members.length > 4 && (
                <li>
                  <span className="avatar avatar-sm avatar-more" aria-hidden="true">
                    +{members.length - 4}
                  </span>
                </li>
              )}
            </ul>
            <KanflowButton variant="secondary" size="sm" onClick={() => setShareOpen(true)}>
              <KanflowIcon name="users" />
              Compartilhar
            </KanflowButton>
          </div>
          <KanflowButton variant="secondary" size="sm" onClick={() => setActivityOpen(true)}>
            <KanflowIcon name="history" />
            Atividade
          </KanflowButton>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
        accessibility={{ announcements, screenReaderInstructions: { draggable: INSTRUCTIONS } }}
      >
        <div className="board-lanes">
          {board.columns.map((column) => (
            <KanflowBoardColumn
              key={column.id}
              column={column}
              pending={isTemp(column.id)}
              highlighted={!!drag && overColumnId === column.id}
              isPendingCard={isPending}
              onAddCard={(columnId, title) => void createCard(columnId, title)}
              onOpenCard={(card) => setEditingId(card.id)}
              onDeleteCard={(card) => setPendingDelete({ type: "card", card })}
              onDelete={(column) => setPendingDelete({ type: "column", column })}
            />
          ))}

          <KanflowCard variant="muted" padding="sm" className="board-add-column">
            {board.columns.length === 0 && <p className="muted board-empty">Esse quadro ainda não tem colunas.</p>}
            <KanflowAddForm
              openLabel="Adicionar coluna"
              placeholder="Nome da coluna"
              submitLabel="Criar coluna"
              onSubmit={createColumn}
            />
          </KanflowCard>
        </div>

        <DragOverlay>{drag ? <KanflowBoardCardOverlay card={drag.card} /> : null}</DragOverlay>
      </DndContext>

      <KanflowCardEditor
        card={editing?.card ?? null}
        columnTitle={editing?.column.title}
        onSave={(cardId, patch) => void updateCard(cardId, patch)}
        onClose={() => setEditingId(null)}
      />

      <KanflowActivityPanel open={activityOpen} board={board} onClose={() => setActivityOpen(false)} />

      {user && (
        <KanflowShareDialog
          open={shareOpen}
          boardTitle={board.title}
          members={members}
          currentUserId={user.id}
          onInvite={inviteMember}
          onRemove={(member) => void removeMember(member.id)}
          onLeave={async () => {
            if (await removeMember(user.id)) navigate("/");
          }}
          onClose={() => setShareOpen(false)}
        />
      )}

      <KanflowConfirmDialog
        open={!!deleteTarget}
        {...(deleteTarget ? deleteCopy(deleteTarget) : { title: "", confirmLabel: "" })}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {notice && (
        <div className="board-notice" role="status">
          <KanflowIcon name="warning" />
          <span>{notice}</span>
          <KanflowButton variant="ghost" size="sm" aria-label="Fechar aviso" onClick={dismissNotice}>
            <KanflowIcon name="cross" />
          </KanflowButton>
        </div>
      )}
    </main>
  );
}
