import type { BoardTemplate } from "../../home/templates";
import { KanflowCard, KanflowIcon } from "../ui";

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
      className="template-card"
      aria-label={blank ? "Criar quadro em branco" : `Criar quadro com o modelo ${template.name}: ${template.columns.join(", ")}`}
      onClick={() => onSelect(template)}
    >
      <span className={blank ? "template-thumb template-thumb-blank" : "template-thumb"} aria-hidden="true">
        {blank ? (
          <KanflowIcon name="plus-circle" size={28} />
        ) : (
          template.columns.slice(0, 5).map((column, i) => (
            <span key={column} className="template-col">
              {Array.from({ length: ((i * 2) % 3) + 1 }, (_, j) => (
                <span key={j} className={i === 1 && j === 0 ? "template-chip is-accent" : "template-chip"} />
              ))}
            </span>
          ))
        )}
      </span>
      <span className="template-text">
        <span className="template-name">{template.name}</span>
        <span className="template-desc">{template.description}</span>
      </span>
    </KanflowCard>
  );
}
