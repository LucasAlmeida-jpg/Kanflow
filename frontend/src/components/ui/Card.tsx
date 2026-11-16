import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cx } from "./cx";

type CardProps<T extends ElementType> = {
  as?: T;
  variant?: "default" | "muted";
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

export function Card<T extends ElementType = "div">({
  as,
  variant = "default",
  padding = "md",
  interactive = false,
  className,
  ...rest
}: CardProps<T>) {
  const Tag: ElementType = as ?? "div";
  return (
    <Tag
      className={cx("ui-card", `ui-card-${variant}`, `ui-card-pad-${padding}`, interactive && "ui-card-interactive", className)}
      {...rest}
    />
  );
}
