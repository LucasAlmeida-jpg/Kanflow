import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card } from "../../api";
import { cx } from "../../lib/cx";
import { KanflowButton, KanflowCard, KanflowIcon } from "../ui";

type KanflowBoardCardProps = {
  card: Card;
  pending?: boolean;
  onDelete?: (card: Card) => void;
};

export function KanflowBoardCard({ card, pending = false, onDelete }: KanflowBoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", columnId: card.columnId },
    disabled: pending,
  });

  return (
    <KanflowCard
      as="li"
      ref={setNodeRef}
      padding="sm"
      className={cx("board-card", isDragging && "is-placeholder", pending && "is-pending")}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-busy={pending || undefined}
      {...attributes}
      {...listeners}
    >
      <span className="board-card-title">{card.title}</span>
      {onDelete && !pending && (
        <KanflowButton
          variant="ghost"
          size="sm"
          className="board-card-delete"
          aria-label={`Apagar card ${card.title}`}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onClick={() => onDelete(card)}
        >
          <KanflowIcon name="trash" />
        </KanflowButton>
      )}
    </KanflowCard>
  );
}

export function KanflowBoardCardOverlay({ card }: { card: Card }) {
  return (
    <KanflowCard padding="sm" className="board-card is-overlay">
      <span className="board-card-title">{card.title}</span>
    </KanflowCard>
  );
}
