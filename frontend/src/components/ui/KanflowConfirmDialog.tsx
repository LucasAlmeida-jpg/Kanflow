import { useId, type ReactNode } from "react";
import { KanflowButton } from "./KanflowButton";
import { KanflowDialog } from "./KanflowDialog";
import styles from "./ui.module.css";

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
  const descriptionId = useId();

  return (
    <KanflowDialog
      open={open}
      title={title}
      onClose={onCancel}
      className={styles["confirm-dialog"]}
      {...(description ? { describedBy: descriptionId } : {})}
      footer={
        <>
          <KanflowButton variant="secondary" onClick={onCancel} autoFocus>
            {cancelLabel}
          </KanflowButton>
          <KanflowButton variant={variant} onClick={onConfirm}>
            {confirmLabel}
          </KanflowButton>
        </>
      }
    >
      {description && (
        <p id={descriptionId} className={styles["dialog-text"]}>
          {description}
        </p>
      )}
    </KanflowDialog>
  );
}
