import { useBoardOps } from "./hooks/useBoardOps";
import { useBoardSync } from "./hooks/useBoardSync";
import { useCardActions } from "./hooks/useCardActions";
import { useHistory } from "./hooks/useHistory";
import { useMembers } from "./hooks/useMembers";

export { isTemp, type DragSnapshot } from "./hooks/useBoardOps";
export type { ConnectionStatus } from "./hooks/useBoardSync";

export function useBoard(boardId: string, currentUserId?: string) {
  const sync = useBoardSync(boardId, currentUserId);
  const { board, dispatch, boardRef, socketRef, members, setMembers, error, status, notice, setNotice, reload } = sync;

  const ops = useBoardOps({ boardId, dispatch, boardRef, socketRef, setNotice, reload });
  const history = useHistory({ exec: ops.exec, isPending: ops.isPending, boardRef });
  const cards = useCardActions({ exec: ops.exec, record: history.record, restore: ops.restore, isPending: ops.isPending, boardRef });
  const people = useMembers({ boardId, members, setMembers, setNotice });

  return {
    board,
    members,
    invitations: people.invitations,
    loadInvitations: people.loadInvitations,
    inviteMember: people.inviteMember,
    cancelInvitation: people.cancelInvitation,
    removeMember: people.removeMember,
    error,
    status,
    notice,
    dismissNotice: () => setNotice(null),
    isPending: ops.isPending,
    createColumn: ops.createColumn,
    deleteColumn: ops.deleteColumn,
    previewMove: ops.previewMove,
    restore: ops.restore,
    createCard: cards.createCard,
    updateCard: cards.updateCard,
    deleteCard: cards.deleteCard,
    commitMove: cards.commitMove,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    undoLabel: history.undoLabel,
    redoLabel: history.redoLabel,
  };
}
