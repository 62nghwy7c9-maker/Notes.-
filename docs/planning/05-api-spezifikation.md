# 05 – API-Spezifikation

Basis-URL: `http://127.0.0.1:3001/api`. Alle Bodies JSON (`Content-Type: application/json`), außer SSE-Streams. Alle Schemas liegen als Zod in `shared/src/api/` – diese Datei ist der menschenlesbare Vertrag dazu.

## Konventionen

- **Fehlerformat:** `{ "error": { "code": "NOT_FOUND", "message": "Notiz nicht gefunden" } }` – Codes: `VALIDATION` (400), `NOT_FOUND` (404), `CONFLICT` (409, z. B. Ordner-Zyklus, Namenskollision), `AI_DISABLED` (409), `AI_UPSTREAM` (502), `INTERNAL` (500).
- **Zeitstempel:** Unix-ms (Number). **IDs:** UUIDv7-Strings.
- Listen sind bei dieser Datenmenge unpaginiert; Suche limitiert serverseitig (max. 50 Treffer).

## Ordner

| Methode & Pfad | Zweck |
|---|---|
| `GET /folders/tree` | Kompletter Ordnerbaum inkl. Notizanzahl (F-05) |
| `POST /folders` | Ordner anlegen |
| `PATCH /folders/:id` | Umbenennen, Icon/Beschreibung, verschieben (`parentId`), umsortieren (`position`) |
| `DELETE /folders/:id?strategy=cascade\|lift` | Löschen; `lift` verschiebt Inhalt in den Elternordner (F-04) |

```jsonc
// GET /folders/tree → 200
{ "tree": [
  { "id": "f1", "parentId": null, "name": "Projekte", "icon": "🚀", "description": null,
    "position": 0, "noteCount": 12, "totalNoteCount": 25,
    "children": [ { "id": "f2", "parentId": "f1", "name": "Garten", "…": "…", "children": [] } ] }
] }

// POST /folders  { "name": "Garten", "parentId": "f1", "icon": "🌱" } → 201 Folder
// PATCH /folders/f2  { "parentId": null }        // an Wurzel verschieben
//   → 409 CONFLICT falls Ziel Nachfahre ist (Zyklus) oder Namenskollision unter Ziel-Parent
```

## Notizen

| Methode & Pfad | Zweck |
|---|---|
| `GET /notes?folderId=…\|inbox&includeDescendants=true` | Notizliste eines Ordners (`inbox` = `folder_id IS NULL`) |
| `GET /notes/:id` | Einzelne Notiz inkl. Tags |
| `POST /notes` | Anlegen (`{ folderId?, title?, content? }`) → 201 |
| `PUT /notes/:id` | Autosave: `{ title, content }` (idempotent, last-write-wins) |
| `PATCH /notes/:id` | Metadaten: `{ folderId?, pinned? }` |
| `DELETE /notes/:id` | In Papierkorb (`deleted_at` setzen) |
| `GET /notes/trash` / `POST /notes/:id/restore` / `DELETE /notes/:id/hard` | Papierkorb (F-12) |
| `POST /notes/:id/organize` | KI-Organisation anstoßen (s. u.) |
| `GET /export` | ZIP aller Notizen als Markdown in Ordnerstruktur (F-16) |

```jsonc
// GET /notes/:id → 200
{ "id": "n1", "folderId": "f2", "title": "Hochbeet-Plan", "content": "# …",
  "summary": "Skizze für ein Hochbeet mit Bewässerung.", "pinned": false,
  "tags": ["garten", "planung"], "organizedAt": 1751700000000,
  "createdAt": 1751690000000, "updatedAt": 1751700000000 }
```

### `POST /notes/:id/organize` (F-30/31/32)

Startet Auto-Einsortierung + Verknüpfungs-/Tag-Vorschläge. Client ruft dies debounced nach Tipp-Ende auf; Server dedupliziert (läuft pro Notiz max. 1× gleichzeitig, überspringt wenn `updated_at ≤ organized_at`).

```jsonc
// → 200
{
  "applied": {                       // nur bei confidence ≥ Schwelle direkt ausgeführt
    "movedToFolderId": "f2", "folderPath": "Projekte/Garten",
    "tags": ["garten", "planung"], "summary": "…"
  },
  "suggestions": [                   // Rest als pending-Vorschläge (ai_suggestions)
    { "id": "s1", "kind": "link", "confidence": 0.72,
      "payload": { "targetNoteId": "n7", "targetTitle": "Bodenqualität",
                   "type": "builds_on", "reason": "Greift die Kompost-Idee auf." } }
  ]
}
// 409 AI_DISABLED wenn KI aus/kein Key; 502 AI_UPSTREAM bei Anbieterfehler
```

