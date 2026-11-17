import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card } from "../../api";
import { cx } from "../../lib/cx";
import { KanflowButton, KanflowCard, KanflowIcon } from "../ui";
import styles from "./board.module.css";

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
      className={cx(styles["board-card"], isDragging && styles["is-placeholder"], pending && styles["is-pending"])}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-busy={pending || undefined}
      onClick={() => !pending && onOpen?.(card)}
      {...attributes}
      {...listeners}
    >
      <span className={styles["board-card-body"]}>
        <span className={styles["board-card-title"]}>{card.title}</span>
        {card.description && (
          <span className={styles["board-card-hint"]}>
            <KanflowIcon name="text-align-left" size={12} label="Tem descrição" />
          </span>
        )}
      </span>
      {!pending && (
        <span className={styles["board-card-actions"]}>
          {onOpen && (
            <KanflowButton
              variant="ghost"
              size="sm"
              className={styles["board-card-action"]}
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
              className={cx(styles["board-card-action"], styles["board-card-delete"])}
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
    <KanflowCard padding="sm" className={cx(styles["board-card"], styles["is-overlay"])}>
      <span className={styles["board-card-body"]}>
        <span className={styles["board-card-title"]}>{card.title}</span>
      </span>
    </KanflowCard>
  );
}
