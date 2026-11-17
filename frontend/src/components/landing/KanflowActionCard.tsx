import { Link } from "react-router";
import { KanflowCard, KanflowIcon } from "../ui";
import styles from "./landing.module.css";

type KanflowActionCardProps = {
  title: string;
  description: string;
  to: string;
};

export function KanflowActionCard({ title, description, to }: KanflowActionCardProps) {
  return (
    <KanflowCard variant="muted" padding="lg" className={styles["action-card"]}>
      <h3 className={styles["action-card-title"]}>
        {to.startsWith("#") ? (
          <a href={to} className={styles["action-card-link"]}>
            {title}
          </a>
        ) : (
          <Link to={to} className={styles["action-card-link"]}>
            {title}
          </Link>
        )}
      </h3>
      <p className={styles["action-card-description"]}>{description}</p>
      <span className={styles["action-card-arrow"]} aria-hidden="true">
        <KanflowIcon name="arrow-right" />
      </span>
    </KanflowCard>
  );
}
