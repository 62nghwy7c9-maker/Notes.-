# 06 – KI-Features

Alle KI-Funktionen laufen serverseitig in `server/src/ai/`. Anbieter: Anthropic Claude API über `@anthropic-ai/sdk`, gekapselt in `provider.ts` (Austausch = eine Datei). Prompts liegen als Konstanten in `ai/prompts/` – auf Deutsch, da die Ausgaben deutsch sein sollen (Einstellung `ai_language`).

## Modellwahl

| Aufgabe | Modell | Begründung |
|---|---|---|
| Auto-Einsortierung, Tags, Zusammenfassung | `claude-sonnet-5` | Strukturierte JSON-Ausgabe, gutes Preis-Leistungs-Verhältnis, schnell genug für ~5 s-Ziel. |
| Verknüpfungsvorschläge | `claude-sonnet-5` | dito |
| Kreativ-Agent (Chat, Ideen-Funke, Diagramme) | `claude-sonnet-5`, per Einstellung auf `claude-opus-4-8` hochstellbar | Sonnet reicht meist; Opus als Qualitätsoption für kreatives Sparring. |

Modell-IDs stehen zentral in `provider.ts` und sind per Env/Einstellung überschreibbar.

## 1. Auto-Einsortierung + Tags + Zusammenfassung (`organizer.ts`, F-30/32)

**Trigger:** `POST /notes/:id/organize` – vom Client debounced ~3 s nach Tipp-Ende bzw. beim Verlassen des Editors; übersprungen wenn `updated_at ≤ organized_at`.

