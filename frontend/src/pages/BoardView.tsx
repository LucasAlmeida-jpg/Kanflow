import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { boardsApi, type BoardDetail } from "../api";
import { KanflowCard, KanflowIcon } from "../components/ui";

export function BoardView() {
  const { id } = useParams();
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    boardsApi.get(id!)
      .then(setBoard)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <main className="page">
        <p className="error" role="alert">
          {error}
        </p>
        <Link to="/" className="back-link">
          <KanflowIcon name="arrow-left" />
          Voltar para os quadros
        </Link>
      </main>
    );
  }
  if (!board) return <main className="page muted">Carregando...</main>;

  return (
    <main className="page">
      <h2>{board.title}</h2>
      <div className="columns">
        {board.columns.map((col) => (
          <KanflowCard as="section" key={col.id} variant="muted" padding="sm" className="column" aria-label={col.title}>
            <h3>{col.title}</h3>
            <ul>
              {col.cards.map((card) => (
                <KanflowCard as="li" key={card.id} padding="sm">
                  {card.title}
                </KanflowCard>
              ))}
            </ul>
          </KanflowCard>
        ))}
        {board.columns.length === 0 && <p className="muted">Esse quadro ainda não tem colunas.</p>}
      </div>
    </main>
  );
}
