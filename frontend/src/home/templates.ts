import type { IconName } from "../components/ui";

export type BoardTemplate = {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  columns: string[];
};

export const BLANK_TEMPLATE: BoardTemplate = {
  id: "blank",
  name: "Quadro em branco",
  description: "Comece do zero e monte as colunas do seu jeito.",
  icon: "plus-circle",
  columns: [],
};

export const TEMPLATES: BoardTemplate[] = [
  {
    id: "kanban",
    name: "Kanban simples",
    description: "O básico para qualquer time.",
    icon: "layers",
    columns: ["A fazer", "Fazendo", "Feito"],
  },
  {
    id: "sprint",
    name: "Sprint",
    description: "Do backlog à entrega, com revisão.",
    icon: "rocket",
    columns: ["Backlog", "Pronto para começar", "Em andamento", "Em revisão", "Feito"],
  },
  {
    id: "bugs",
    name: "Controle de bugs",
    description: "Acompanhe cada bug até ser verificado.",
    icon: "bug",
    columns: ["Reportado", "Investigando", "Corrigindo", "Verificado"],
  },
  {
    id: "content",
    name: "Calendário de conteúdo",
    description: "Da ideia ao post publicado.",
    icon: "bullhorn",
    columns: ["Ideias", "Escrevendo", "Revisão", "Publicado"],
  },  
];
