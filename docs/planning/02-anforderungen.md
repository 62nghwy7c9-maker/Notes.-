# 02 – Anforderungen

## Funktionale Anforderungen

Priorität: **MUSS** (MVP-relevant), **SOLL** (Vollausbau), **KANN** (optionale Erweiterung).

### Ordner & Struktur

| ID | Anforderung | Prio |
|----|-------------|------|
| F-01 | Ordner können erstellt, umbenannt und gelöscht werden. | MUSS |
| F-02 | Ordner können beliebig tief verschachtelt werden (Ordner in Ordnern), Selbstreferenz über `parent_id`. | MUSS |
| F-03 | Ordner und Notizen können per Drag & Drop (und per Kontextmenü) verschoben werden. | MUSS |
| F-04 | Beim Löschen eines Ordners wird gewählt: Inhalt mitlöschen oder in den Elternordner verschieben. Löschen erfordert Bestätigung. | MUSS |
| F-05 | Der Ordnerbaum zeigt pro Ordner die Anzahl enthaltener Notizen (inkl. Unterordner). | SOLL |
| F-06 | Ordner können ein Emoji/Icon und eine optionale Beschreibung erhalten (Beschreibung hilft der KI beim Einsortieren). | SOLL |

### Notizen & Editor

| ID | Anforderung | Prio |
|----|-------------|------|
| F-10 | Notizen bestehen aus Titel und Markdown-Inhalt; Speicherung erfolgt automatisch (Autosave, debounced ~800 ms). | MUSS |
| F-11 | Der Editor rendert Markdown live (Überschriften, Listen, Checkboxen, Codeblöcke, Tabellen, Bilder per URL, Mermaid-Blöcke). | MUSS |
| F-12 | Notizen können gelöscht werden; Löschung wandert zunächst in einen Papierkorb (30 Tage), von dort wiederherstellbar oder endgültig löschbar. | MUSS |
| F-13 | Volltextsuche über Titel und Inhalt aller Notizen (SQLite FTS5), Ergebnisliste mit Trefferausschnitt. | MUSS |
| F-14 | Innerhalb einer Notiz kann per `[[Titel]]`-Syntax auf andere Notizen verwiesen werden (Autocomplete-Popup); erzeugt automatisch eine Verknüpfung vom Typ `reference`. | SOLL |
| F-15 | Notizen können angepinnt werden (erscheinen oben in der Liste). | KANN |
| F-16 | Export einer Notiz bzw. aller Notizen als Markdown-Dateien (ZIP mit Ordnerstruktur). | SOLL |

### Verknüpfungen & Ideen-Graph

