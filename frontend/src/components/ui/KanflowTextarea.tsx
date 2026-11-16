import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "../../lib/cx";
import { KanflowField } from "./KanflowField";

type KanflowTextareaProps = ComponentPropsWithRef<"textarea"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

export function KanflowTextarea({ label, hint, error, id, className, rows = 5, ...rest }: KanflowTextareaProps) {
  return (
    <KanflowField label={label} hint={hint} error={error} id={id}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cx("control", "control-textarea", className)}
          {...rest}
        />
      )}
    </KanflowField>
  );
}
