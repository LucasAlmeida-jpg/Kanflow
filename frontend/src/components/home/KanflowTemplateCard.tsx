import type { BoardTemplate } from "../../home/templates";
import { KanflowCard, KanflowIcon } from "../ui";
import styles from "./home.module.css";
import { cx } from "../../lib/cx";

type KanflowTemplateCardProps = {
  template: BoardTemplate;
  disabled?: boolean;
  onSelect: (template: BoardTemplate) => void;
};

export function KanflowTemplateCard({ template, disabled = false, onSelect }: KanflowTemplateCardProps) {
  const blank = template.columns.length === 0;
  return (
    <KanflowCard
      as="button"
      type="button"
      padding="none"
      interactive
      disabled={disabled}
      className={styles["template-card"]}
      aria-label={blank ? "Criar quadro em branco" : `Criar quadro com o modelo ${template.name}: ${template.columns.join(", ")}`}
      onClick={() => onSelect(template)}
    >
      <span className={blank ? cx(styles["template-thumb"], styles["template-thumb-blank"]) : styles["template-thumb"]} aria-hidden="true">
        {blank ? (
          <KanflowIcon name="plus-circle" size={28} />
        ) : (
          template.columns.slice(0, 5).map((column, i) => (
            <span key={column} className={styles["template-col"]}>
              {Array.from({ length: ((i * 2) % 3) + 1 }, (_, j) => (
                <span key={j} className={i === 1 && j === 0 ? cx(styles["template-chip"], styles["is-accent"]) : styles["template-chip"]} />
              ))}
            </span>
          ))
        )}
      </span>
      <span className={styles["template-text"]}>
        <span className={styles["template-name"]}>{template.name}</span>
        <span className={styles["template-desc"]}>{template.description}</span>
      </span>
    </KanflowCard>
  );
}
