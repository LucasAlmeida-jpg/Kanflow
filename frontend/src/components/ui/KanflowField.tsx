import { useId, type ReactNode } from "react";

type KanflowFieldProps = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  id?: string | undefined;
  children: (control: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
};

export function KanflowField({ label, hint, error, id, children }: KanflowFieldProps) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={controlId}>
          {label}
        </label>
      )}
      {children({ id: controlId, describedBy, invalid: !!error })}
      {hint && !error && (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
