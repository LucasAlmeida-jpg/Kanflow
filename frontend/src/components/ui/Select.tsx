import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./cx";
import { Field } from "./Field";

type Option = { value: string; label: string; disabled?: boolean };

type SelectProps = Omit<ComponentPropsWithRef<"select">, "children"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options: Option[];
  placeholder?: string;
};

export function Select({ label, hint, error, id, className, options, placeholder, ...rest }: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} id={id}>
      {({ id, describedBy, invalid }) => (
        <div className="select">
          <select
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cx("control", className)}
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
    </Field>
  );
}
