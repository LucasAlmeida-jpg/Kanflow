import { useState, type KeyboardEvent, type SubmitEvent } from "react";
import { KanflowButton, KanflowIcon, KanflowInput } from "../ui";

type KanflowAddFormProps = {
  openLabel: string;
  placeholder: string;
  submitLabel: string;
  onSubmit: (title: string) => void;
  disabled?: boolean;
};

export function KanflowAddForm({ openLabel, placeholder, submitLabel, onSubmit, disabled = false }: KanflowAddFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  function close() {
    setOpen(false);
    setTitle("");
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    onSubmit(value);
    setTitle("");
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  if (!open) {
    return (
      <KanflowButton variant="ghost" size="sm" block className="add-form-open" disabled={disabled} onClick={() => setOpen(true)}>
        <KanflowIcon name="plus-circle" />
        {openLabel}
      </KanflowButton>
    );
  }

  return (
    <form className="add-form" onSubmit={submit} onKeyDown={onKeyDown}>
      <KanflowInput
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={200}
        autoFocus
      />
      <div className="add-form-actions">
        <KanflowButton type="submit" variant="primary" disabled={!title.trim()}>
          {submitLabel}
        </KanflowButton>
        <KanflowButton variant="ghost" onClick={close}>
          Cancelar
        </KanflowButton>
      </div>
    </form>
  );
}
