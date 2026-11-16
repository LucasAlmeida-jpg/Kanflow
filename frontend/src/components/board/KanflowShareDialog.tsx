import { useState, type SubmitEvent } from "react";
import type { Member } from "../../api";
import { KanflowAvatar, KanflowButton, KanflowConfirmDialog, KanflowDialog, KanflowIcon, KanflowInput } from "../ui";

type KanflowShareDialogProps = {
  open: boolean;
  boardTitle: string;
  members: Member[];
  currentUserId: string;
  onInvite: (email: string) => Promise<string | null>;
  onRemove: (member: Member) => void;
  onLeave: () => void;
  onClose: () => void;
};

export function KanflowShareDialog({
  open,
  boardTitle,
  members,
  currentUserId,
  onInvite,
  onRemove,
  onLeave,
  onClose,
}: KanflowShareDialogProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<Member | null>(null);

  const me = members.find((m) => m.id === currentUserId);
  const isOwner = me?.role === "owner";

  async function invite(e: SubmitEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setBusy(true);
    setError("");
    setSent("");
    const failure = await onInvite(value);
    setBusy(false);
    if (failure) return setError(failure.charAt(0).toUpperCase() + failure.slice(1) + ".");
    setSent(`${value} agora faz parte do quadro.`);
    setEmail("");
  }

  const leaving = confirming?.id === currentUserId;

  return (
    <>
      <KanflowDialog open={open} title={`Compartilhar "${boardTitle}"`} onClose={onClose} className="share-dialog">
        {isOwner ? (
          <form className="share-invite" onSubmit={invite}>
            <KanflowInput
              type="email"
              label="Convidar por email"
              hint="A pessoa precisa ter uma conta no Kanflow."
              placeholder="nome@empresa.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
                setSent("");
              }}
              error={error || undefined}
              maxLength={254}
              autoComplete="off"
              autoFocus
            />
            <KanflowButton type="submit" variant="primary" loading={busy} disabled={!email.trim()}>
              Convidar
            </KanflowButton>
          </form>
        ) : (
          <p className="muted share-note">Só o dono do quadro pode convidar pessoas.</p>
        )}
        {sent && (
          <p className="share-sent" role="status">
            <KanflowIcon name="checkmark-circle" />
            {sent}
          </p>
        )}

        <section className="share-members" aria-labelledby="share-members-title">
          <h3 id="share-members-title" className="share-members-title">
            {members.length} {members.length === 1 ? "pessoa" : "pessoas"} neste quadro
          </h3>
          <ul className="share-list">
            {members.map((m) => {
              const self = m.id === currentUserId;
              return (
                <li key={m.id} className="share-row">
                  <KanflowAvatar name={m.name} highlight={self} />
                  <span className="share-person">
                    <span className="share-name">
                      {m.name}
                      {self && <span className="muted"> (você)</span>}
                    </span>
                    <span className="share-email">{m.email}</span>
                  </span>
                  <span className="share-role">{m.role === "owner" ? "Dono" : "Membro"}</span>
                  {m.role !== "owner" && (isOwner || self) && (
                    <KanflowButton variant="ghost" size="sm" onClick={() => setConfirming(m)}>
                      {self ? "Sair" : "Remover"}
                    </KanflowButton>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </KanflowDialog>

      <KanflowConfirmDialog
        open={!!confirming}
        title={leaving ? "Sair do quadro?" : `Remover ${confirming?.name}?`}
        description={
          leaving
            ? `Você perde o acesso a "${boardTitle}". Para voltar, o dono precisa convidar você de novo.`
            : `${confirming?.name} perde o acesso a "${boardTitle}" na hora, inclusive se estiver com o quadro aberto.`
        }
        confirmLabel={leaving ? "Sair do quadro" : "Remover"}
        onConfirm={() => {
          if (!confirming) return;
          if (leaving) onLeave();
          else onRemove(confirming);
          setConfirming(null);
        }}
        onCancel={() => setConfirming(null)}
      />
    </>
  );
}
