# 09 – Roadmap

Sechs Phasen M0–M5. Jede Phase endet mit einem benutzbaren Zwischenstand („Definition of Done"), sodass jederzeit ein sinnvoller Stand existiert. Aufwände sind grobe Richtwerte für eine Person mit KI-Unterstützung beim Coden.

## M0 – Fundament (≈ 0,5–1 Tag)

- [x] Monorepo gemäß [08-projektstruktur.md](08-projektstruktur.md) aufsetzen (workspaces, tsconfig, ESLint, Vitest, `.env.example`, `.gitignore`)
- [x] `shared/`: Entitäts- und API-Schemas (Zod) aus [04](04-datenmodell.md)/[05](05-api-spezifikation.md) anlegen
- [x] `server/`: Hono-Bootstrap, Drizzle-Schema + Migration 0001 inkl. FTS5-Triggern, Health-Endpunkt `GET /api/health`
- [x] `client/`: Vite + Tailwind + Design-Tokens aus [07](07-ui-ux-design.md) (CSS-Variablen, Theme-Umschaltung), leeres 3-Spalten-Layout
- [x] CI-Skript lokal: `npm run lint && npm test` grün

**DoD:** `npm run dev` startet Client + Server; Health-Check ok; Theme umschaltbar.

## M1 – Notizen & Ordner (≈ 2–3 Tage)

- [x] `folderService` + Routen: CRUD, Baum, Verschieben mit Zyklen-Check, Löschen mit `cascade|lift` (F-01–F-04)
- [x] Sidebar: Ordnerbaum mit Drag & Drop, Kontextmenü, Icons, „Eingang" (F-02/03/06)
- [x] `noteService` + Routen: CRUD, Autosave (`PUT`), Papierkorb inkl. Aufräum-Job (F-10/12)
- [x] Notizliste (Karten, Sortierung, Kontextmenü) + TipTap-Editor mit Markdown-Live-Rendering, Autosave-Hook, Speicherstatus (F-10/11)
- [x] FTS5-Suche + Command-Palette `Ctrl/Cmd+K` (F-13, Teil von F-51)
- [x] Export als Markdown-ZIP (F-16)
- [x] Tests: folder-/noteService-Units (Zyklen, Papierkorb), API-Vertragstests

**DoD:** Vollwertige manuelle Notizen-App – Ordner beliebig verschachtelbar, Editor angenehm, Suche findet Inhalte, Papierkorb funktioniert.

## M2 – Verknüpfungen & Ideen-Graph (≈ 2–3 Tage)

- [x] `linkService` + Routen: CRUD mit paar-symmetrischem Duplikat-Check, Beziehungstypen (F-20)
- [x] Editor: Bereich „Verbunden (n)", Dialog „+ Verknüpfung" (Notiz-Suche + Typwahl + Begründung) (F-21/24)
- [x] `[[Wiki-Link]]`-Autocomplete im Editor, erzeugt `origin='wikilink'`-Links, hält sie bei Umbenennung synchron (F-14)
- [x] `GET /graph` + Graph-Ansicht: D3-force im Web Worker, Canvas-Rendering, Farb-/Größen-Kodierung, Kantenstile (F-22)
- [x] Graph-Interaktion: Zoom/Pan, Hover-Karte, Klick-Vorschau, Doppelklick öffnen, Filter Ordner/Tag, „Nur Umfeld"-Modus (F-23)
- [x] Tests: linkService-Units, Graph-Payload-Vertrag; manueller Performance-Check mit 1 000 Seed-Notizen (Skript)

**DoD:** Ideennetz manuell pflegbar und im Graph flüssig erkundbar (Erfolgskriterium 4).

## M3 – KI-Organisation (≈ 3–4 Tage)

- [ ] `ai/provider.ts`: Anthropic-Anbindung, `complete()` mit Tool-erzwungener JSON-Ausgabe, Retry/Backoff, Token-Logging (NF-07)
- [ ] Einstellungen: API-Key (AES-verschlüsselt), KI an/aus, Schwellen-Slider, Key-Test, Nutzungsanzeige (F-35/50)
- [ ] `organizer.ts`: Ordnerwahl + Tags + Summary gemäß [06](06-ki-features.md); Schwellenlogik auto-apply/pending; Undo-Snackbar (F-30/32)
- [ ] `linker.ts`: Kandidaten-Heuristik (FTS + Tags + Ordner) + Bewertungs-Aufruf; max. 5 Vorschläge (F-31)
- [ ] `suggestionService` + Inbox-UI + Inline-Vorschlagskarten; Ablehnungsgedächtnis als Negativliste (F-33/34)
- [ ] `POST /notes/:id/organize` mit Debounce-Trigger im Client, Dedupe serverseitig
- [ ] Tests: Schwellen-/Negativlisten-Logik mit gemocktem Provider; `AI_DISABLED`-Degradation (NF-03)

**DoD:** Erfolgskriterien 1 + 2 erfüllt – neue Notizen sortieren sich (quasi) selbst ein, Verknüpfungsvorschläge sind mit einem Klick bestätigt/verworfen; ohne Key bleibt alles voll nutzbar.

## M4 – Kreativ-Agent (≈ 3–4 Tage)

- [ ] `ai/tools.ts` + `agent.ts`: Tool-Definitionen (search/read/list/tree/links/create_diagram), Tool-Loop (max. 8 Runden), Kontextbudget, Verlaufs-Kompaktierung
- [ ] SSE-Streaming Ende-zu-Ende (`useSse`-Hook, Events aus [05](05-api-spezifikation.md)); Stopp-Funktion
- [ ] Session-Verwaltung: anlegen/listen/laden/löschen, KI-generierte Titel (F-40)
- [ ] Agent-Panel-UI: Nachrichten, `[[Titel|noteId]]`-Chips, Tool-Statuszeilen, Kontext-Chip (F-41/45)
- [ ] Mermaid-Rendering im Chat (strict, lazy) + serverseitige Syntax-Validierung in `create_diagram` (F-43)
- [ ] „Als Notiz speichern" für Antworten/Diagramme → läuft durch `organize` (F-44)
- [ ] „Ideen-Funke"-Button + Spark-Prompts je Scope (F-42); optional „Wochen-Impuls" (F-46)
- [ ] Tests: Tool-Loop mit gemocktem Provider (Runden-Limit, Tool-Fehler), SSE-Integrationstest, E2E-Chatfluss mit Mock

**DoD:** Erfolgskriterium 3 erfüllt – Austausch mit dem Agenten über eigene Notizen inkl. klickbarer Zitate und speicherbarer Diagramme.

## M5 – Politur & PWA (≈ 1–2 Tage)

- [ ] Alle Shortcuts aus [07](07-ui-ux-design.md) + Shortcut-Referenz in den Einstellungen (F-51)
- [ ] Leere Zustände, Ladezustände, Fehlerzustände systematisch durchgehen (NF-03/05)
- [ ] Responsive-Verhalten < 1 100 px / < 800 px; PWA-Manifest + Service Worker (Read-only offline) (F-52)
- [ ] A11y-Pass: Tastaturnavigation komplett, Fokus-Ringe, Kontraste (NF-05)
- [ ] Performance-Pass: Editor-Tipplatenz, Graph mit 1 000 Notizen, Suchlatenz (NF-01)
- [x] `npm run build && npm start` als Ein-Prozess-Deployment verifizieren; README des Repos mit Nutzungsanleitung finalisieren *(vorgezogen: lokale Nutzung statt Cloud-Deployment)*

**DoD:** Alle Erfolgskriterien aus [01](01-vision-und-scope.md) erfüllt; Lint + Tests grün; App per `npm start` produktiv nutzbar.

## Post-MVP-Ideen (bewusst unpriorisiert)

- Embedding-Index für bessere Verknüpfungs-Kandidaten (Stufe 2 aus [06](06-ki-features.md))
- KI-Bildgenerierung als Agent-Tool (`attachments`-Tabelle)
- Tauri-Wrapper für echte Desktop-App (E1-Alternative)
- Automatischer wöchentlicher „Wochen-Impuls" per Zeitplan
- Import bestehender Markdown-Sammlungen (Obsidian-Vault)

## Risiken & Gegenmaßnahmen

| Risiko | Auswirkung | Gegenmaßnahme |
|---|---|---|
| KI-Einsortierung trifft Geschmack nicht | Vertrauensverlust ins Kernfeature | Schwelle konservativ (0,85), alles undo-bar, Ablehnungsgedächtnis (F-34), Ordner-`description` als Steuerhebel |
| Graph-Performance bei vielen Notizen | Ruckeln, Feature wird gemieden | Canvas statt SVG, Layout im Worker, Seed-Test mit 1 000 Notizen bereits in M2 |
| Mermaid-Ausgaben des Agenten fehlerhaft | kaputte Diagramme im Chat | serverseitige Validierung in `create_diagram` mit einem Korrekturversuch (06) |
| API-Kosten laufen unbemerkt | Überraschung auf der Rechnung | Token-Logging + Monatsanzeige (NF-07), Kontextbudgets (06) |
| TipTap-Markdown-Feinheiten (Tabellen, Mermaid-Blöcke) | Editor-Frust | früh in M1 mit realen Notizen testen; Mermaid-Block als eigene Node-Extension |
