import { Link, type LinkProps } from "react-router";
import { cx } from "../../lib/cx";

type KanflowLinkButtonProps = LinkProps & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
};

export function KanflowLinkButton({ variant = "secondary", size = "md", className, ...rest }: KanflowLinkButtonProps) {
  return <Link className={cx("btn", `btn-${variant}`, `btn-${size}`, "btn-link", className)} {...rest} />;
}
