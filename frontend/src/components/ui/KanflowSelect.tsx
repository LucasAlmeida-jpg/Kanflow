import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "../../lib/cx";
import { KanflowField } from "./KanflowField";
import styles from "./ui.module.css";

type Option = { value: string; label: string; disabled?: boolean };

type KanflowSelectProps = Omit<ComponentPropsWithRef<"select">, "children"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options: Option[];
  placeholder?: string;
};

export function KanflowSelect({ label, hint, error, id, className, options, placeholder, ...rest }: KanflowSelectProps) {
  return (
    <KanflowField label={label} hint={hint} error={error} id={id}>
      {({ id, describedBy, invalid }) => (
        <div className={styles["select"]}>
          <select
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cx(styles["control"], className)}
            {...rest}
          >
            {placeholder !== undefined && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </KanflowField>
  );
}
