import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, ColumnWithCards } from "../../api";
import { cx } from "../../lib/cx";
import { KanflowCard } from "../ui";
import { KanflowAddForm } from "./KanflowAddForm";
import { KanflowBoardCard } from "./KanflowBoardCard";

type KanflowBoardColumnProps = {
  column: ColumnWithCards;
  pending?: boolean;
  highlighted?: boolean;
  isPendingCard: (id: string) => boolean;
  onAddCard: (columnId: string, title: string) => void;
  onDeleteCard: (card: Card) => void;
};

export function KanflowBoardColumn({
  column,
  pending = false,
  highlighted = false,
  isPendingCard,
  onAddCard,
  onDeleteCard,
}: KanflowBoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${column.id}`,
    data: { type: "column", columnId: column.id },
    disabled: pending,
  });
  const titleId = `column-title-${column.id}`;

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
        <span className="board-column-count" aria-label={`${column.cards.length} cards`}>
          {column.cards.length}
        </span>
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
