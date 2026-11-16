import type { ComponentPropsWithRef, ElementType } from "react";
import { cx } from "../../lib/cx";

type KanflowCardProps<T extends ElementType> = {
  as?: T;
  variant?: "default" | "muted";
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
} & Omit<ComponentPropsWithRef<T>, "as">;

export function KanflowCard<T extends ElementType = "div">({
  as,
  variant = "default",
  padding = "md",
  interactive = false,
  className,
  ...rest
}: KanflowCardProps<T>) {
  const Tag: ElementType = as ?? "div";
  return (
    <Tag
      className={cx("ui-card", `ui-card-${variant}`, `ui-card-pad-${padding}`, interactive && "ui-card-interactive", className)}
      {...rest}
    />
  );
}
