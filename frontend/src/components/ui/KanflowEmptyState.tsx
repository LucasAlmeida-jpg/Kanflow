import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import { KanflowIcon, type IconName } from "./KanflowIcon";

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
    <div className={cx("empty-state", compact && "empty-state-compact", className)}>
      <span className="empty-state-icon">
        <KanflowIcon name={icon} />
      </span>
      <div className="empty-state-text">
        <h3 className="empty-state-title">{title}</h3>
        {description && <p className="empty-state-description">{description}</p>}
      </div>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
