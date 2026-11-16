import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { KanflowButton } from "./KanflowButton";
import { KanflowIcon } from "./KanflowIcon";

type KanflowDialogProps = {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  variant?: "modal" | "drawer";
  describedBy?: string;
  className?: string;
};

export function KanflowDialog({
  open,
  title,
  onClose,
  children,
  footer,
  variant = "modal",
  describedBy,
  className,
}: KanflowDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function onBackdropClick(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <dialog
      ref={ref}
      className={cx("dialog", `dialog-${variant}`, className)}
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={onBackdropClick}
    >
      {open && (
        <div className="dialog-body">
          <header className="dialog-header">
            <h2 id={titleId} className="dialog-title">
              {title}
            </h2>
            {variant === "drawer" && (
              <KanflowButton variant="ghost" size="sm" aria-label="Fechar" onClick={onClose}>
                <KanflowIcon name="cross" />
              </KanflowButton>
            )}
          </header>
          {children && <div className="dialog-content">{children}</div>}
          {footer && <footer className="dialog-footer">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
