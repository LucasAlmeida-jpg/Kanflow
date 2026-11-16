import type { ComponentPropsWithRef } from "react";
import { cx } from "./cx";

type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
  block?: boolean;
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  block = false,
  disabled,
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx("btn", `btn-${variant}`, `btn-${size}`, block && "btn-block", className)}
      {...rest}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
