# Notizen-App mit KI-Organisation & Kreativ-Agent

Eine persönliche Notizen-App, die Wissen nicht nur speichert, sondern aktiv organisiert und weiterdenkt:

- 📁 **Verschachtelte Ordner** – Notizen strukturiert in Ordnern, die sich wiederum in Ordner gliedern
- 🔗 **Verknüpfte Ideen** – Notizen sind mit Beziehungstypen verbunden und als interaktiver Graph erkundbar
- ✦ **Automatische Organisation** – neue Notizen werden per KI sinnvoll einsortiert, getaggt und verknüpft
- 💬 **Kreativ-Agent** – liefert neue Ansätze zu den eigenen Notizen, dient als Sparringspartner im Chat und erstellt anschauliche Diagramme/Mindmaps
- 🎨 **Design** – minimalistisch, organisiert, anschaulich

**Status:** **M2 (Verknüpfungen & Ideen-Graph) fertig** – Notizen lassen sich mit Beziehungstypen verknüpfen („Verbunden"-Bereich, `[[Wiki-Links]]` mit Autocomplete und Umbenennungs-Sync) und im interaktiven Ideen-Graph erkunden (Canvas + D3-force im Web Worker, Zoom/Pan, Vorschau, Ordner-/Tag-Filter, „Nur Umfeld"; getestet mit 1 000 Notizen). Als Nächstes M3 (KI-Organisation).

## App nutzen (lokal)

```bash
# Einmalig: Node.js ≥ 22 installieren (https://nodejs.org), dann:
git clone https://github.com/62nghwy7c9-maker/Notes.-.git && cd Notes.-
npm install
npm run build

# Danach zum Starten immer nur:
npm start              # → App im Browser öffnen: http://localhost:3001
```

Alle Notizen liegen lokal in `data/notes.db` (wird beim ersten Start angelegt, Migrationen laufen automatisch, vor Migrationen wird ein Backup erstellt). Die App bindet nur an `127.0.0.1` – nichts verlässt deinen Rechner.

## Entwicklung

```bash
cp .env.example .env   # optional ANTHROPIC_API_KEY eintragen
npm run dev            # Client: http://localhost:5173 → /api proxied auf Server :3001

npm run lint           # ESLint + tsc -b
npm test               # Vitest (Server + Client)
npx tsx server/src/scripts/seed.ts 1000   # Testdaten für den Graph-Performance-Check
```

Ohne API-Key läuft die App im rein manuellen Modus (KI-Features ab M3 sind dann ausgeblendet).

## Planungsdokumente

Die vollständige Planung liegt in [`docs/planning/`](docs/planning/) und ist so detailliert, dass anschließend nur noch gecodet werden muss:

| Dokument | Inhalt |
|---|---|
| [01 – Vision und Scope](docs/planning/01-vision-und-scope.md) | Vision, Zielnutzer, Scope/Nicht-Ziele, Grundsatzentscheidungen mit Alternativen |
| [02 – Anforderungen](docs/planning/02-anforderungen.md) | Funktionale Anforderungen (F-xx), User Stories mit Akzeptanzkriterien, nicht-funktionale Anforderungen |
| [03 – Architektur](docs/planning/03-architektur.md) | Systemarchitektur, Tech-Stack mit Begründung, Datenflüsse, Fehlerverhalten |
| [04 – Datenmodell](docs/planning/04-datenmodell.md) | Vollständiges SQLite-Schema (DDL), ER-Diagramm, Invarianten, Migrationsstrategie |
| [05 – API-Spezifikation](docs/planning/05-api-spezifikation.md) | Alle REST-Endpunkte mit Beispielen, SSE-Events des Agenten-Chats |
| [06 – KI-Features](docs/planning/06-ki-features.md) | Auto-Einsortierung, Verknüpfungsvorschläge, Kreativ-Agent: Prompts, Tools, Kosten |
| [07 – UI/UX-Design](docs/planning/07-ui-ux-design.md) | Design-System (Farben, Typografie), Wireframes aller Screens, Shortcuts |
| [08 – Projektstruktur](docs/planning/08-projektstruktur.md) | Monorepo-Layout, Konventionen, Env-Variablen, Setup, Teststrategie |
| [09 – Roadmap](docs/planning/09-roadmap.md) | Umsetzungsphasen M0–M5 mit abhakbaren Tasks, Definition of Done, Risiken |

## Kurzüberblick der Technik

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, TipTap-Editor, D3-force-Graph, Mermaid
- **Backend:** Node.js + Hono, SQLite (better-sqlite3) + Drizzle ORM, FTS5-Volltextsuche
- **KI:** Anthropic Claude API (gekapselt hinter einer austauschbaren Provider-Schicht); ohne API-Key läuft die App als vollwertige manuelle Notizen-App
- **Betrieb:** lokal, Single-User, alle Daten in einer SQLite-Datei

Der empfohlene Einstieg in die Umsetzung ist [09 – Roadmap](docs/planning/09-roadmap.md), Phase M0.
