import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";
import { KanflowButton } from "./KanflowButton";

type KanflowConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
};

export function KanflowConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  variant = "danger",
  onConfirm,
  onCancel,
}: KanflowConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function onBackdropClick(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) onCancel();
  }

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={onBackdropClick}
    >
      {open && (
        <div className="confirm-dialog-body">
          <h2 id={titleId} className="confirm-dialog-title">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="confirm-dialog-description">
              {description}
            </p>
          )}
          <div className="confirm-dialog-actions">
            <KanflowButton variant="secondary" onClick={onCancel} autoFocus>
              {cancelLabel}
            </KanflowButton>
            <KanflowButton variant={variant} onClick={onConfirm}>
              {confirmLabel}
            </KanflowButton>
          </div>
        </div>
      )}
    </dialog>
  );
}
