export type User = { id: string; email: string; name: string };

export type Session = { token: string; user: User };

export type Board = { id: string; title: string; createdAt: string; role?: "owner" | "member" };

export type Card = {
  id: string;
  title: string;
  description: string;
  position: string;
  version: number;
  columnId: string;
  updatedAt: string;
};

export type Column = { id: string; title: string; position: string; boardId: string };

export type ColumnWithCards = Column & { cards: Card[] };

export type BoardDetail = Board & { columns: ColumnWithCards[] };

export type Member = User & { role: "owner" | "member" };

export type Activity = {
  id: string;
  boardId: string;
  event: string;
  entityId: string;
  before: unknown;
  after: unknown;
  createdAt: string;
  actor: { id: string; name: string } | null;
};

export type CardPatch = { title?: string; description?: string; version?: number };

export type CardMove = { columnId: string; beforeId?: string; afterId?: string; version?: number };