| ID | Anforderung | Prio |
|----|-------------|------|
| F-20 | Zwischen zwei Notizen kann manuell eine Verknüpfung angelegt werden, mit Beziehungstyp: `related` (verwandt), `builds_on` (baut auf), `contradicts` (widerspricht), `reference` (verweist auf), `part_of` (gehört zu). | MUSS |
| F-21 | Jede Notiz zeigt ihre Verknüpfungen in einem Seitenbereich („Verbundene Ideen") inkl. Beziehungstyp; Klick öffnet die Zielnotiz. | MUSS |
| F-22 | Der Ideen-Graph zeigt alle Notizen als Knoten und Verknüpfungen als Kanten (Force-Layout); Farbe = oberster Ordner, Größe = Anzahl Verknüpfungen. | MUSS |
| F-23 | Graph-Interaktion: Zoomen, Verschieben, Knoten anklicken (öffnet Vorschau/Notiz), Filter nach Ordner/Tag, lokaler Modus („nur Nachbarn dieser Notiz, Tiefe 1–2"). | MUSS |
| F-24 | Verknüpfungen können eine kurze Begründung tragen (max. 200 Zeichen), sichtbar als Tooltip auf der Kante. | SOLL |

### KI: Automatische Organisation

| ID | Anforderung | Prio |
|----|-------------|------|
| F-30 | Beim Anlegen/nach dem Schreiben einer neuen Notiz schlägt die KI automatisch einen Zielordner vor (bestehend oder neu). Ab Confidence ≥ 0,85 wird direkt einsortiert (mit Undo-Hinweis), darunter erscheint ein Bestätigungsvorschlag. | MUSS |
| F-31 | Die KI schlägt Verknüpfungen zu bestehenden Notizen vor (max. 5, mit Beziehungstyp und Ein-Satz-Begründung); Nutzer bestätigt/verwirft einzeln oder alle. | MUSS |
| F-32 | Die KI generiert pro Notiz automatisch 1–5 Tags und eine Ein-Satz-Zusammenfassung (`summary`), genutzt für Suche, Graph-Tooltips und als Kontext für weitere KI-Aufrufe. | MUSS |
| F-33 | Alle KI-Vorschläge landen in einer Inbox („Vorschläge"), sind dort gesammelt abarbeitbar und altern nach 30 Tagen automatisch aus. | SOLL |
| F-34 | Abgelehnte Vorschläge werden gespeichert und der KI als Negativ-Beispiele mitgegeben (nicht erneut vorschlagen). | SOLL |
| F-35 | KI-Funktionen sind in den Einstellungen global deaktivierbar; ohne API-Key läuft die App vollständig manuell. | MUSS |

### Kreativ-Agent

| ID | Anforderung | Prio |
|----|-------------|------|
| F-40 | Chat-Panel mit dem Agenten; Antworten werden gestreamt (SSE). Chat-Verläufe werden als Sessions gespeichert und sind wieder aufrufbar. | MUSS |
| F-41 | Der Agent hat Werkzeugzugriff auf die Notizen: suchen, lesen, Ordnerstruktur einsehen (Tool-Use; nur Lesezugriff plus explizit bestätigtes Erstellen, siehe F-44). | MUSS |
| F-42 | Modus „Ideen-Funke": Der Agent liefert proaktiv neue Ansätze zu einer gewählten Notiz / einem Ordner / dem Gesamtbestand – z. B. unerwartete Kombinationen zweier Ideen, offene Fragen, Gegenpositionen, nächste Schritte. | MUSS |
| F-43 | Der Agent erstellt auf Wunsch Mermaid-Visualisierungen (Mindmap, Flowchart, Zeitstrahl, Vergleich), die im Chat gerendert werden. | MUSS |
| F-44 | Chat-Inhalte des Agenten (Text oder Diagramm) können per Klick als neue Notiz übernommen werden (läuft dann durch die normale Auto-Einsortierung). | MUSS |
| F-45 | Kontextwahl im Chat: gesamter Bestand, aktueller Ordner oder aktuelle Notiz als Fokus. | SOLL |
| F-46 | „Wochen-Impuls": Auf Wunsch generiert der Agent eine Übersicht neuer Querverbindungen und Ideen der letzten Woche. | KANN |

### Einstellungen & Sonstiges

| ID | Anforderung | Prio |
|----|-------------|------|
| F-50 | Einstellungen: API-Key (verschlüsselt lokal gespeichert), KI an/aus, Auto-Einsortierungs-Schwelle, Theme (hell/dunkel/System), Sprache der KI-Ausgaben (Standard: Deutsch). | MUSS |
| F-51 | Keyboard-Shortcuts (u. a. `Ctrl/Cmd+N` neue Notiz, `Ctrl/Cmd+K` Schnellsuche/Command-Palette, `Ctrl/Cmd+G` Graph, `Ctrl/Cmd+J` Agent). | SOLL |
| F-52 | PWA: installierbar, App-Icon, Offline-Anzeige bereits geladener Notizen (KI-Funktionen erfordern online). | KANN |

## Zentrale User Stories mit Akzeptanzkriterien

### US-1: Notiz schreiben und automatisch einsortieren lassen
> Als Nutzerin schreibe ich schnell einen Gedanken auf, ohne über Ablage nachzudenken; die App sortiert ihn sinnvoll ein.

- **Gegeben** eine neue Notiz mit erkennbarem Thema, **wenn** ich aufhöre zu tippen (bzw. den Editor verlasse), **dann** erscheint innerhalb von ~5 s ein Vorschlag „Einsortieren in: ‹Ordnerpfad›" mit Begründung – oder die Notiz wird bei hoher Confidence direkt verschoben, mit Snackbar „Einsortiert in ‹Ordner› – Rückgängig".
- Existiert kein passender Ordner, schlägt die KI die Anlage eines neuen Ordners (inkl. Elternordner-Position) vor; Anlage erfolgt erst nach Bestätigung.
- Bei deaktivierter KI passiert nichts Automatisches; die Notiz bleibt im gewählten/Standardordner „Eingang".

### US-2: Verwandte Ideen entdecken
> Als Nutzerin will ich beim Lesen einer Notiz sehen, welche meiner früheren Ideen damit zusammenhängen.

- Im Seitenbereich der Notiz stehen bestätigte Verknüpfungen und (visuell abgesetzt) offene KI-Vorschläge mit Beziehungstyp + Begründung.
- Vorschlag annehmen erzeugt die Verknüpfung sofort und sie erscheint im Graph; ablehnen entfernt ihn dauerhaft (F-34).

### US-3: Mit dem Agenten Ideen weiterentwickeln
> Als Nutzerin will ich mich mit einem kreativen Gegenpart über meine Notizen austauschen.

- Ich öffne den Agenten mit `Ctrl/Cmd+J`, wähle als Kontext „aktuelle Notiz" und frage „Welche neuen Ansätze siehst du hier?".
- Der Agent zitiert konkrete eigene Notizen (mit klickbaren Verweisen), liefert ≥ 3 unterscheidbare neue Ansätze und stellt mindestens eine weiterführende Frage.
- Auf „Zeig mir das als Mindmap" folgt ein gerendertes Mermaid-Diagramm; über „Als Notiz speichern" wird es übernommen.

### US-4: Überblick im Graph
> Als Nutzer will ich mein gesamtes Ideennetz visuell erkunden.

- Graph öffnet in < 2 s (bei ≤ 1 000 Notizen), Interaktion flüssig; Filter nach Ordner reduziert sichtbare Knoten sofort.
- Klick auf einen Knoten zeigt eine Vorschau (Titel, Zusammenfassung, Tags); Doppelklick öffnet die Notiz im Editor.

## Nicht-funktionale Anforderungen

| ID | Anforderung |
|----|-------------|
| NF-01 | **Performance:** UI-Interaktionen < 100 ms; Suche < 300 ms bei 10 000 Notizen; App-Start < 2 s. KI-Antworten dürfen länger dauern, laufen aber immer asynchron/nicht-blockierend mit sichtbarem Ladezustand. |
| NF-02 | **Datenhoheit:** Alle Daten in einer lokalen SQLite-Datei. An externe Dienste geht ausschließlich der für den jeweiligen KI-Aufruf nötige Notiz-Kontext (Anthropic API). Kein Tracking, keine Telemetrie. |
| NF-03 | **Robustheit:** KI-Ausfall (kein Key, Rate-Limit, Netzfehler) degradiert die App zur voll funktionsfähigen manuellen Notizen-App; Fehler erscheinen als dezente, verständliche Hinweise. |
| NF-04 | **Datensicherheit:** Autosave verliert nie mehr als die letzten ~1 s Eingabe; SQLite im WAL-Modus; Backup durch Export (F-16) bzw. Kopie der DB-Datei. |
| NF-05 | **Bedienbarkeit:** Vollständig per Tastatur bedienbar; WCAG-AA-Kontraste; deutsche UI-Sprache. |
| NF-06 | **Wartbarkeit:** TypeScript strikt (`strict: true`) in Client und Server; geteilte Typen in `shared/`; API-Verträge zentral definiert (siehe [05-api-spezifikation.md](05-api-spezifikation.md)). |
| NF-07 | **Kostenkontrolle:** KI-Aufrufe gebündelt und mit Kontextbudget (siehe [06-ki-features.md](06-ki-features.md)); Einstellungsseite zeigt geschätzten Token-Verbrauch des laufenden Monats. |
