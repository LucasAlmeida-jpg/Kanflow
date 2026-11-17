import { cx } from "../../lib/cx";
import { initials } from "../../lib/initials";
import styles from "./ui.module.css";

type KanflowAvatarProps = {
  name: string;
  size?: "sm" | "md";
  highlight?: boolean;
  className?: string;
};

export function KanflowAvatar({ name, size = "md", highlight = false, className }: KanflowAvatarProps) {
  return (
    <span className={cx(styles["avatar"], styles[`avatar-${size}`], highlight && styles["avatar-highlight"], className)} title={name} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
