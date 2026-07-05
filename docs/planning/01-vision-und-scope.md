# 01 – Vision und Scope

## Vision

Eine persönliche Notizen-App, die Wissen nicht nur speichert, sondern **aktiv organisiert und weiterdenkt**:

- Notizen liegen strukturiert in beliebig tief verschachtelten Ordnern.
- Ideen werden untereinander sinnvoll verknüpft und als interaktiver Graph erkundbar.
- Neue Notizen werden von einer KI **automatisch einsortiert und verknüpft** – der Nutzer bestätigt nur noch.
- Ein **Kreativ-Agent** liefert neue Ansätze und Ideen zu bestehenden Notizen, dient als Sparringspartner im Chat und erstellt auf Wunsch visuell anschauliche Inhalte (Diagramme, Mindmaps).
- Das Design ist **minimalistisch, organisiert und anschaulich** – die App tritt hinter den Inhalt zurück.

**Arbeitstitel:** *Notare* (Notizen + Denken). Kann jederzeit geändert werden; im Code wird neutral `notes-app` verwendet.

## Zielnutzer

Eine einzelne Person (Single-User), die viele Ideen und Notizen sammelt – privat, kreativ oder beruflich – und dabei:

- Struktur will, ohne sie manuell pflegen zu müssen,
- Zusammenhänge zwischen alten und neuen Ideen entdecken möchte,
- einen kreativen Gegenpart zum Weiterdenken sucht.

## Kernnutzen (Elevator Pitch)

> „Ich schreibe einfach – die App räumt auf, verbindet meine Ideen und denkt mit."

## Scope (MVP + Vollausbau)

| # | Feature | Phase |
|---|---------|-------|
| 1 | Notizen erstellen/bearbeiten/löschen (Markdown-Editor) | M1 |
| 2 | Beliebig verschachtelte Ordner (Drag & Drop, Umbenennen, Verschieben) | M1 |
| 3 | Volltextsuche über alle Notizen | M1 |
| 4 | Manuelle Verknüpfungen zwischen Notizen (mit Beziehungstyp) | M2 |
| 5 | Interaktiver Ideen-Graph (alle Notizen + Verknüpfungen visuell) | M2 |
| 6 | KI: automatische Einsortierung neuer Notizen in Ordner (mit Bestätigung) | M3 |
| 7 | KI: automatische Verknüpfungsvorschläge (mit Bestätigung) | M3 |
| 8 | KI: Tags/Zusammenfassung pro Notiz automatisch | M3 |
| 9 | Kreativ-Agent: Chat über Notizen, neue Ideen/Ansätze, Ideen-Feed | M4 |
| 10 | Agent erstellt Mermaid-Diagramme/Mindmaps, speicherbar als Notiz | M4 |
| 11 | Dark/Light Mode, Keyboard-Shortcuts, PWA-Installierbarkeit | M5 |

## Nicht-Ziele (bewusst ausgeschlossen)

- **Kein Multi-User / keine Kollaboration** – Single-User, kein Login.
- **Kein Cloud-Sync** – Daten liegen lokal (SQLite-Datei); Backup = Datei kopieren/exportieren.
- **Keine native Mobile-App** – Web-App, optional als PWA nutzbar.
- **Keine Echtzeit-Kollaborations-Features** (Kommentare, Freigaben).
- **Keine KI-Bildgenerierung im MVP** – nur als dokumentierte optionale Erweiterung (siehe [06-ki-features.md](06-ki-features.md), Abschnitt „Erweiterungen").
- **Kein WYSIWYG-Word-Ersatz** – Markdown-basierter Editor mit Live-Formatierung genügt.

## Getroffene Grundsatzentscheidungen

Diese Entscheidungen wurden mit den jeweils empfohlenen Standardoptionen getroffen (interaktive Rückfrage war zum Planungszeitpunkt technisch nicht möglich). Jede lässt sich revidieren; die Auswirkungen sind je Entscheidung notiert.

### E1: Plattform = Web-App (React SPA)
- **Begründung:** Überall nutzbar, schnellste Entwicklung, später als PWA installierbar (Desktop-ähnliches Gefühl).
- **Alternativen:** Desktop-App (Tauri/Electron) – wäre über denselben React-Code später nachrüstbar; native Mobile-App – deutlich teurer.
- **Bei Änderung betroffen:** 03-architektur, 08-projektstruktur.

### E2: Speicherung = lokal, Single-User, SQLite
- **Begründung:** Volle Privatsphäre, kein Account-/Sync-Aufwand, einfachstes Deployment (eine Datei).
- **Alternativen:** Cloud (Supabase/PostgreSQL) für Multi-Device; Markdown-Dateien im Dateisystem (Obsidian-Stil) – portabler, aber Verknüpfungen/KI-Metadaten aufwendiger.
- **Bei Änderung betroffen:** 03, 04, 05.

### E3: KI-Backend = Anthropic Claude API
- **Begründung:** Sehr stark bei kreativem Sparring und strukturierten Ausgaben (Tool-Use, JSON); ein Anbieter für alle KI-Features.
- **Absicherung:** Dünne Provider-Abstraktion (`server/src/ai/provider.ts`), sodass OpenAI/Ollama später austauschbar sind.
- **Kosten:** API-Key erforderlich, Kosten pro Nutzung – Abschätzung in [06-ki-features.md](06-ki-features.md).

### E4: Visuelle Inhalte = Mermaid-Diagramme + interaktiver Ideen-Graph
- **Begründung:** Zuverlässig generierbar, ohne Zusatzkosten, direkt in der App renderbar. Der Ideen-Graph macht das Notiznetz als Ganzes anschaulich.
- **Optional später:** KI-Bildgenerierung (Moodboards/Illustrationen) über externen Bild-API-Anbieter.

## Erfolgskriterien

1. Eine neue Notiz landet ohne manuelles Zutun im richtigen Ordner (oder mit einem Klick zur Bestätigung).
2. Zu jeder Notiz werden passende bestehende Notizen als Verknüpfung vorgeschlagen; Fehlvorschläge sind mit einem Klick ablehnbar.
3. Der Agent liefert auf „Gib mir neue Ansätze zu X" mindestens drei konkret verwertbare, auf den eigenen Notizen basierende Vorschläge.
4. Der Graph lädt bei 1 000 Notizen flüssig (< 2 s initial, 60 fps Interaktion).
5. Die App ist ohne Anleitung bedienbar (minimalistische, selbsterklärende UI).

## Lesereihenfolge der Planungsdokumente

1. [01-vision-und-scope.md](01-vision-und-scope.md) (dieses Dokument)
2. [02-anforderungen.md](02-anforderungen.md) – was genau gebaut wird
3. [03-architektur.md](03-architektur.md) – wie das System aufgebaut ist
4. [04-datenmodell.md](04-datenmodell.md) – Datenbankschema
5. [05-api-spezifikation.md](05-api-spezifikation.md) – Schnittstellen
6. [06-ki-features.md](06-ki-features.md) – KI-Pipeline und Agent im Detail
7. [07-ui-ux-design.md](07-ui-ux-design.md) – Design-System und Screens
8. [08-projektstruktur.md](08-projektstruktur.md) – Code-Organisation und Setup
9. [09-roadmap.md](09-roadmap.md) – Umsetzungsplan mit Tasks
