import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card } from "../../api";
import { cx } from "../../lib/cx";
import { KanflowButton, KanflowCard, KanflowIcon } from "../ui";

type KanflowBoardCardProps = {
  card: Card;
  pending?: boolean;
  onOpen?: (card: Card) => void;
  onDelete?: (card: Card) => void;
};

const stop = { onPointerDown: (e: { stopPropagation: () => void }) => e.stopPropagation(), onKeyDown: (e: { stopPropagation: () => void }) => e.stopPropagation() };

export function KanflowBoardCard({ card, pending = false, onOpen, onDelete }: KanflowBoardCardProps) {
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
      onClick={() => !pending && onOpen?.(card)}
      {...attributes}
      {...listeners}
    >
      <span className="board-card-body">
        <span className="board-card-title">{card.title}</span>
        {card.description && (
          <span className="board-card-hint">
            <KanflowIcon name="text-align-left" size={12} label="Tem descrição" />
          </span>
        )}
      </span>
      {!pending && (
        <span className="board-card-actions">
          {onOpen && (
            <KanflowButton
              variant="ghost"
              size="sm"
              className="board-card-action"
              aria-label={`Editar card ${card.title}`}
              {...stop}
              onClick={(e) => {
                e.stopPropagation();
                onOpen(card);
              }}
            >
              <KanflowIcon name="pencil" />
            </KanflowButton>
          )}
          {onDelete && (
            <KanflowButton
              variant="ghost"
              size="sm"
              className="board-card-action board-card-delete"
              aria-label={`Apagar card ${card.title}`}
              {...stop}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(card);
              }}
            >
              <KanflowIcon name="trash" />
            </KanflowButton>
          )}
        </span>
      )}
    </KanflowCard>
  );
}

export function KanflowBoardCardOverlay({ card }: { card: Card }) {
  return (
    <KanflowCard padding="sm" className="board-card is-overlay">
      <span className="board-card-body">
        <span className="board-card-title">{card.title}</span>
      </span>
    </KanflowCard>
  );
}
