export type PointStatus = 'open' | 'done' | 'dropped';

/** Un punto della checklist di un progetto. */
export type Point = {
  id: string;
  text: string;
  status: PointStatus;
  createdAt: number;
};

/** Un'idea registrata: testo originale + versione semplificata. */
export type Idea = {
  id: string;
  /** Trascrizione completa, così come è stata detta. */
  fullText: string;
  /** La stessa idea riscritta in modo semplice. */
  simpleText: string;
  createdAt: number;
};

/** Una cartella = un progetto. */
export type Folder = {
  id: string;
  name: string;
  /** Riassunto semplice di tutto il progetto, aggiornato a ogni nuova idea. */
  summary: string;
  ideas: Idea[];
  points: Point[];
  createdAt: number;
  updatedAt: number;
};
