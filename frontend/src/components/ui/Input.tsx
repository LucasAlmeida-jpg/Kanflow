import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./cx";
import { Field } from "./Field";

type InputProps = ComponentPropsWithRef<"input"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

export function Input({ label, hint, error, id, className, ...rest }: InputProps) {
  return (
    <Field label={label} hint={hint} error={error} id={id}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cx("control", className)}
          {...rest}
        />
      )}
    </Field>
  );
}
