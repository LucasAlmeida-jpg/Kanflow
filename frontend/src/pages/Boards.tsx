import { useEffect, useState, type SubmitEvent } from "react";
import { Link } from "react-router";
import { boardsApi, type Board } from "../api";

export function Boards() {
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    boardsApi.list()
      .then(setBoards)
      .catch((err) => setError(err.message));
  }, []);

  async function create(e: SubmitEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError("");
    try {
      const board = await boardsApi.create(title);
      setBoards((list) => [...(list ?? []), board]);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro inesperado");
    }
  }

  return (
    <main className="page">
      <h2>Seus quadros</h2>

      <form className="inline-form" onSubmit={create}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nome do novo quadro"
          aria-label="Nome do novo quadro"
        />
        <button className="primary">Criar quadro</button>
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
              <Link className="board-tile" to={`/boards/${b.id}`}>
                {b.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