## Verknüpfungen

| Methode & Pfad | Zweck |
|---|---|
| `GET /notes/:id/links` | Alle Verknüpfungen der Notiz (beide Richtungen aufgelöst) |
| `POST /links` | `{ sourceId, targetId, type, reason? }` → 201; 409 bei Duplikat (paar-symmetrisch) |
| `PATCH /links/:id` | `{ type?, reason? }` |
| `DELETE /links/:id` | Entfernen |

```jsonc
// GET /notes/n1/links → 200
{ "links": [
  { "id": "l1", "direction": "outgoing", "type": "builds_on", "reason": "…",
    "origin": "ai", "otherNote": { "id": "n7", "title": "Bodenqualität", "summary": "…" } }
] }
```

## Graph

```jsonc
// GET /graph?folderId=…&tag=…  → 200   (Filter optional, F-23)
{ "nodes": [ { "id": "n1", "title": "Hochbeet-Plan", "folderRootId": "f1", "linkCount": 3 } ],
  "edges": [ { "id": "l1", "source": "n1", "target": "n7", "type": "builds_on" } ] }
```

## Suche

```jsonc
// GET /search?q=hochbeet → 200   (FTS5, max. 50)
{ "results": [ { "noteId": "n1", "title": "Hochbeet-Plan",
                 "snippet": "…das <b>Hochbeet</b> im Frühjahr…", "folderPath": "Projekte/Garten" } ] }
```

## KI-Vorschläge (Inbox, F-33/34)

| Methode & Pfad | Zweck |
|---|---|
| `GET /suggestions?status=pending` | Inbox-Liste (neueste zuerst) |
| `POST /suggestions/:id/accept` | Anwenden (verschiebt/verlinkt/taggt je `kind`) → 200 mit Resultat |
| `POST /suggestions/:id/reject` | Ablehnen (bleibt als Negativ-Beispiel gespeichert) |
| `POST /suggestions/accept-all` / `reject-all` | Sammelaktion, optional `?noteId=…` |

## Kreativ-Agent (F-40–F-45)

| Methode & Pfad | Zweck |
|---|---|
| `GET /agent/sessions` | Sessionliste (id, title, updatedAt) |
| `POST /agent/sessions` | `{ context?: {scope: "all"\|"folder"\|"note", id?} }` → 201 |
| `GET /agent/sessions/:id` | Verlauf inkl. Nachrichten |
| `DELETE /agent/sessions/:id` | Session löschen |
| `POST /agent/sessions/:id/messages` | Nutzernachricht senden → **SSE-Stream** |
| `POST /agent/spark` | „Ideen-Funke" (F-42): `{ context }` → erstellt Session mit vordefiniertem Auftrag → SSE-Stream |
| `POST /agent/messages/:id/save-as-note` | Agent-Antwort (oder Diagramm daraus) als Notiz übernehmen (F-44) → 201 `{ noteId }` |

### SSE-Events des Chat-Streams

```
event: text_delta      data: {"text": "Hier sind drei Ansätze…"}
event: tool_activity   data: {"tool": "search_notes", "label": "Durchsucht Notizen nach ‚Kompost'"}
event: diagram         data: {"mermaid": "mindmap\n  root((Garten))\n    …"}
event: note_ref        data: {"noteId": "n7", "title": "Bodenqualität"}   // für klickbare Zitate
event: done            data: {"messageId": "m9", "sessionTitle": "Garten-Ideen"}
event: error           data: {"code": "AI_UPSTREAM", "message": "…"}
```

Der Client rendert `text_delta` fortlaufend, zeigt `tool_activity` als dezente Statuszeile, rendert `diagram` als Mermaid-Block mit „Als Notiz speichern"-Button.

## Einstellungen (F-50)

| Methode & Pfad | Zweck |
|---|---|
| `GET /settings` | Alle Einstellungen (API-Key nur als `apiKeySet: true/false`, nie im Klartext) |
| `PUT /settings` | Teilupdate: `{ aiEnabled?, apiKey?, autoApplyThreshold?, theme?, aiLanguage? }` |
| `GET /settings/usage` | Token-/Kostenschätzung laufender Monat (NF-07) |
| `POST /settings/test-key` | Prüft den API-Key mit Minimal-Request → `{ ok, model }` |
