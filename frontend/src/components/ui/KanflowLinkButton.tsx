import { Link, type LinkProps } from "react-router";
import { cx } from "../../lib/cx";
import styles from "./ui.module.css";

type KanflowLinkButtonProps = LinkProps & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
};

export function KanflowLinkButton({ variant = "secondary", size = "md", className, ...rest }: KanflowLinkButtonProps) {
  return <Link className={cx(styles["btn"], styles[`btn-${variant}`], styles[`btn-${size}`], styles["btn-link"], className)} {...rest} />;
}
