import { Link } from "react-router";
import { KanflowCard, KanflowIcon } from "../ui";

type KanflowActionCardProps = {
  title: string;
  description: string;
  to: string;
};

export function KanflowActionCard({ title, description, to }: KanflowActionCardProps) {
  return (
    <KanflowCard variant="muted" padding="lg" className="action-card">
      <h3 className="action-card-title">
        {to.startsWith("#") ? (
          <a href={to} className="action-card-link">
            {title}
          </a>
        ) : (
          <Link to={to} className="action-card-link">
            {title}
          </Link>
        )}
      </h3>
      <p className="action-card-description">{description}</p>
      <span className="action-card-arrow" aria-hidden="true">
        <KanflowIcon name="arrow-right" />
      </span>
    </KanflowCard>
  );
}
