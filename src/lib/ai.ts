import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

import type { Folder } from './types';

export const MODEL = 'claude-opus-5-5';

const ClassificationSchema = z.object({
  decision: z.enum(['existing', 'new']),
  /** id della cartella esistente se decision = "existing", altrimenti stringa vuota. */
  folder_id: z.string(),
  /** Nome per la nuova cartella se decision = "new", altrimenti stringa vuota. */
  new_folder_name: z.string(),
  /** L'idea riscritta in modo semplice e breve. */
  idea_simple: z.string(),
  /** Nuovi punti da aggiungere alla checklist del progetto. */
  new_points: z.array(z.string()),
  /** Riassunto aggiornato e semplice dell'intero progetto. */
  folder_summary: z.string(),
});

export type Classification = z.infer<typeof ClassificationSchema>;

const SYSTEM = `Sei l'assistente di un'app dove l'utente registra a voce le sue idee, di qualsiasi tipo.
Ricevi la trascrizione di un'idea appena detta e l'elenco delle cartelle (progetti) già esistenti.

Il tuo compito:
1. Decidi se l'idea riguarda un progetto già esistente ("existing", indica folder_id esatto) oppure è un'idea nuova e separata ("new").
   Scegli "existing" solo se l'argomento è chiaramente lo stesso progetto (es. un'idea sugli Egizi va nella cartella "Storia degli Egizi").
   Nel dubbio, se l'argomento è diverso, crea una nuova cartella.
2. Se è nuova, inventa un nome breve e chiaro per la cartella (2-5 parole, iniziale maiuscola, es. "Storia degli Egizi").
3. Riscrivi l'idea in idea_simple: un discorso semplice e chiaro, in poche frasi, che basti a ricordarsi di cosa si tratta. Togli ripetizioni ed esitazioni del parlato.
4. In new_points estrai le singole idee o cose da fare come punti brevi (una riga ciascuno). Non ripetere punti già presenti nella cartella.
5. In folder_summary scrivi un riassunto semplice e aggiornato dell'intero progetto (3-5 frasi al massimo), includendo le idee precedenti e quella nuova.

Scrivi sempre nella stessa lingua dell'utente (di norma italiano). La trascrizione può contenere errori di riconoscimento vocale: interpretala con buon senso.`;

function describeFolders(folders: Folder[]): string {
  if (folders.length === 0) return 'Nessuna cartella esistente.';
  return folders
    .map((f) => {
      const open = f.points.filter((p) => p.status === 'open').map((p) => `  - ${p.text}`);
      return [
        `id: ${f.id}`,
        `nome: ${f.name}`,
        `riassunto: ${f.summary || '(vuoto)'}`,
        open.length ? `punti aperti:\n${open.join('\n')}` : 'punti aperti: nessuno',
      ].join('\n');
    })
    .join('\n\n');
}

export async function classifyIdea(
  apiKey: string,
  transcript: string,
  folders: Folder[],
): Promise<Classification> {
  // L'app è personale: la chiave è dell'utente e resta sul telefono (SecureStore).
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(ClassificationSchema) },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `CARTELLE ESISTENTI:\n${describeFolders(folders)}\n\nNUOVA IDEA (trascrizione):\n${transcript}`,
      },
    ],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error("L'AI non ha potuto elaborare questa idea. Prova a riformularla.");
  }
  const result = response.parsed_output;
  if (!result) throw new Error("Risposta dell'AI non valida. Riprova.");

  // Se l'AI indica una cartella che non esiste, la trattiamo come nuova.
  if (result.decision === 'existing' && !folders.some((f) => f.id === result.folder_id)) {
    return { ...result, decision: 'new', new_folder_name: result.new_folder_name || 'Nuova idea' };
  }
  return result;
}

export function describeError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'Chiave API non valida. Controllala nelle impostazioni.';
  if (e instanceof Anthropic.RateLimitError) return 'Troppe richieste, riprova tra poco.';
  if (e instanceof Anthropic.APIConnectionError) return 'Nessuna connessione. Controlla internet e riprova.';
  if (e instanceof Anthropic.APIError) return `Errore dal servizio AI (${e.status ?? '?'}). Riprova.`;
  if (e instanceof Error) return e.message;
  return 'Errore sconosciuto.';
}
