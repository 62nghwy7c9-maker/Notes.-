# 10 – Spezifikation Runde 2: Technische Klärungen

Runde 1 ([01](01-vision-und-scope.md)–[09](09-roadmap.md)) legt Vision, Anforderungen, Architektur, Datenmodell, API, KI-Pipeline, Design und Roadmap fest. Beim kritischen Durchgehen vor dem Coden bleiben einige Stellen **unterbestimmt** – genau die Ecken, an denen ein Entwickler sonst raten müsste oder eine plausible, aber falsche Annahme trifft. Dieses Dokument schließt sie mit verbindlichen Entscheidungen **K1–K8**, im Stil der Grundsatzentscheidungen E1–E4.

Jede Klärung nennt: **Problem** (warum Runde 1 hier nicht ausreicht), **Entscheidung**, **Begründung** und **betroffene Dateien/Dokumente**. Wo hilfreich, steht konkreter Code/DDL dabei. Am Ende ([Auswirkung auf die Roadmap](#auswirkung-auf-die-roadmap)) sind alle Klärungen den Phasen M0–M5 und den zu ergänzenden Runde-1-Dokumenten zugeordnet.

Diese Klärungen ändern **keine** Produktentscheidung aus Runde 1 – sie machen die vorhandene Planung wasserdicht.

---

## K1 – Wiki-Links robust gegen Umbenennung (F-14)

**Problem.** F-14 beschreibt `[[Titel]]`-Referenzen im Markdown; die Roadmap (M2) verlangt „hält sie bei Umbenennung synchron", ohne einen Mechanismus zu nennen. Werden Referenzen als reiner Titeltext gespeichert, brechen beim Umbenennen der Zielnotiz **alle** referenzierenden Notizen – und ein nachträgliches Text-Ersetzen über alle Notizen ist fehleranfällig (Teiltreffer, mehrdeutige Titel). Zusätzlich benutzt der Agent (06) das Zitierformat `[[Titel|noteId]]`, der Editor aber `[[Titel]]` – zwei inkompatible Formate für dasselbe Konzept.

**Entscheidung.**

1. **Kanonisches, ID-tragendes Format:** Im gespeicherten Markdown steht `[[<noteId>|<Titel>]]`. Die `noteId` ist stabil, der Titel dient nur der Lesbarkeit des Rohtexts. Der TipTap-`[[`-Autocomplete fügt beim Auswählen sofort die ID mit ein.
2. **Kein Text-Sync nötig:** Beim Rendern löst der Editor den **aktuellen** Titel live aus der DB auf (Fallback: der eingebettete Titel, falls die Notiz noch nicht geladen ist). Umbenennen ändert daher nichts am Inhalt referenzierender Notizen – es gibt nichts zu „synchronisieren".
3. **Ein Parser für beide Reihenfolgen:** Eine Util in `shared/` erkennt Referenzen per Regex und ordnet ID/Titel über die UUIDv7-Form zu (das ID-Token matcht `^[0-9a-f-]{36}$`), akzeptiert also sowohl `[[id|Titel]]` als auch das Agent-Format `[[Titel|id]]`, **schreibt** aber immer ID-zuerst. „Als Notiz speichern" (F-44) normalisiert Agent-Zitate dabei automatisch.
4. **Link-Ableitung:** Beim `PUT /notes/:id` difft `noteService` die im Inhalt enthaltenen Ziel-IDs gegen die bestehenden `origin='wikilink'`-Links dieser Notiz und legt fehlende an bzw. entfernt verschwundene (Typ immer `reference`, siehe 04). Manuelle und KI-Links bleiben unangetastet.
5. **Verwaiste Referenzen:** Ist die Zielnotiz gelöscht (Papierkorb) oder hart entfernt, rendert der Editor den Chip als ausgegrautes „(gelöschte Notiz)"; der `wikilink`-Link ist per `ON DELETE CASCADE` (04) bereits weg.

**Begründung.** Live-Auflösung über eine stabile ID ist der einzige Weg, der Umbenennen *und* mehrdeutige Titel *und* das Agent-Format ohne Massen-Textersetzung sauber löst.

**Betroffen:** `shared/` (Wikilink-Parser + Regex-Konstante), `noteService` (Link-Diff im PUT), `client/features/notes` (TipTap-`WikiLink`-Node-Extension, Live-Titel-Auflösung), `client/features/agent` („Als Notiz speichern"-Normalisierung). Zu ergänzen in Runde-1-Docs: [02](02-anforderungen.md) F-14 (Format präzisieren), [06](06-ki-features.md) Agent-Prompt (Hinweis, dass der Client normalisiert).

---

## K2 – FTS5 mit Soft-Delete korrekt synchron halten (F-13, Invariante 6)

**Problem.** [04](04-datenmodell.md) definiert `notes_fts` als **External-Content-FTS5** (`content='notes'`) und kommentiert die Trigger nur als „Standard-FTS5-Muster", verlangt aber gleichzeitig, dass **gelöschte** Notizen (`deleted_at` gesetzt) **nicht** in Suchtreffern erscheinen. Das Standardmuster indexiert jedoch *jede* Zeile bedingungslos – ein `WHERE deleted_at IS NULL` gibt es bei External-Content-Triggern nicht. Ohne explizite Behandlung tauchen Papierkorb-Notizen in der Suche auf (F-13 verletzt).

**Entscheidung.** Soft-Delete wird im Index als „Löschen", Wiederherstellen als „Einfügen" behandelt. Verbindliche Trigger-DDL für Migration 0001:

```sql
-- Neu angelegte, aktive Notiz indexieren
CREATE TRIGGER notes_fts_ai AFTER INSERT ON notes
WHEN new.deleted_at IS NULL BEGIN
  INSERT INTO notes_fts(rowid, title, content)
  VALUES (new.rowid, new.title, new.content);
END;

-- Titel/Inhalt einer aktiven Notiz geändert → neu indexieren
CREATE TRIGGER notes_fts_au_edit AFTER UPDATE OF title, content ON notes
WHEN new.deleted_at IS NULL AND old.deleted_at IS NULL BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content)
  VALUES ('delete', old.rowid, old.title, old.content);
  INSERT INTO notes_fts(rowid, title, content)
  VALUES (new.rowid, new.title, new.content);
END;

-- In den Papierkorb → aus Index entfernen
CREATE TRIGGER notes_fts_au_trash AFTER UPDATE OF deleted_at ON notes
WHEN old.deleted_at IS NULL AND new.deleted_at IS NOT NULL BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content)
  VALUES ('delete', old.rowid, old.title, old.content);
END;

-- Wiederhergestellt → wieder indexieren
CREATE TRIGGER notes_fts_au_restore AFTER UPDATE OF deleted_at ON notes
WHEN old.deleted_at IS NOT NULL AND new.deleted_at IS NULL BEGIN
  INSERT INTO notes_fts(rowid, title, content)
  VALUES (new.rowid, new.title, new.content);
END;

-- Hartes Löschen einer noch aktiven Notiz (Sicherheitsnetz)
CREATE TRIGGER notes_fts_ad AFTER DELETE ON notes
WHEN old.deleted_at IS NULL BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content)
  VALUES ('delete', old.rowid, old.title, old.content);
END;
```

**Wichtige Konsequenzen:**
- Der Index enthält **nur aktive** Notizen; die Suchquery braucht daher **keinen** `deleted_at`-Filter mehr, muss aber `rowid → id` zurückübersetzen (FTS5 kennt nur den Integer-`rowid`, die App-ID ist `notes.id TEXT`):
  ```sql
  SELECT n.id, n.title,
         snippet(notes_fts, 1, '<b>', '</b>', '…', 12) AS snippet
  FROM notes_fts
  JOIN notes n ON n.rowid = notes_fts.rowid
  WHERE notes_fts MATCH ?
  ORDER BY rank
  LIMIT 50;
  ```
- `notes` ist eine normale Rowid-Tabelle → `rowid` ist stabil (kein `WITHOUT ROWID`, kein `VACUUM` im Betrieb).
- Services schreiben nie direkt in `notes_fts` (Invariante 6 bleibt gültig); der Papierkorb-Aufräum-Job (K8) löst über normales `DELETE` den `notes_fts_ad`-Fall nicht aus, weil die Notiz zu dem Zeitpunkt bereits `deleted_at` trägt – das ist korrekt (sie ist längst aus dem Index).

**Begründung.** External-Content-FTS5 ist die richtige Wahl (kein doppelter Textspeicher), erfordert aber diese explizite Trigger-Matrix, damit Soft-Delete/Restore/Edit den Index konsistent halten. Ohne sie ist F-13 nicht korrekt umgesetzt.

**Betroffen:** `server/src/db/migrations/0001_*.sql`, `searchService` (Rowid-Join). Zu ergänzen: [04](04-datenmodell.md) (Trigger konkretisieren statt „Standardmuster").

---

## K3 – Nebenläufigkeit von `organize` (F-30/31)

**Problem.** [05](05-api-spezifikation.md) verlangt, dass `POST /notes/:id/organize` „pro Notiz max. 1× gleichzeitig" läuft und „überspringt, wenn `updated_at ≤ organized_at`", nennt aber keinen Mechanismus. Der Client feuert debounced; zwei schnelle Auslöser oder ein zweiter Tab können den teuren Doppel-Aufruf (2× Claude) parallel starten und widersprüchliche Vorschläge/Verschiebungen erzeugen.

**Entscheidung.** Ein **In-Prozess-Mutex pro Notiz** im `organizerService`:

```ts
const inFlight = new Map<string, Promise<OrganizeResult>>();

async function organize(noteId: string): Promise<OrganizeResult> {
  const running = inFlight.get(noteId);
  if (running) return running;              // koaleszieren: derselbe Lauf wird geteilt
  const p = runOrganize(noteId).finally(() => inFlight.delete(noteId));
  inFlight.set(noteId, p);
  return p;
}
```

- Der Skip-Check `updated_at ≤ organized_at` wird **innerhalb** `runOrganize` **nach** Betreten des kritischen Abschnitts erneut gelesen (nicht nur im Route-Handler), damit ein zwischenzeitliches Autosave nicht verloren geht.
- Zulässig, weil der Server **Ein-Prozess** ist (E2, better-sqlite3 synchron) – ein Prozess-lokaler `Map`-Lock genügt, verteiltes Locking ist nicht nötig.
- Alle datenverändernden Teilschritte eines Laufs (Ordner setzen, `ai_suggestions` schreiben, Tags/`summary`) laufen in **einer** `db.transaction(...)`, sodass ein Fehler auf halbem Weg nichts halb Angewendetes hinterlässt.

**Begründung.** Der Single-Process-Betrieb macht die Lösung trivial und robust; Koaleszieren spart obendrein Tokens (NF-07), weil parallele Trigger denselben Lauf teilen statt ihn zu verdoppeln.

**Betroffen:** `organizerService`/`ai/organizer.ts`, `routes/notes.ts` (bei laufendem Lauf `200` mit geteiltem Ergebnis statt neuem Aufruf).

---

## K4 – Speicherung und Schutz des API-Keys (F-50, NF-02)

**Problem.** Runde 1 legt den API-Key „AES-verschlüsselt in der DB" ab, mit `SETTINGS_SECRET` „generiert beim Erststart" ([03](03-architektur.md), [08](08-projektstruktur.md)). Ungeklärt: **wo** lebt das Geheimnis? Liegt es neben dem Chiffrat in derselben `notes.db`, ist die Verschlüsselung wirkungslos – und NF-04 empfiehlt ausdrücklich, `notes.db` als Backup zu **kopieren**, was dann den Key mitkopieren würde.

**Entscheidung.**

1. **Trennung von Geheimnis und Daten:** `SETTINGS_SECRET` liegt **nie** in der DB. Reihenfolge der Quellen: (a) Env-Variable `SETTINGS_SECRET`; sonst (b) Datei `${DATA_DIR}/.secret`. Fehlt beides, generiert der Server beim Erststart 32 zufällige Bytes, schreibt sie nach `${DATA_DIR}/.secret` mit `chmod 600` und protokolliert einen Hinweis. `.secret` steht in `.gitignore`.
2. **Verfahren:** AES-256-GCM, pro Verschlüsselung frische 12-Byte-IV; abgelegt wird `base64(iv ‖ authTag ‖ ciphertext)` im `settings`-Wert `api_key`. Beim Lesen mit falschem/fehlendem Secret schlägt die Entschlüsselung sauber fehl → der Key gilt als „nicht gesetzt" (`apiKeySet: false`), die App läuft manuell weiter (NF-03).
3. **Bedrohungsmodell (explizit):** Geschützt wird der Fall „`notes.db` bzw. ein Backup gerät in fremde Hände". **Nicht** geschützt wird ein Angreifer mit vollem Dateizugriff auf das Benutzerkonto (der ohnehin alles lesen kann) – das ist für eine lokale Single-User-App das angemessene Modell. Geht `.secret` verloren, muss der Key einmal neu eingegeben werden (akzeptabel).

**Begründung.** Erst die physische Trennung macht die Verschlüsselung wirksam und verträgt sich mit dem Datei-Backup aus NF-04.

**Betroffen:** `settingsService` (Krypto-Helfer), `db/client.ts` bzw. `index.ts` (Secret-Bootstrap), `.env.example`, `.gitignore` (`.secret` ergänzen). Zu ergänzen: [03](03-architektur.md) (Sicherheit), [08](08-projektstruktur.md) (Env-Tabelle).

---

## K5 – Barrierefreiheit des Graphen: Canvas vs. NF-05

**Problem.** NF-05 fordert „vollständig per Tastatur bedienbar" und „WCAG-AA". Ein reiner Canvas-Graph (E4, F-22, [07](07-ui-ux-design.md)) ist per Konstruktion **weder** tastaturfokussierbar **noch** für Screenreader lesbar. Das ist ein echter Zielkonflikt, den Runde 1 nicht auflöst.

**Entscheidung.** Der Canvas-Graph ist **eine visuelle Ansicht, nicht der einzige Zugang** zum Ideennetz. Der barrierefreie Pflichtpfad ist die textuelle Ebene:

1. **Immer vorhanden:** das „Verbunden (n)"-Panel je Notiz (F-21, voll tastaturbedienbar) plus Ordner-/Notiz-Navigation und Command-Palette (F-13/51) – damit ist jede Verknüpfung ohne Canvas erreichbar.
2. **Listen-Umschalter in der Graph-Ansicht:** Ein Schalter „Als Liste" rendert dieselbe `GET /graph`-Payload (`nodes`/`edges`) als gruppierte, semantische HTML-Liste (je Knoten: Titel, Ordner, Verknüpfungen mit Typ und Ziel). Verlustfrei, voll a11y – **dieser** Pfad erfüllt NF-05.
3. **Canvas als Progressive Enhancement:** `role="application"` + Aria-Label; Tastatur-Pan/Zoom (Pfeile / `+` / `−`); `Tab` wandert in stabiler Reihenfolge durch die Knoten mit sichtbarem Fokusring; eine Aria-Live-Region kündigt den fokussierten Knoten an („Hochbeet-Plan, 3 Verknüpfungen, Ordner Garten"); `Enter` öffnet die Notiz.

**Begründung.** Ein Canvas nachträglich vollständig WCAG-konform zu machen ist unrealistisch; ein gleichwertiger, verlustfreier Listenpfad ist der etablierte, ehrliche Weg. Erfolgskriterium 4 (Performance bei 1 000 Notizen) bleibt am Canvas hängen und unberührt.

**Betroffen:** `client/features/graph` (Listen-Renderer aus derselben Payload, Canvas-Tastatursteuerung). Roadmap: Listen-Fallback in **M2** mitbauen (nicht erst M5), A11y-Pass in **M5** prüft den Pflichtpfad. Zu ergänzen: [07](07-ui-ux-design.md) (Graph-Abschnitt), [02](02-anforderungen.md) NF-05.

---

## K6 – Autosave-Konsistenz bei mehreren Tabs (NF-04)

**Problem.** `PUT /notes/:id` ist „idempotent, last-write-wins" ([05](05-api-spezifikation.md)). Zwei offene Tabs (durch PWA/Bookmark real möglich) oder ein während des Tippens laufender `organize`-Vorgang können still Eingaben überschreiben. NF-04 verspricht dagegen „verliert nie mehr als ~1 s Eingabe".

**Entscheidung.**

1. **Optimistische Versionsprüfung (additiv, abwärtskompatibel):** Der Client darf im `PUT`-Body optional `baseUpdatedAt` (die zuletzt gelesene `updated_at`) mitsenden. Weicht sie vom aktuellen DB-Stand ab, antwortet der Server `409 CONFLICT` mit Code `STALE_WRITE`; der Client zeigt „In einem anderen Tab geändert – neu laden" statt stumm zu überschreiben. Ohne das Feld bleibt das Verhalten wie gehabt (last-write-wins).
2. **`organize` kollidiert nicht mit dem Editor:** Der Organizer schreibt ausschließlich `folder_id`, Tags und `summary` – **nie** `title`/`content`. Editor-Eingaben und Auto-Einsortierung berühren also disjunkte Spalten.
3. **Tab-Synchronisation innerhalb des Browsers:** Ein `BroadcastChannel('notes')` invalidiert bei jedem erfolgreichen Schreibvorgang den TanStack-Query-Cache der anderen Tabs, sodass sie sofort den neuen Stand ziehen.

**Begründung.** Minimaler Aufwand, der den einzigen realen Datenverlust-Pfad (paralleles Editieren derselben Notiz) schließt, ohne die einfache Autosave-Semantik für den Normalfall (ein Tab) zu verkomplizieren.

**Betroffen:** `shared/api` (`PUT /notes/:id` um optionales `baseUpdatedAt` + Fehlercode `STALE_WRITE` erweitern), `noteService`, `client/features/notes` (Autosave-Hook, BroadcastChannel). Zu ergänzen: [05](05-api-spezifikation.md) (Fehlercodes + PUT-Body).

---

## K7 – Kostenobergrenze statt nur Kostenanzeige (NF-07)

**Problem.** NF-07 und [06](06-ki-features.md) sehen Token-Logging und eine **Anzeige** des Monatsverbrauchs vor, aber keinen **Schutz**: Ein außer Kontrolle geratener Agent-Loop oder versehentliches Dauer-Organisieren kann Kosten verursachen, die erst auf der Rechnung auffallen.

**Entscheidung.** Optionales **Monatsbudget** als Einstellung `monthly_budget_eur` (Default: leer = aus). Der Server summiert die geschätzten Kosten pro Aufruf in einem Monatszähler (`settings`-Key `usage_YYYY_MM`, atomar in derselben Transaktion wie das Token-Logging hochgezählt). Ist das Budget überschritten, verhalten sich die KI-Endpunkte wie bei deaktivierter KI, aber mit eigenem Code `AI_BUDGET_EXCEEDED` (409) und Klartext-Hinweis „Monatsbudget erreicht – KI pausiert bis zum Monatswechsel oder Budget in den Einstellungen erhöhen". Manuelle Funktionen bleiben unberührt (NF-03).

**Begründung.** Eine Anzeige warnt erst *nachdem* Geld ausgegeben wurde; eine harte, optionale Grenze ist die naheliegende Absicherung und kostet fast nichts, da die Zählung ohnehin existiert.

**Betroffen:** `settingsService` (Budget + Monatszähler), `ai/provider.ts` bzw. Aufrufer (Vorabprüfung), `client/features/settings` (Budget-Feld + Fortschrittsanzeige). Zu ergänzen: [05](05-api-spezifikation.md) (Fehlercode), [06](06-ki-features.md) (Kosten-Abschnitt), [02](02-anforderungen.md) NF-07.

---

## K8 – Kleinere verbindliche Festlegungen (Sammlung)

Punkte, die je einzeln zu klein für eine eigene Klärung sind, aber sonst zu Rate-Arbeit führen:

| # | Thema | Festlegung |
|---|---|---|
| a | UUIDv7-Erzeugung | npm-Paket `uuidv7`; IDs als `TEXT` gespeichert, zeitlich sortierbar (deckt „neueste zuerst" ohne separaten Sort-Index). |
| b | Papierkorb-/Vorschlags-Aufräumung | Ein `setInterval`-Job (`server/src/index.ts`), täglich **und** einmalig beim Start: `notes` mit `deleted_at < now-30d` hart löschen (CASCADE räumt `links`/`note_tags`), `ai_suggestions` mit `status='pending' AND created_at < now-30d` auf `status='expired'` setzen. |
| c | Kontrast der Akzentfarbe (NF-05, WCAG-AA) | `accent #4F6EF7` auf Weiß hat Kontrast ≈ **4,28:1** – knapp **unter** AA (4,5:1) für **normalgroßen** Text. Festlegung: eigenes Token `accent-text #3B54D9` (≈ 6:1) für Inline-Links/Textlinks in Fließtextgröße; `#4F6EF7` bleibt für Flächen, Buttons (mit weißer Schrift), Icons und große/fette Elemente (dort genügt 3:1). Neue Tokens gegen den Palette-Validator prüfen. |
| d | `organize`-Trigger-Untergrenze | Bei Inhalt < 40 Zeichen (reiner Stub) wird `organize` übersprungen – spart Tokens und vermeidet unsinnige Ordnervorschläge. `organized_at` bleibt NULL, ein späterer Lauf holt es nach. |
| e | Export-Dateinamen (F-16) | Titel wird zu einem sicheren Dateinamen normalisiert (Sonderzeichen → `-`), Kollisionen unter gleichem Ordnerpfad per numerischem Suffix `-2`, `-3` aufgelöst; Ordnerstruktur = Verzeichnisse im ZIP; „Eingang"-Notizen landen unter `Eingang/`. |
| f | Session-Kontext auf gelöschte Ziele (F-45) | Zeigt `chat_sessions.context` auf eine gelöschte Notiz/Ordner, fällt der Chat still auf Scope `all` zurück und der Kontext-Chip zeigt „(Kontext nicht mehr verfügbar)". |
| g | Mermaid-Ladeverhalten | `mermaid` per dynamischem Import (eigener Chunk), `securityLevel: 'strict'`, erst beim ersten Rendern geladen – hält das Initial-Bundle klein (NF-01, App-Start < 2 s). |

**Betroffen:** verstreut (siehe Zeile). Zu ergänzen: [07](07-ui-ux-design.md) (Farbtoken c), [04](04-datenmodell.md)/[08](08-projektstruktur.md) (a, b), [06](06-ki-features.md) (d).

---

## Auswirkung auf die Roadmap

Keine der Klärungen verschiebt einen Meilenstein; sie präzisieren vorhandene Tasks. Einordnung:

| Klärung | Phase | Art |
|---|---|---|
| K2 (FTS-Trigger), K4 (Key/Secret) | **M0** | Fundament – gehört in Migration 0001 bzw. den Bootstrap. |
| K1 (Wiki-Links), K6 (Autosave-Konflikt), K8 a/d/e/g | **M1** | Editor, Notizen, Export. |
| K5 (Graph-a11y-Listenpfad) | **M2** | zusammen mit der Graph-Ansicht bauen, nicht erst polieren. |
| K3 (organize-Mutex), K7 (Budget), K8 b/f | **M3** | KI-Organisation und -Absicherung. |
| K8 c (Kontrast), A11y-/Performance-Prüfung aller Punkte | **M5** | Politur & Verifikation. |

**Zu aktualisierende Runde-1-Dokumente** (die Klärung ist jeweils die verbindliche Fassung, das Ursprungsdokument wird bei der Umsetzung nachgezogen): [02](02-anforderungen.md) (F-14, NF-05, NF-07), [03](03-architektur.md) (Sicherheit), [04](04-datenmodell.md) (FTS-Trigger), [05](05-api-spezifikation.md) (Fehlercodes `STALE_WRITE`/`AI_BUDGET_EXCEEDED`, PUT-Body), [06](06-ki-features.md) (organize-Untergrenze, Kosten), [07](07-ui-ux-design.md) (Graph-a11y, Akzent-Token), [08](08-projektstruktur.md) (`.secret`, Env).
