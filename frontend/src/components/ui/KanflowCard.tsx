import type { ComponentPropsWithRef, ElementType } from "react";
import { cx } from "../../lib/cx";
import styles from "./ui.module.css";

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
      className={cx(styles["ui-card"], styles[`ui-card-${variant}`], styles[`ui-card-pad-${padding}`], interactive && styles["ui-card-interactive"], className)}
      {...rest}
    />
  );
}