**Ablauf (1 API-Aufruf):**
1. Kontext bauen: kompletter Ordnerbaum als eingerückte Pfadliste mit `description` und 3 Beispiel-Notiztiteln pro Ordner; die Notiz (Titel + Inhalt, gekürzt auf ~4 000 Zeichen); Negativliste zuvor abgelehnter `move_to_folder`/`create_folder`-Vorschläge dieser Notiz.
2. Aufruf mit erzwungener JSON-Ausgabe (Tool-Use mit einem einzigen „Antwort"-Tool – zuverlässiger als reines Prompt-JSON):

```jsonc
// Tool-Schema "einsortierung_ergebnis"
{
  "folderId": "string|null",        // bestehender Zielordner; null wenn neuer Ordner sinnvoller
  "newFolder": { "name": "string", "parentId": "string|null" } | null,
  "confidence": 0.0,                // 0..1 – Sicherheit der Ordnerwahl
  "reason": "string",               // 1 Satz, wird dem Nutzer angezeigt
  "tags": ["string"],               // 1–5, lowercase, deutsch
  "summary": "string"               // genau 1 Satz
}
```

**Prompt-Kern (Systemprompt, gekürzt):**
> Du bist der Organisations-Assistent einer persönlichen Notizen-App. Du erhältst die Ordnerstruktur des Nutzers (mit Beschreibungen und Beispielnotizen) und eine neue Notiz. Wähle den am besten passenden Ordner. Schlage nur dann einen neuen Ordner vor, wenn kein bestehender thematisch passt UND das Thema voraussichtlich weitere Notizen anzieht; neue Ordner so tief wie sinnvoll, aber nie tiefer als 3 Ebenen. Bevorzuge bestehende Struktur vor neuer Struktur. Vergib 1–5 prägnante deutsche Tags (Kleinschreibung) und fasse die Notiz in genau einem Satz zusammen. Schlage niemals Ordner aus der Ablehnungsliste erneut vor.

**Entscheidungslogik im Server:**
- `confidence ≥ auto_apply_threshold` (Default 0,85) und Ziel ist bestehender Ordner → direkt verschieben, `ai_suggestions`-Eintrag mit `status='auto_applied'` (für Undo + Verlauf), Tags/Summary immer direkt setzen.
- darunter, oder `newFolder` → Vorschlag `pending` (Inline-Karte + Inbox).
- Neue Ordner werden **nie** ohne Bestätigung angelegt (F-30).

## 2. Verknüpfungsvorschläge (`linker.ts`, F-31)

**Trigger:** direkt im Anschluss an Schritt 1 (gleicher `organize`-Lauf), zweiter API-Aufruf.

**Kandidaten-Vorauswahl (ohne Embeddings, MVP):** Statt alle Notizen mitzuschicken, wählt der Server bis zu 30 Kandidaten heuristisch vor: (a) FTS5-Suche mit Titelwörtern + Tags der neuen Notiz, (b) Notizen mit Tag-Überschneidung, (c) Notizen im selben Ordner. Übergeben werden je Kandidat nur `id`, Titel, Tags und `summary` – dafür wurden die Zusammenfassungen eingeführt: kompakter, günstiger Kontext.

**Aufruf:** Notiz (Titel + Summary + gekürzter Inhalt) + Kandidatenliste + Negativliste abgelehnter Links → Tool-Schema:

```jsonc
// Tool-Schema "verknuepfungs_vorschlaege"
{ "links": [ {
    "targetNoteId": "string",
    "type": "related|builds_on|contradicts|reference|part_of",
    "reason": "string",           // 1 Satz, nutzerlesbar
    "confidence": 0.0
} ] }                             // max. 5, nur wirklich sinnvolle; leere Liste ist gutes Ergebnis
```

**Prompt-Kern:** betont, dass Qualität vor Quantität geht („Schlage nur Verknüpfungen vor, die dem Nutzer beim Weiterdenken helfen; keine trivialen Ähnlichkeiten") und definiert die fünf Beziehungstypen mit je einem Beispiel.

Alle Ergebnisse werden als `pending`-Vorschläge gespeichert (Links werden **nie** auto-appliziert – Fehlverknüpfungen sind störender als ein Klick).

**Stufe 2 (optional, Post-MVP):** Embedding-Index (z. B. Voyage `voyage-3-lite` oder lokal via `@xenova/transformers`) über `summary`-Texte, Tabelle `note_embeddings(note_id, vector BLOB)`; ersetzt nur die heuristische Kandidaten-Vorauswahl – Schnittstelle von `linker.ts` bleibt identisch.

## 3. Kreativ-Agent (`agent.ts`, F-40–F-46)

Chat-Loop mit Streaming + Tool-Use (max. 8 Tool-Runden pro Nachricht, danach erzwungene Textantwort).

### Tools des Agenten

| Tool | Parameter | Wirkung |
|---|---|---|
| `search_notes` | `query` | FTS-Suche, liefert bis 10 Treffer (id, Titel, Snippet, Tags) |
| `read_note` | `noteId` | Voller Inhalt einer Notiz |
| `get_folder_tree` | – | Ordnerstruktur mit Notizanzahlen |
| `list_notes` | `folderId?`, `recentDays?` | Notizliste (Titel + Summary), z. B. „neueste 20" |
| `get_links` | `noteId` | Verknüpfungen einer Notiz |
| `create_diagram` | `mermaid`, `title` | Validiert Mermaid-Syntax serverseitig, sendet `diagram`-SSE-Event |

Nur `create_diagram` „erzeugt" etwas, und auch das nur im Chat – ins Notizsystem schreibt der Agent ausschließlich über die explizite Nutzeraktion „Als Notiz speichern" (F-44). Damit ist der Agent per Konstruktion nicht destruktiv.

### Systemprompt (Entwurf)

> Du bist der Kreativ-Partner in der persönlichen Notizen-App von Kira. Deine Aufgabe: ihre Ideen weiterdenken – neue Ansätze, unerwartete Querverbindungen, produktive Gegenfragen. Du hast Lesezugriff auf alle Notizen über deine Tools; nutze sie aktiv, statt zu raten, und zitiere konkrete Notizen mit ihrem Titel (der Client macht Titel klickbar, nutze dafür das Format `[[Titel|noteId]]`).
>
> Haltung: neugierig, konkret, auf Augenhöhe; kein Bullet-Point-Spam, sondern durchdachte, kompakte Antworten auf Deutsch. Sei mutig mit Vorschlägen, aber kennzeichne Spekulation als solche. Stelle pro Antwort mindestens eine weiterführende Frage.
>
> Wenn eine visuelle Darstellung die Antwort klarer macht (Strukturen, Abläufe, Vergleiche, Ideenlandkarten) oder der Nutzer danach fragt, erstelle sie mit `create_diagram` (Mermaid: `mindmap`, `flowchart`, `timeline` oder `graph`). Halte Diagramme minimalistisch: max. ~15 Knoten, keine Farbanweisungen (das Design übernimmt die App).
>
> Aktueller Kontext: {scope-abhängiger Block: Gesamtbestand-Statistik | Ordner-Inhaltsliste | volle aktuelle Notiz}.

### „Ideen-Funke" (F-42)

Vordefinierter Erstauftrag statt Nutzernachricht, z. B. für Scope „Notiz":
> Lies die Kontextnotiz und 3–5 verwandte Notizen (Tools!). Liefere dann: (1) drei neue, konkret verwertbare Ansätze, die der Nutzer so noch nicht notiert hat, (2) eine unerwartete Verbindung zu einer thematisch entfernten Notiz, (3) eine offene Frage, die das Thema weiterbringt.

Für Scope „alle" zusätzlich: Cluster-Blick („Welche Themen häufen sich, was liegt brach?"). „Wochen-Impuls" (F-46) = derselbe Mechanismus mit `recentDays: 7`-Fokus.

### Kontextbudget

- Chat-Verlauf: letzte 20 Nachrichten voll, ältere als serverseitig erzeugte Kurzzusammenfassung in der Systemprompt-Ergänzung.
- `read_note` kürzt Inhalte > 8 000 Zeichen (Anfang + Ende + Hinweis).
- Harte Obergrenze ~50 000 Input-Tokens pro Nachricht; darüber werden Tool-Ergebnisse beschnitten.

## Fehlerbehandlung & Kosten

- **Fehler:** 1 Retry mit 2 s Backoff bei 429/5xx; danach `AI_UPSTREAM` an den Client (Inline-Hinweis, nie modal). Ungültiges Tool-JSON → ein Korrekturversuch mit Fehlermeldung im Prompt, dann Abbruch des Laufs (Notiz bleibt unorganisiert, `organized_at` bleibt NULL → späterer Lauf holt es nach).
- **Kostenschätzung** (Sonnet-Preisklasse, Stand Planung): `organize`-Lauf ≈ 3–6k Input-/0,5k Output-Tokens ≈ **~1–2 Cent pro Notiz**; Agent-Nachricht mit Tools ≈ 10–30k Input ≈ **3–10 Cent**. Bei 10 Notizen + 20 Agent-Nachrichten/Woche ⇒ grob **3–6 €/Monat**. Der Server loggt `usage`-Tokens jedes Aufrufs in `settings`-Zählern → Anzeige unter `GET /settings/usage` (NF-07).

## Optionale Erweiterung: KI-Bildgenerierung

Bewusst nicht im Scope (E4). Falls später gewünscht: eigener Provider in `ai/imageProvider.ts` (z. B. ein Bild-API-Anbieter), Agent-Tool `create_image(prompt)`, Ablage als Anhang-Tabelle `attachments`. Architektur lässt das ohne Umbau zu.
