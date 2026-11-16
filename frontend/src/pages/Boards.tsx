import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { boardsApi, type Board } from "../api";
import { KanflowBoardTile } from "../components/board";
import {
  KanflowButton,
  KanflowConfirmDialog,
  KanflowEmptyState,
  KanflowIcon,
  KanflowInput,
  KanflowPromptDialog,
} from "../components/ui";

const message = (err: unknown) => (err instanceof Error ? err.message : "erro inesperado");

export function Boards() {
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<Board | null>(null);
  const [deleting, setDeleting] = useState<Board | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    boardsApi
      .list()
      .then(setBoards)
      .catch((err) => setError(message(err)));
  }, []);

  async function create(e: SubmitEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError("");
    setCreating(true);
    try {
      const board = await boardsApi.create(title);
      setBoards((list) => [...(list ?? []), board]);
      setTitle("");
    } catch (err) {
      setError(message(err));
    } finally {
      setCreating(false);
    }
  }

  async function rename(board: Board, nextTitle: string) {
    setRenaming(null);
    setError("");
    setBoards((list) => list?.map((b) => (b.id === board.id ? { ...b, title: nextTitle } : b)) ?? list);
    try {
      await boardsApi.update(board.id, nextTitle);
    } catch (err) {
      setBoards((list) => list?.map((b) => (b.id === board.id ? { ...b, title: board.title } : b)) ?? list);
      setError(`Não foi possível renomear: ${message(err)}.`);
    }
  }

  async function remove(board: Board) {
    setDeleting(null);
    setError("");
    const snapshot = boards;
    setBoards((list) => list?.filter((b) => b.id !== board.id) ?? list);
    try {
      await boardsApi.remove(board.id);
    } catch (err) {
      setBoards(snapshot);
      setError(`Não foi possível apagar: ${message(err)}.`);
    }
  }

  return (
    <main className="page">
      <h2>Seus quadros</h2>

      <form className="inline-form" onSubmit={create}>
        <KanflowInput
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nome do novo quadro"
          aria-label="Nome do novo quadro"
          maxLength={200}
        />
        <KanflowButton type="submit" variant="primary" loading={creating}>
          {!creating && <KanflowIcon name="plus-circle" />}
          Criar quadro
        </KanflowButton>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {boards === null ? (
        <p className="muted">Carregando...</p>
      ) : boards.length === 0 ? (
        <KanflowEmptyState
          icon="layers"
          title="Nenhum quadro por aqui"
          description="Um quadro reúne as colunas e os cards de um projeto. Dê um nome ao primeiro para começar."
          action={
            <KanflowButton variant="secondary" onClick={() => titleRef.current?.focus()}>
              <KanflowIcon name="plus-circle" />
              Criar meu primeiro quadro
            </KanflowButton>
          }
        />
      ) : (
        <ul className="board-grid">
          {boards.map((b) => (
            <li key={b.id}>
              <KanflowBoardTile board={b} onRename={setRenaming} onDelete={setDeleting} />
            </li>
          ))}
        </ul>
      )}

      <KanflowPromptDialog
        open={!!renaming}
        title="Renomear quadro"
        label="Nome do quadro"
        initialValue={renaming?.title ?? ""}
        confirmLabel="Salvar"
        onConfirm={(next) => renaming && void rename(renaming, next)}
        onCancel={() => setRenaming(null)}
      />

      <KanflowConfirmDialog
        open={!!deleting}
        title="Apagar quadro?"
        description={
          deleting
            ? `O quadro "${deleting.title}" será apagado com todas as colunas, cards e o histórico. Os outros membros também perdem o acesso.`
            : undefined
        }
        confirmLabel="Apagar quadro"
        onConfirm={() => deleting && void remove(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </main>
  );
}
