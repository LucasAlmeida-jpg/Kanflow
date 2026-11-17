import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "../../lib/cx";
import { KanflowField } from "./KanflowField";
import styles from "./ui.module.css";

type KanflowInputProps = ComponentPropsWithRef<"input"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

export function KanflowInput({ label, hint, error, id, className, ...rest }: KanflowInputProps) {
  return (
    <KanflowField label={label} hint={hint} error={error} id={id}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cx(styles["control"], className)}
          {...rest}
        />
      )}
    </KanflowField>
  );
}
