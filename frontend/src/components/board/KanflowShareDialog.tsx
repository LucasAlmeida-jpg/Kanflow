import { useState, type SubmitEvent } from "react";
import type { Invitation, Member } from "../../api";
import { timeAgo } from "../../board/activity";
import { KanflowAvatar, KanflowButton, KanflowConfirmDialog, KanflowDialog, KanflowIcon, KanflowInput } from "../ui";

type KanflowShareDialogProps = {
  open: boolean;
  boardTitle: string;
  members: Member[];
  invitations: Invitation[];
  currentUserId: string;
  onInvite: (email: string) => Promise<string | null>;
  onCancelInvitation: (invitationId: string) => void;
  onRemove: (member: Member) => void;
  onLeave: () => void;
  onClose: () => void;
};

export function KanflowShareDialog({
  open,
  boardTitle,
  members,
  invitations,
  currentUserId,
  onInvite,
  onCancelInvitation,
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
    setSent(`Convite enviado para ${value}. A pessoa entra no quadro quando aceitar.`);
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
              hint="A pessoa vê o convite ao entrar no Kanflow, mesmo que ainda não tenha conta."
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

        {isOwner && invitations.length > 0 && (
          <section className="share-members" aria-labelledby="share-pending-title">
            <h3 id="share-pending-title" className="share-members-title">
              {invitations.length} {invitations.length === 1 ? "convite pendente" : "convites pendentes"}
            </h3>
            <ul className="share-list">
              {invitations.map((i) => (
                <li key={i.id} className="share-row">
                  <span className="avatar avatar-md share-pending-icon" aria-hidden="true">
                    <KanflowIcon name="envelope" />
                  </span>
                  <span className="share-person">
                    <span className="share-name">{i.email}</span>
                    <span className="share-email">Convidado {timeAgo(i.createdAt)}</span>
                  </span>
                  <KanflowButton variant="ghost" size="sm" aria-label={`Cancelar convite de ${i.email}`} onClick={() => onCancelInvitation(i.id)}>
                    Cancelar
                  </KanflowButton>
                </li>
              ))}
            </ul>
          </section>
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
