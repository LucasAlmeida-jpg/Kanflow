import { cx } from "../../lib/cx";
import { initials } from "../../lib/initials";

type KanflowAvatarProps = {
  name: string;
  size?: "sm" | "md";
  highlight?: boolean;
  className?: string;
};

export function KanflowAvatar({ name, size = "md", highlight = false, className }: KanflowAvatarProps) {
  return (
    <span className={cx("avatar", `avatar-${size}`, highlight && "avatar-highlight", className)} title={name} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
