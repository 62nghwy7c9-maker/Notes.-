# 08 – Projektstruktur & Konventionen

## Monorepo-Layout (npm workspaces)

```
notes-app/
├── package.json               # workspaces: client, server, shared; Root-Skripte
├── tsconfig.base.json         # strict: true, geteilte Compiler-Optionen
├── .env.example               # dokumentierte Env-Variablen (s. u.)
├── .gitignore                 # node_modules, dist, data/, .env
├── docs/planning/             # diese Planungsdokumente
│
├── shared/                    # @notes/shared – Typen & Zod-Schemas
│   └── src/
│       ├── entities/          # Folder, Note, Link, Tag, Suggestion, ChatSession/Message (Zod + Typen)
│       ├── api/               # Request/Response-Schemas je Endpunkt (Vertrag aus 05)
│       └── index.ts
│
├── server/                    # @notes/server
│   ├── drizzle.config.ts
│   └── src/
│       ├── index.ts           # Bootstrap: Env laden, DB + Migrationen, Hono-App, serve client/dist
│       ├── routes/            # folders.ts notes.ts links.ts graph.ts search.ts
│       │                      # suggestions.ts agent.ts settings.ts export.ts
│       ├── services/          # folderService.ts noteService.ts linkService.ts searchService.ts
│       │                      # suggestionService.ts exportService.ts settingsService.ts
│       ├── ai/
│       │   ├── provider.ts    # einzige Datei mit @anthropic-ai/sdk; complete() / streamWithTools()
│       │   ├── organizer.ts   # F-30/32
│       │   ├── linker.ts      # F-31
│       │   ├── agent.ts       # F-40–F-46 (Tool-Loop, SSE)
│       │   ├── tools.ts       # Agent-Tool-Definitionen + Ausführung (ruft Services)
│       │   └── prompts/       # organizer.ts linker.ts agent.ts spark.ts (deutsche Vorlagen)
│       └── db/
│           ├── schema.ts      # Drizzle-Schema (aus 04-datenmodell.md)
│           ├── client.ts      # better-sqlite3-Instanz (WAL), Backup-vor-Migration
│           └── migrations/
│
└── client/                    # @notes/client
    ├── vite.config.ts         # Proxy /api → 127.0.0.1:3001; PWA-Plugin (M5)
    └── src/
        ├── main.tsx  app/     # Router, AppLayout (3 Spalten + Agent), ThemeProvider
        ├── features/          # folders/ notes/ links/ graph/ agent/ suggestions/ search/ settings/
        │                      # je Feature: components/ hooks/ api.ts (TanStack-Query-Hooks)
        └── shared/
            ├── api/http.ts    # fetch-Wrapper: Zod-Parse der Antworten, Fehler-Normalisierung
            ├── ui/            # Button, Input, Popover, Dialog, Snackbar, Tooltip, Chip … (eigene, schlanke Basis)
            ├── hooks/         # useShortcut, useDebouncedCallback, useSse
            └── styles/        # Tailwind-Setup, CSS-Variablen des Design-Systems (aus 07)
```

## Env-Variablen (`.env` im Root, nur vom Server gelesen)

| Variable | Default | Zweck |
|---|---|---|
| `PORT` | `3001` | Server-Port (bindet an 127.0.0.1) |
| `DATA_DIR` | `./data` | Ablage von `notes.db` + Backups |
| `ANTHROPIC_API_KEY` | – | optional; alternativ Eingabe in den Einstellungen (verschlüsselt in DB) |
| `SETTINGS_SECRET` | generiert beim Erststart | AES-Schlüssel für den in der DB gespeicherten API-Key |
| `AI_MODEL_DEFAULT` | `claude-sonnet-5` | Standardmodell (siehe 06) |

## Root-Skripte

```jsonc
{
  "dev":        "concurrently \"npm:dev -w server\" \"npm:dev -w client\"",
  "build":      "npm run build -w shared -w server -w client",
  "start":      "node server/dist/index.js",       // serviert auch client/dist
  "db:generate":"drizzle-kit generate -w server",  // Migration aus Schemaänderung
  "test":       "vitest run -w server -w client",
  "lint":       "eslint . && tsc -b"
}
```

## Konventionen

- **TypeScript strikt** überall; keine `any` außer begründet mit Kommentar (NF-06).
- **Datenfluss:** Route (Zod-Validierung) → Service (Logik + DB) → Antwort mit shared-Typ. KI-Module rufen Services, nie die DB.
- **Client-Server-Vertrag:** Jede Route parst Request **und** Response gegen die Schemas aus `shared/src/api/` – Vertragsbruch fällt im Test sofort auf.
- **Benennung:** Dateien camelCase (`noteService.ts`), Komponenten PascalCase (`NoteEditor.tsx`), DB snake_case (Drizzle mappt auf camelCase).
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:` …), Deutsch oder Englisch konsistent pro Repo (Empfehlung: Englisch).
- **Fehlertexte für Nutzer:** immer Deutsch, immer mit Handlungsoption.

## Setup-Anleitung (für den Umsetzungsstart, M0)

```bash
# Voraussetzungen: Node.js ≥ 22, npm ≥ 10
git clone <repo> && cd notes-app
cp .env.example .env            # optional ANTHROPIC_API_KEY eintragen
npm install
npm run dev                     # Client: http://localhost:5173 → proxied auf Server :3001
```

Erststart legt `data/notes.db` an und führt Migrationen aus; ohne API-Key startet die App im rein manuellen Modus (F-35).

## Teststrategie (Details je Phase in 09-roadmap.md)

| Ebene | Werkzeug | Fokus |
|---|---|---|
| Unit (Server) | Vitest | Services gegen In-Memory-SQLite (`:memory:` + Migrationen): Ordner-Zyklen, Papierkorb, Duplikat-Links, Vorschlags-Statuswechsel |
| Unit (KI) | Vitest | `organizer`/`linker`/`agent` mit gemocktem `provider.ts` (fixe JSON-Antworten): Schwellenlogik, Negativlisten, Tool-Loop-Grenzen |
| API/Integration | Vitest + Hono-Testclient | Alle Endpunkte gegen die Zod-Verträge aus `shared/` |
| E2E | Playwright | Kernflüsse: Notiz anlegen → Vorschlag annehmen; Graph öffnen; Agent-Chat mit gemocktem SSE |
| Manuell je Milestone | Checkliste | „Definition of Done" in 09-roadmap.md |
