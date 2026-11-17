import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { boardsApi, columnsApi, invitationsApi, type Board, type MyInvitation } from "../api";
import { useAuth } from "../auth";
import { KanflowBoardTile } from "../components/board";
import { KanflowAppSidebar, KanflowBoardList, KanflowInvitationList, KanflowTemplateCard } from "../components/home";
import {
  KanflowButton,
  KanflowConfirmDialog,
  KanflowEmptyState,
  KanflowIcon,
  KanflowInput,
  KanflowPromptDialog,
} from "../components/ui";
import { BLANK_TEMPLATE, TEMPLATES, type BoardTemplate } from "../home/templates";
import page from "./pages.module.css";
import styles from "../components/home/home.module.css";

type View = "list" | "grid";

const VIEW_KEY = "kanflow:boards-view";
const message = (err: unknown) => (err instanceof Error ? err.message : "erro inesperado");

function savedView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

const byRecent = (a: Board, b: Board) => (b.lastActivityAt ?? b.createdAt).localeCompare(a.lastActivityAt ?? a.createdAt);

export function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>(savedView);
  const [template, setTemplate] = useState<BoardTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<Board | null>(null);
  const [deleting, setDeleting] = useState<Board | null>(null);
  const [invitations, setInvitations] = useState<MyInvitation[]>([]);
  const [answering, setAnswering] = useState<string | null>(null);

  useEffect(() => {
    boardsApi
      .list()
      .then(setBoards)
      .catch((err) => setError(message(err)));
    invitationsApi.mine().then(setInvitations, () => undefined);
  }, []);

  async function answer(invitation: MyInvitation, accept: boolean) {
    setAnswering(invitation.id);
    setError("");
    try {
      if (accept) {
        const board = await invitationsApi.accept(invitation.id);
        navigate(`/boards/${board.id}`);
        return;
      }
      await invitationsApi.decline(invitation.id);
      setInvitations((list) => list.filter((i) => i.id !== invitation.id));
    } catch (err) {
      setError(`Não foi possível responder ao convite: ${message(err)}.`);
      invitationsApi.mine().then(setInvitations, () => undefined);
    }
    setAnswering(null);
  }

  function changeView(next: View) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      return;
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (boards ?? []).filter((b) => !q || b.title.toLowerCase().includes(q)).sort(byRecent);
  }, [boards, query]);

  async function createFrom(chosen: BoardTemplate, title: string) {
    setTemplate(null);
    setError("");
    setCreating(true);
    try {
      const board = await boardsApi.create(title);
      for (const column of chosen.columns) await columnsApi.create(board.id, column);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(`Não foi possível criar o quadro: ${message(err)}.`);
      setCreating(false);
      boardsApi.list().then(setBoards, () => undefined);
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

  if (!user) return null;
  const firstName = user.name.split(/\s+/)[0];

  return (
    <div className={styles["app-layout"]}>
      <KanflowAppSidebar user={user} onNewBoard={() => setTemplate(BLANK_TEMPLATE)} onLogout={logout} />

      <main className={styles["home"]}>
        <h1 className={styles["home-title"]}>Bem-vindo de volta, {firstName}</h1>

        {invitations.length > 0 && (
          <KanflowInvitationList
            invitations={invitations}
            busyId={answering}
            onAccept={(i) => void answer(i, true)}
            onDecline={(i) => void answer(i, false)}
          />
        )}

        <section className={styles["home-panel"]} aria-labelledby="start-title">
          <header className={styles["home-panel-header"]}>
            <h2 id="start-title">Comece algo novo</h2>
            {creating && (
              <span className={"muted"} role="status">
                Criando quadro...
              </span>
            )}
          </header>
          <ul className={styles["template-row"]}>
            {[BLANK_TEMPLATE, ...TEMPLATES].map((t) => (
              <li key={t.id}>
                <KanflowTemplateCard template={t} disabled={creating} onSelect={setTemplate} />
              </li>
            ))}
          </ul>
        </section>

        <section id="seus-quadros" className={styles["home-boards"]} aria-labelledby="boards-title">
          <header className={styles["home-boards-header"]}>
            <h2 id="boards-title">Seus quadros</h2>
            <div className={styles["home-search-wrap"]}>
              <KanflowInput
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar quadros"
                aria-label="Buscar quadros"
              />
            </div>
            <div className={styles["view-toggle"]} role="group" aria-label="Modo de exibição">
              <KanflowButton variant="ghost" size="sm" aria-label="Lista" aria-pressed={view === "list"} onClick={() => changeView("list")}>
                <KanflowIcon name="list" />
              </KanflowButton>
              <KanflowButton variant="ghost" size="sm" aria-label="Grade" aria-pressed={view === "grid"} onClick={() => changeView("grid")}>
                <KanflowIcon name="layers" />
              </KanflowButton>
            </div>
          </header>

          {error && (
            <p className={"error"} role="alert">
              {error}
            </p>
          )}

          {boards === null ? (
            <p className={"muted"}>Carregando...</p>
          ) : boards.length === 0 ? (
            <KanflowEmptyState
              icon="layers"
              title="Nenhum quadro por aqui"
              description="Escolha um modelo acima ou comece com um quadro em branco."
              action={
                <KanflowButton variant="secondary" onClick={() => setTemplate(BLANK_TEMPLATE)}>
                  <KanflowIcon name="plus-circle" />
                  Criar quadro em branco
                </KanflowButton>
              }
            />
          ) : visible.length === 0 ? (
            <KanflowEmptyState compact icon="magnifier" title="Nenhum quadro encontrado" description={`Nada com "${query.trim()}". Tente outro nome.`} />
          ) : view === "list" ? (
            <KanflowBoardList boards={visible} onRename={setRenaming} onDelete={setDeleting} />
          ) : (
            <ul className={page["board-grid"]}>
              {visible.map((b) => (
                <li key={b.id}>
                  <KanflowBoardTile board={b} onRename={setRenaming} onDelete={setDeleting} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <KanflowPromptDialog
        open={!!template}
        title={template && template.columns.length ? `Modelo ${template.name}` : "Novo quadro"}
        label="Nome do quadro"
        initialValue={template && template.columns.length ? template.name : ""}
        confirmLabel="Criar quadro"
        onConfirm={(title) => template && void createFrom(template, title)}
        onCancel={() => setTemplate(null)}
      />

      <KanflowPromptDialog
        open={!!renaming}
        title="Renomear quadro"
        label="Nome do quadro"
        initialValue={renaming?.title ?? ""}
        requireChange
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
    </div>
  );
}
