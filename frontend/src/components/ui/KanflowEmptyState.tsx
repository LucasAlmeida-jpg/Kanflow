import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import { KanflowIcon, type IconName } from "./KanflowIcon";
import styles from "./ui.module.css";

type KanflowEmptyStateProps = {
  icon: IconName;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
};

export function KanflowEmptyState({ icon, title, description, action, compact = false, className }: KanflowEmptyStateProps) {
  return (
    <div className={cx(styles["empty-state"], compact && styles["empty-state-compact"], className)}>
      <span className={styles["empty-state-icon"]}>
        <KanflowIcon name={icon} />
      </span>
      <div className={styles["empty-state-text"]}>
        <h3 className={styles["empty-state-title"]}>{title}</h3>
        {description && <p className={styles["empty-state-description"]}>{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
