import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../../lib/cx";
import type { IconName } from "../../assets/linearicons/icon-names";
import styles from "./ui.module.css";

type KanflowIconProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  name: IconName;
  size?: number;
  label?: string;
};

export function KanflowIcon({ name, size, label, className, style, ...rest }: KanflowIconProps) {
  return (
    <span
      className={cx("lnr", `lnr-${name}`, styles["icon"], className)}
      style={size ? { fontSize: size, ...style } : style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
    />
  );
}

export type { IconName };
