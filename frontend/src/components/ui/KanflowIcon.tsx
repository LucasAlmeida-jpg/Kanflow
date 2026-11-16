import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./cx";
import type { IconName } from "./icon-names";

type KanflowIconProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  name: IconName;
  size?: number;
  label?: string;
};

export function KanflowIcon({ name, size, label, className, style, ...rest }: KanflowIconProps) {
  return (
    <span
      className={cx("lnr", `lnr-${name}`, "icon", className)}
      style={size ? { fontSize: size, ...style } : style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
    />
  );
}

export type { IconName };
