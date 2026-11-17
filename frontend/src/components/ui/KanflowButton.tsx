import type { ComponentPropsWithRef } from "react";
import { cx } from "../../lib/cx";
import styles from "./ui.module.css";

type KanflowButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
  block?: boolean;
};

export function KanflowButton({
  variant = "secondary",
  size = "md",
  loading = false,
  block = false,
  disabled,
  type = "button",
  className,
  children,
  ...rest
}: KanflowButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(styles["btn"], styles[`btn-${variant}`], styles[`btn-${size}`], block && styles["btn-block"], className)}
      {...rest}
    >
      {loading && <span className={styles["btn-spinner"]} aria-hidden="true" />}
      {children}
    </button>
  );
}
