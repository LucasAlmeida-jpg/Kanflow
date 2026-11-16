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
import { useState } from "react";
import { Link, useParams } from "react-router";
import { boardReducer, findCard, type BoardState } from "../board/boardReducer";
import { isTemp, useBoard, type ConnectionStatus, type DragSnapshot } from "../board/useBoard";
import { KanflowAddForm, KanflowBoardCardOverlay, KanflowBoardColumn } from "../components/board";
import { KanflowButton, KanflowCard, KanflowIcon } from "../components/ui";
import { cx } from "../lib/cx";

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: "Conectando...",
  online: "Ao vivo",
  offline: "Reconectando...",
};

const INSTRUCTIONS =
  "Para mover um card, pressione espaço ou enter. Use as setas para escolher o lugar e pressione espaço ou enter de novo para soltar. Esc cancela.";

type Target = { columnId: string; cardIndex: number | null };

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
  const { board, error, status, notice, dismissNotice, createColumn, createCard, deleteCard, previewMove, commitMove, restore } =
    useBoard(id);
  const [drag, setDrag] = useState<DragSnapshot | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

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
    setDrag({ card: at.card, columnId: at.column.id, index: at.index });
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
    commitMove(state, snapshot);
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
    <main className="page">
      <header className="board-header">
        <h2>{board.title}</h2>
        <span className={cx("board-status", `is-${status}`)} role="status">
          {STATUS_LABEL[status]}
        </span>
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
              isPendingCard={isTemp}
              onAddCard={createCard}
              onDeleteCard={deleteCard}
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
