import { Link } from "react-router";
import type { Board } from "../../api";
import { timeAgo } from "../../board/activity";
import { KanflowButton, KanflowIcon } from "../ui";

type KanflowBoardListProps = {
  boards: Board[];
  onRename: (board: Board) => void;
  onDelete: (board: Board) => void;
};

export function KanflowBoardList({ boards, onRename, onDelete }: KanflowBoardListProps) {
  return (
    <div className="board-table-wrap">
      <table className="board-table">
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Membros</th>
            <th scope="col">Última atividade</th>
            <th scope="col">Dono</th>
            <th scope="col">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {boards.map((board) => {
            const when = board.lastActivityAt ?? board.createdAt;
            return (
              <tr key={board.id}>
                <td>
                  <span className="board-table-name">
                    <span className="board-table-icon" aria-hidden="true">
                      <KanflowIcon name="layers" />
                    </span>
                    <Link to={`/boards/${board.id}`} className="board-table-link">
                      {board.title}
                    </Link>
                    {board.role === "member" && <span className="board-tile-badge">Membro</span>}
                  </span>
                </td>
                <td className="board-table-muted">{board.memberCount ?? 1}</td>
                <td className="board-table-muted">
                  <time dateTime={when} title={new Date(when).toLocaleString("pt-BR")}>
                    {timeAgo(when)}
                  </time>
                </td>
                <td className="board-table-muted">{board.role === "owner" ? "Você" : (board.owner ?? "—")}</td>
                <td>
                  <span className="board-table-actions">
                    <KanflowButton variant="ghost" size="sm" aria-label={`Renomear quadro ${board.title}`} onClick={() => onRename(board)}>
                      <KanflowIcon name="pencil" />
                    </KanflowButton>
                    {board.role === "owner" && (
                      <KanflowButton
                        variant="ghost"
                        size="sm"
                        className="board-table-delete"
                        aria-label={`Apagar quadro ${board.title}`}
                        onClick={() => onDelete(board)}
                      >
                        <KanflowIcon name="trash" />
                      </KanflowButton>
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
