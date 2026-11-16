import { request } from "./client";
import type {
  Activity,
  Board,
  BoardDetail,
  Card,
  CardMove,
  CardPatch,
  Column,
  Member,
  Session,
  User,
} from "./types";

export const authApi = {
  register: (name: string, email: string, password: string) =>
    request<Session>("POST", "/auth/register", { name, email, password }),
  login: (email: string, password: string) => request<Session>("POST", "/auth/login", { email, password }),
  logout: () => request<void>("POST", "/auth/logout"),
  me: () => request<User>("GET", "/me"),
};

export const boardsApi = {
  list: () => request<Board[]>("GET", "/boards"),
  get: (id: string) => request<BoardDetail>("GET", `/boards/${id}`),
  create: (title: string) => request<Board>("POST", "/boards", { title }),
  update: (id: string, title: string) => request<Board>("PATCH", `/boards/${id}`, { title }),
  remove: (id: string) => request<void>("DELETE", `/boards/${id}`),
  activity: (id: string, limit = 50) => request<Activity[]>("GET", `/boards/${id}/activity?limit=${limit}`),
  members: (id: string) => request<Member[]>("GET", `/boards/${id}/members`),
  addMember: (id: string, email: string) => request<Member>("POST", `/boards/${id}/members`, { email }),
};

export const columnsApi = {
  create: (boardId: string, title: string) => request<Column>("POST", `/boards/${boardId}/columns`, { title }),
  remove: (id: string) => request<void>("DELETE", `/columns/${id}`),
};

export const cardsApi = {
  create: (columnId: string, title: string, description?: string) =>
    request<Card>("POST", `/columns/${columnId}/cards`, { title, description }),
  update: (id: string, patch: CardPatch) => request<Card>("PATCH", `/cards/${id}`, patch),
  move: (id: string, move: CardMove) => request<Card>("POST", `/cards/${id}/move`, move),
  remove: (id: string) => request<void>("DELETE", `/cards/${id}`),
};
