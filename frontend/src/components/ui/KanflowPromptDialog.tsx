import { useId, useState, type SubmitEvent } from "react";
import { KanflowButton } from "./KanflowButton";
import { KanflowDialog } from "./KanflowDialog";
import { KanflowInput } from "./KanflowInput";
import styles from "./ui.module.css";

type KanflowPromptDialogProps = {
  open: boolean;
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel: string;
  maxLength?: number;
  requireChange?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

export function KanflowPromptDialog({ open, title, onCancel, ...rest }: KanflowPromptDialogProps) {
  return (
    <KanflowDialog open={open} title={title} onClose={onCancel}>
      {open && <PromptForm key={rest.initialValue} onCancel={onCancel} {...rest} />}
    </KanflowDialog>
  );
}

function PromptForm({
  label,
  initialValue = "",
  confirmLabel,
  maxLength = 200,
  requireChange = false,
  onConfirm,
  onCancel,
}: Omit<KanflowPromptDialogProps, "open" | "title">) {
  const formId = useId();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");

  function submit(e: SubmitEvent) {
    e.preventDefault();
    const next = value.trim();
    if (!next) return setError(`Preencha ${label.toLowerCase()}.`);
    if (requireChange && next === initialValue) return onCancel();
    onConfirm(next);
  }

  return (
    <form id={formId} className={styles["dialog-form"]} onSubmit={submit}>
      <KanflowInput
        label={label}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError("");
        }}
        error={error || undefined}
        maxLength={maxLength}
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
      />
      <div className={styles["dialog-footer"]}>
        <KanflowButton variant="secondary" onClick={onCancel}>
          Cancelar
        </KanflowButton>
        <KanflowButton type="submit" variant="primary">
          {confirmLabel}
        </KanflowButton>
      </div>
    </form>
  );
}
