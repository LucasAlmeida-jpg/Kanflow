import { useEffect, useState, type SubmitEvent } from "react";
import { Link } from "react-router";
import { boardsApi, type Board } from "../api";
import { KanflowButton, KanflowCard, KanflowIcon, KanflowInput } from "../components/ui";

export function Boards() {
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    boardsApi.list()
      .then(setBoards)
      .catch((err) => setError(err.message));
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
      setError(err instanceof Error ? err.message : "erro inesperado");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="page">
      <h2>Seus quadros</h2>

      <form className="inline-form" onSubmit={create}>
        <KanflowInput
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
        <p className="muted">Nenhum quadro ainda. Crie o primeiro acima.</p>
      ) : (
        <ul className="board-grid">
          {boards.map((b) => (
            <li key={b.id}>
              <KanflowCard as={Link} to={`/boards/${b.id}`} variant="muted" padding="lg" interactive className="board-tile">
                {b.title}
              </KanflowCard>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
