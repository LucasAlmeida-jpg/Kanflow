import type { MyInvitation } from "../../api";
import { timeAgo } from "../../board/activity";
import { KanflowButton, KanflowCard, KanflowIcon } from "../ui";
import styles from "./home.module.css";

type KanflowInvitationListProps = {
  invitations: MyInvitation[];
  busyId: string | null;
  onAccept: (invitation: MyInvitation) => void;
  onDecline: (invitation: MyInvitation) => void;
};

export function KanflowInvitationList({ invitations, busyId, onAccept, onDecline }: KanflowInvitationListProps) {
  return (
    <section className={styles["home-invites"]} aria-labelledby="invites-title">
      <h2 id="invites-title">{invitations.length === 1 ? "Você tem um convite" : `Você tem ${invitations.length} convites`}</h2>
      <ul className={styles["invite-list"]}>
        {invitations.map((invitation) => {
          const busy = busyId === invitation.id;
          return (
            <li key={invitation.id}>
              <KanflowCard variant="muted" padding="md" className={styles["invite-card"]}>
                <span className={styles["invite-icon"]} aria-hidden="true">
                  <KanflowIcon name="envelope" />
                </span>
                <span className={styles["invite-text"]}>
                  <span>
                    <strong>{invitation.invitedBy}</strong> convidou você para o quadro <strong>{invitation.board.title}</strong>
                  </span>
                  <time className={styles["invite-time"]} dateTime={invitation.createdAt}>
                    {timeAgo(invitation.createdAt)}
                  </time>
                </span>
                <span className={styles["invite-actions"]}>
                  <KanflowButton variant="ghost" disabled={!!busyId} onClick={() => onDecline(invitation)}>
                    Recusar
                  </KanflowButton>
                  <KanflowButton variant="primary" loading={busy} disabled={!!busyId && !busy} onClick={() => onAccept(invitation)}>
                    Aceitar
                  </KanflowButton>
                </span>
              </KanflowCard>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
