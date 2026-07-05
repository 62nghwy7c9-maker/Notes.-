# Notizen-App mit KI-Organisation & Kreativ-Agent

Eine persönliche Notizen-App, die Wissen nicht nur speichert, sondern aktiv organisiert und weiterdenkt:

- 📁 **Verschachtelte Ordner** – Notizen strukturiert in Ordnern, die sich wiederum in Ordner gliedern
- 🔗 **Verknüpfte Ideen** – Notizen sind mit Beziehungstypen verbunden und als interaktiver Graph erkundbar
- ✦ **Automatische Organisation** – neue Notizen werden per KI sinnvoll einsortiert, getaggt und verknüpft
- 💬 **Kreativ-Agent** – liefert neue Ansätze zu den eigenen Notizen, dient als Sparringspartner im Chat und erstellt anschauliche Diagramme/Mindmaps
- 🎨 **Design** – minimalistisch, organisiert, anschaulich

**Status:** Planungsphase abgeschlossen – die Umsetzung kann direkt starten.

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
