import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${column.id}`,
    data: { type: "column", columnId: column.id },
    disabled: pending,
  });
  const titleId = `column-title-${column.id}`;
  const count = column.cards.length;

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
            variant="ghost"
            size="sm"
            className="board-column-delete"
            aria-label={`Apagar coluna ${column.title}`}
            onClick={() => onDelete(column)}
          >
            <KanflowIcon name="trash" />
          </KanflowButton>
        )}
      </header>


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
