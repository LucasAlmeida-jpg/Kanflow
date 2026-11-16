import { useEffect, useState } from "react";
import { boardsApi, type Activity, type BoardDetail } from "../../api";
import { describeActivity, timeAgo } from "../../board/activity";
import { KanflowDialog, KanflowEmptyState } from "../ui";

type KanflowActivityPanelProps = {
  open: boolean;
  board: BoardDetail;
  onClose: () => void;
};

export function KanflowActivityPanel({ open, board, onClose }: KanflowActivityPanelProps) {
  const [items, setItems] = useState<Activity[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const timer = setTimeout(() => {
      boardsApi
        .activity(board.id, 50)
        .then((list) => {
          if (!alive) return;
          setItems(list);
          setError("");
        })
        .catch((err) => alive && setError(err instanceof Error ? err.message : "erro inesperado"));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [open, board]);

  const columnName = (id: string | undefined) => {
    const column = board.columns.find((c) => c.id === id);
    return column ? `"${column.title}"` : "uma coluna apagada";
  };

  return (
    <KanflowDialog open={open} title="Atividade" variant="drawer" onClose={onClose}>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {items === null && !error && <p className="muted">Carregando...</p>}
      {items?.length === 0 && (
        <KanflowEmptyState
          compact
          icon="history"
          title="Nada por aqui ainda"
          description="Quando alguém criar, mover ou editar cards, as mudanças aparecem aqui."
        />
      )}
      {items && items.length > 0 && (
        <ol className="activity-list">
          {items.map((a) => (
            <li key={a.id} className="activity-item">
              <p>
                <strong>{a.actor?.name ?? "Alguém"}</strong> {describeActivity(a, columnName)}
              </p>
              <time className="activity-time" dateTime={a.createdAt} title={new Date(a.createdAt).toLocaleString("pt-BR")}>
                {timeAgo(a.createdAt)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </KanflowDialog>
  );
}
