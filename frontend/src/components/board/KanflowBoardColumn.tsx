import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useRef, useState } from "react";
import type { Card, ColumnWithCards } from "../../api";
import { cx } from "../../lib/cx";
import { KanflowButton, KanflowCard, KanflowIcon } from "../ui";
import { KanflowAddForm } from "./KanflowAddForm";
import { KanflowBoardCard } from "./KanflowBoardCard";

type KanflowBoardColumnProps = {
  column: ColumnWithCards;
  pending?: boolean;
  highlighted?: boolean;
  isPendingCard: (id: string) => boolean;
  onAddCard: (columnId: string, title: string) => void;
  onDeleteCard: (card: Card) => void;
  onDelete: (column: ColumnWithCards) => void;
};

export function KanflowBoardColumn({
  column,
  pending = false,
  highlighted = false,
  isPendingCard,
  onAddCard,
  onDeleteCard,
  onDelete,
}: KanflowBoardColumnProps) {
  const [confirming, setConfirming] = useState(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${column.id}`,
    data: { type: "column", columnId: column.id },
    disabled: pending,
  });
  const titleId = `column-title-${column.id}`;
  const count = column.cards.length;

  function cancel() {
    setConfirming(false);
    deleteButtonRef.current?.focus();
  }

  return (
    <KanflowCard
      as="section"
      ref={setNodeRef}
      variant="muted"
      padding="none"
      className={cx("board-column", (isOver || highlighted) && "is-over", pending && "is-pending")}
      aria-labelledby={titleId}
    >
      <header className="board-column-header">
        <h3 id={titleId}>{column.title}</h3>
        <span className="board-column-count" aria-label={`${count} cards`}>
          {count}
        </span>
        {!pending && (
          <KanflowButton
            ref={deleteButtonRef}
            variant="ghost"
            size="sm"
            className="board-column-delete"
            aria-label={`Apagar coluna ${column.title}`}
            aria-expanded={confirming}
            onClick={() => setConfirming(true)}
          >
            <KanflowIcon name="trash" />
          </KanflowButton>
        )}
      </header>

      {confirming && (
        <div className="board-column-confirm" role="alertdialog" aria-label={`Apagar coluna ${column.title}`} onKeyDown={(e) => e.key === "Escape" && cancel()}>
          <p>{count === 0 ? "Apagar esta coluna?" : `Apagar esta coluna e ${count === 1 ? "o card" : `os ${count} cards`} dela?`}</p>
          <div className="board-column-confirm-actions">
            <KanflowButton variant="danger" size="sm" onClick={() => onDelete(column)}>
              Apagar coluna
            </KanflowButton>
            <KanflowButton variant="ghost" size="sm" onClick={cancel} autoFocus>
              Cancelar
            </KanflowButton>
          </div>
        </div>
      )}

      <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <ul className="board-column-cards">
          {column.cards.map((card) => (
            <KanflowBoardCard key={card.id} card={card} pending={isPendingCard(card.id)} onDelete={onDeleteCard} />
          ))}
        </ul>
      </SortableContext>

      <footer className="board-column-footer">
        <KanflowAddForm
          openLabel="Adicionar card"
          placeholder="Título do card"
          submitLabel="Adicionar"
          disabled={pending}
          onSubmit={(title) => onAddCard(column.id, title)}
        />
      </footer>
    </KanflowCard>
  );
}
