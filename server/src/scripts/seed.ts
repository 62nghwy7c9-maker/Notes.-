/**
 * Seed-Skript für den Performance-Check (M2): legt 1 000 Notizen in einer
 * kleinen Ordnerstruktur an und verknüpft sie zufällig (~1 500 Kanten).
 *
 * Aufruf:  npx tsx server/src/scripts/seed.ts   (nutzt DATA_DIR aus .env)
 */
import { openDatabase } from '../db/client.js';
import { loadEnv } from '../env.js';
import { createFolder } from '../services/folderService.js';
import { createNote } from '../services/noteService.js';
import { createLink } from '../services/linkService.js';
import { ServiceError } from '../lib/errors.js';

const THEMEN = ['Garten', 'Küche', 'Lernen', 'Arbeit', 'Reisen', 'Musik', 'Sport', 'Lesen'];
const WOERTER =
  'Idee Plan Skizze Ansatz Frage Beobachtung Experiment Notiz Gedanke Konzept Entwurf Zusammenhang Muster Beispiel Gegenthese'.split(' ');

const env = loadEnv();
const { db } = openDatabase(env.DATA_DIR);

const noteCount = Number(process.argv[2] ?? 1000);
const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(arr: T[]): T => arr[rand(arr.length)]!;

console.time('seed');

// Nur in Seed-Ordner schreiben (macht das Aufräumen trivial: Ordner löschen).
const folderIds: string[] = [];
for (const thema of THEMEN) {
  const root = createFolder(db, { name: `Seed ${thema}` });
  folderIds.push(root.id);
  for (let i = 1; i <= 2; i++) {
    folderIds.push(createFolder(db, { name: `${thema} ${i}`, parentId: root.id }).id);
  }
}

const noteIds: string[] = [];
for (let i = 0; i < noteCount; i++) {
  const note = createNote(db, {
    folderId: pick(folderIds),
    title: `${pick(WOERTER)} ${i}`,
    content: `# ${pick(WOERTER)}\n\n${pick(WOERTER)} ${pick(WOERTER)} ${pick(WOERTER)}.`,
  });
  noteIds.push(note.id);
}

let edges = 0;
const types = ['related', 'builds_on', 'contradicts', 'reference', 'part_of'] as const;
for (let i = 0; i < noteCount * 1.5; i++) {
  try {
    createLink(db, {
      sourceId: pick(noteIds),
      targetId: pick(noteIds),
      type: pick([...types]),
    });
    edges++;
  } catch (err) {
    if (!(err instanceof ServiceError)) throw err; // Duplikat/Selbstlink überspringen
  }
}

console.timeEnd('seed');
console.log(`Seed fertig: ${noteCount} Notizen, ${edges} Verknüpfungen.`);
