import { Link } from "react-router";
import type { Board } from "../../api";
import { KanflowButton, KanflowCard, KanflowIcon } from "../ui";

type KanflowBoardTileProps = {
  board: Board;
  onRename: (board: Board) => void;
  onDelete: (board: Board) => void;
};

export function KanflowBoardTile({ board, onRename, onDelete }: KanflowBoardTileProps) {
  return (
    <KanflowCard variant="muted" padding="none" className="board-tile">
      <Link to={`/boards/${board.id}`} className="board-tile-link">
        {board.title}
      </Link>
      {board.role === "member" && <span className="board-tile-badge">Membro</span>}
      <span className="board-tile-actions">
        <KanflowButton variant="ghost" size="sm" className="board-tile-action" aria-label={`Renomear quadro ${board.title}`} onClick={() => onRename(board)}>
          <KanflowIcon name="pencil" />
        </KanflowButton>
        {board.role === "owner" && (
          <KanflowButton
            variant="ghost"
            size="sm"
            className="board-tile-action board-tile-delete"
            aria-label={`Apagar quadro ${board.title}`}
            onClick={() => onDelete(board)}
          >
            <KanflowIcon name="trash" />
          </KanflowButton>
        )}
      </span>
    </KanflowCard>
  );
}
