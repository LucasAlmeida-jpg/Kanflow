import { useId, useState, type SubmitEvent } from "react";
import type { Card } from "../../api";
import type { CardPatch } from "../../board/commands";
import { KanflowButton, KanflowDialog, KanflowInput, KanflowTextarea } from "../ui";
import styles from "./board.module.css";
import { cx } from "../../lib/cx";

type KanflowCardEditorProps = {
  card: Card | null;
  columnTitle?: string;
  onSave: (cardId: string, patch: CardPatch) => void;
  onClose: () => void;
};

export function KanflowCardEditor({ card, columnTitle, onSave, onClose }: KanflowCardEditorProps) {
  return (
    <KanflowDialog open={!!card} title="Editar card" onClose={onClose}>
      {card && <EditorForm key={card.id} card={card} columnTitle={columnTitle} onSave={onSave} onClose={onClose} />}
    </KanflowDialog>
  );
}

function EditorForm({ card, columnTitle, onSave, onClose }: KanflowCardEditorProps & { card: Card }) {
  const formId = useId();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [error, setError] = useState("");

  function submit(e: SubmitEvent) {
    e.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) return setError("Dê um título para o card.");
    const patch: CardPatch = {};
    if (nextTitle !== card.title) patch.title = nextTitle;
    if (description !== card.description) patch.description = description;
    if (Object.keys(patch).length) onSave(card.id, patch);
    onClose();
  }

  return (
    <form id={formId} className={styles["card-editor-form"]} onSubmit={submit}>
      {columnTitle && <p className={cx("muted", styles["card-editor-meta"])}>Na coluna {columnTitle}</p>}
      <KanflowInput
        label="Título"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setError("");
        }}
        error={error || undefined}
        maxLength={200}
        required
        autoFocus
      />
      <KanflowTextarea
        label="Descrição"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={10_000}
        rows={6}
        placeholder="Detalhes, links, critérios de pronto..."
      />
      <div className={styles["editor-footer"]}>
        <KanflowButton variant="secondary" onClick={onClose}>
          Cancelar
        </KanflowButton>
        <KanflowButton type="submit" variant="primary">
          Salvar
        </KanflowButton>
      </div>
    </form>
  );
}
