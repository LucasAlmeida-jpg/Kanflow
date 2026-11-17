import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { ApiError, boardsApi, type Invitation, type Member } from "../../api";

type Deps = {
  boardId: string;
  members: Member[];
  setMembers: Dispatch<SetStateAction<Member[]>>;
  setNotice: (notice: string | null) => void;
};

const message = (err: unknown) => (err instanceof Error ? err.message : "erro inesperado");

export function useMembers({ boardId, members, setMembers, setNotice }: Deps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const loadInvitations = useCallback(async () => {
    try {
      setInvitations(await boardsApi.invitations(boardId));
    } catch {
      setInvitations([]);
    }
  }, [boardId]);

  const inviteMember = useCallback(
    async (email: string): Promise<string | null> => {
      try {
        const invitation = await boardsApi.invite(boardId, email);
        setInvitations((list) => (list.some((i) => i.id === invitation.id) ? list : [...list, invitation]));
        return null;
      } catch (err) {
        return err instanceof ApiError ? err.message : "erro inesperado";
      }
    },
    [boardId],
  );

  const cancelInvitation = useCallback(
    async (invitationId: string) => {
      const snapshot = invitations;
      setInvitations((list) => list.filter((i) => i.id !== invitationId));
      try {
        await boardsApi.cancelInvitation(boardId, invitationId);
      } catch (err) {
        setInvitations(snapshot);
        setNotice(`Não foi possível cancelar o convite: ${message(err)}.`);
      }
    },
    [boardId, invitations, setNotice],
  );

  const removeMember = useCallback(
    async (userId: string): Promise<boolean> => {
      const snapshot = members;
      setMembers((list) => list.filter((m) => m.id !== userId));
      try {
        await boardsApi.removeMember(boardId, userId);
        return true;
      } catch (err) {
        setMembers(snapshot);
        setNotice(`Não foi possível remover: ${message(err)}.`);
        return false;
      }
    },
    [boardId, members, setMembers, setNotice],
  );

  return { invitations, loadInvitations, inviteMember, cancelInvitation, removeMember };
}
