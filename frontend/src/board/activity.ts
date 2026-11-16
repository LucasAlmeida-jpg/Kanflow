import type { Activity } from "../api";

type Snapshot = { title?: string; columnId?: string; description?: string } | null;

const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

export function timeAgo(iso: string, now = Date.now()) {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "agora";
}

export function describeActivity(activity: Activity, columnName: (id: string | undefined) => string) {
  const before = activity.before as Snapshot;
  const after = activity.after as Snapshot;
  switch (activity.event) {
    case "card:created":
      return `criou o card "${after?.title}" em ${columnName(after?.columnId)}`;
    case "card:updated":
      if (before?.title !== after?.title) return `renomeou o card "${before?.title}" para "${after?.title}"`;
      return `editou a descrição do card "${after?.title}"`;
    case "card:moved":
      if (before?.columnId !== after?.columnId) return `moveu o card "${after?.title}" para ${columnName(after?.columnId)}`;
      return `reordenou o card "${after?.title}" em ${columnName(after?.columnId)}`;
    case "card:deleted":
      return `apagou o card "${before?.title}"`;
    case "column:created":
      return `criou a coluna "${after?.title}"`;
    case "column:deleted":
      return `apagou a coluna "${before?.title}"`;
    default:
      return activity.event;
  }
}
