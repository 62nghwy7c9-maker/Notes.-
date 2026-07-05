# 07 – UI/UX-Design

Leitidee: **minimalistisch, organisiert, anschaulich** (Anforderung). Die Oberfläche tritt hinter den Inhalt zurück: viel Weißraum, eine Akzentfarbe, keine dekorativen Elemente. „Anschaulich" leisten Graph, Diagramme und klare Informationshierarchie – nicht Ornamente.

## Design-System

### Farben (Tailwind-Tokens, Light / Dark)

| Token | Light | Dark | Verwendung |
|---|---|---|---|
| `bg` | `#FAFAF9` (warmes Off-White) | `#111113` | App-Hintergrund |
| `surface` | `#FFFFFF` | `#1A1A1E` | Panels, Karten, Editor |
| `border` | `#E7E5E4` | `#2A2A30` | Hairline-Trennlinien (1 px) |
| `text` | `#1C1917` | `#EDEDEF` | Fließtext |
| `text-muted` | `#78716C` | `#8B8B93` | Sekundärtext, Metadaten |
| `accent` | `#4F6EF7` (ruhiges Indigo) | `#7B93FF` | Aktive Zustände, Links, Primärbuttons, KI-Elemente |
| `accent-soft` | `#EEF1FE` | `#23283F` | Hover/Selektion-Hintergrund, KI-Vorschlagskarten |
| `success` / `danger` | `#16A34A` / `#DC2626` | `#4ADE80` / `#F87171` | Bestätigen / Löschen-Aktionen (sparsam) |

Graph-Knotenfarben (Ordner-Kodierung, F-22): 8er-Palette gedämpfter, unterscheidbarer Töne (Indigo, Teal, Amber, Rose, Violett, Grün, Cyan, Orange), automatisch den Wurzelordnern zugewiesen; Legende einblendbar. KI-generierte Inhalte tragen durchgängig ein dezentes ✦-Zeichen in `accent` als Kennzeichnung.

### Typografie & Abstände

- **UI-Schrift:** `Inter` (variable, selbst gehostet); **Editor:** ebenfalls Inter, Fließtext 16 px / 1,7 Zeilenhöhe; **Code/Mono:** `JetBrains Mono`.
- Skala: 12 (Meta) · 13 (UI) · 14 (Listen) · 16 (Editor-Text) · 20/24/30 (Überschriften H3–H1 im Editor).
- Spacing auf 4-px-Raster; Panel-Innenabstand 16 px; Radius 8 px (Karten/Buttons), 12 px (Popover/Dialoge).
- Schatten fast keine – Ebenen entstehen durch `border` + minimale Elevation nur bei Popovern.
- Theme: hell/dunkel/System (F-50), umgesetzt über CSS-Variablen + `data-theme`.

### Grundprinzipien

1. **Drei Ebenen, nie mehr:** Hintergrund → Fläche → Popover. Keine verschachtelten Boxen.
2. **Leere Zustände arbeiten:** Jeder leere Bereich erklärt sich und bietet die nächste Aktion an (z. B. leerer Ordner: „Noch keine Notizen – `Ctrl+N` legt eine an.").
3. **KI ist Vorschlag, nie Unterbrechung:** KI-Elemente erscheinen inline (Karten, Snackbar), niemals als modale Dialoge.
4. **Alles hat einen Shortcut** (F-51), sichtbar in Tooltips und der Command-Palette.

## Layout: Hauptansicht (3 Spalten + Agent-Panel)

```
┌────────────┬──────────────────┬───────────────────────────────┬─ ─ ─ ─ ─ ─┐
│  SIDEBAR   │    NOTIZLISTE    │            EDITOR             ┊  AGENT ✦   ┊
│  240px     │    288px         │            flex               ┊  380px     ┊
│            │                  │                               ┊ (einblendb.)┊
│ ⌕ Suche…   │ Garten (8)   ⇅   │  Hochbeet-Plan                ┊ ┌─────────┐┊
│            │ ┌──────────────┐ │  ───────────────────────      ┊ │Verlauf ▾│┊
│ 📥 Eingang 3│ │▪Hochbeet-Plan│ │  # Hochbeet-Plan              ┊ └─────────┘┊
│ ─────────  │ │ Skizze für…  │ │                               ┊            ┊
│ ▾ 🚀 Projekte│ │ garten plan…│ │  Im Frühjahr will ich …       ┊ Du: Welche ┊
│   ▾ 🌱 Garten│ └──────────────┘ │                               ┊ neuen An-  ┊
│     Beete  │ ┌──────────────┐ │  - [ ] Holz besorgen          ┊ sätze…?    ┊
│   ▸ Haus   │ │ Bodenqualität│ │  - [ ] Erde mischen           ┊            ┊
│ ▸ 💡 Ideen  │ │ Kompost verb…│ │                               ┊ ✦: In      ┊
│ ▸ 📚 Lernen │ └──────────────┘ │ ┌───────────────────────────┐ ┊ [[Boden-   ┊
│            │      …           │ │✦ Verknüpfen mit „Boden-   │ ┊ qualität]] ┊
│ ─────────  │                  │ │  qualität" (baut auf)?    │ ┊ hast du …  ┊
│ ◈ Graph    │                  │ │  „Greift die Kompost-Idee │ ┊            ┊
│ ✦ Vorschläge 2│               │ │  auf."      [✓] [✕]       │ ┊ ┌────────┐ ┊
│ 🗑 Papierkorb│                 │ └───────────────────────────┘ ┊ │ Frage… │ ┊
│ ⚙ Einstell.│                  │  Verbunden (3) ▸              ┊ └────────┘ ┊
└────────────┴──────────────────┴───────────────────────────────┴─ ─ ─ ─ ─ ─┘
```

- **Sidebar:** virtueller „Eingang" (Badge = unsortierte Notizen) oben, darunter Ordnerbaum (Einrückung 16 px, Chevron nur bei Kindern, Drag & Drop mit Einfüge-Indikator), unten feste Navigation (Graph, Vorschläge mit Badge, Papierkorb, Einstellungen). Einklappbar auf Icon-Leiste (48 px).
- **Notizliste:** Karten mit Titel, `summary` (1 Zeile, `text-muted`), Tag-Chips; angepinnte oben (F-15); Sortierung Zuletzt-geändert; Kontextmenü (verschieben, anpinnen, löschen).
- **Editor:** randlos auf `surface`, Titel als H1-Eingabe, TipTap-Fläche darunter; oben rechts dezente Meta-Zeile (Ordnerpfad als Breadcrumb → Klick = verschieben, Speicherstatus „Gespeichert ✓"). `[[`-Autocomplete als Popover (F-14). Unter dem Inhalt: einklappbarer Bereich **„Verbunden (n)"** mit Verknüpfungszeilen (Typ-Label + Titel + Begründung als Tooltip) und `+ Verknüpfung`.
- **KI-Vorschlagskarten** (F-30/31): `accent-soft`-Karten zwischen Editor und „Verbunden"; ✓ übernimmt, ✕ lehnt ab. Auto-Einsortierung zeigt stattdessen eine Snackbar unten mittig: „✦ Einsortiert in Projekte/Garten · Rückgängig" (8 s).

## Agent-Panel (F-40–F-45)

Rechts andockendes Panel (`Ctrl/Cmd+J`), alternativ als eigene Route `/agent` in voller Breite.

- Kopf: Session-Wechsler (Dropdown mit Verlauf), Kontext-Chip („Kontext: aktuelle Notiz ▾" – umschaltbar auf Ordner/alles, F-45), „⚡ Ideen-Funke"-Button (F-42).
- Nachrichten: Nutzer rechtsbündig schlicht; Agent linksbündig mit ✦; `[[Titel|noteId]]`-Zitate als klickbare Chips (öffnen die Notiz); Tool-Aktivität als einzeilige, ausgegraute Statuszeilen („✦ durchsucht Notizen…"), die nach Abschluss kollabieren.
- Diagramme: gerendertes Mermaid auf `surface`-Karte, darunter Aktionen „Als Notiz speichern" (F-44) · „Code anzeigen" · „Vergrößern" (Lightbox).
- Jede Agent-Antwort trägt unten eine dezente Aktion „Als Notiz speichern".
- Eingabe: Auto-grow-Textarea, `Enter` senden / `Shift+Enter` Zeilenumbruch; während des Streams wird der Senden-Button zu „Stopp".

## Graph-Ansicht (F-22/23) – Route `/graph`

```
┌──────────────────────────────────────────────────────────────┐
│ ◈ Ideen-Graph      [Ordner ▾] [Tag ▾] [○ Nur Umfeld]  ⌕ Zoom │
│                                                              │
│           ●───────●  Garten                                  │
│          ╱│╲      │                                          │
│    ●────● │ ●─────●          ● Legende: ● Projekte ● Ideen   │
│         ╲ │╱                          ● Lernen               │
│           ●  ← Hover: Karte {Titel, Summary, Tags}           │
│                     Klick: Vorschau · Doppelklick: öffnen    │
└──────────────────────────────────────────────────────────────┘
```

- Canvas mit D3-force (Layout im Web Worker); Knotenfarbe = Wurzelordner, Größe = `linkCount`, Kantenstil je Typ (durchgezogen `related`/`builds_on`, gestrichelt `reference`/`part_of`, rot-gepunktet `contradicts`).
- Labels ab Zoomstufe ≥ 0,8 (sonst nur bei Hover) – hält das Bild ruhig.
- „Nur Umfeld"-Modus: vom ausgewählten Knoten Tiefe 1–2 (F-23); Einstieg auch aus dem Editor via „Im Graph zeigen".
- Klick öffnet Vorschau-Popover mit „Öffnen"-Button; Doppelklick springt in den Editor.

## Weitere Screens

- **Command-Palette** (`Ctrl/Cmd+K`, F-13/51): zentriertes Popover; tippen durchsucht Notizen (Snippet + Ordnerpfad) und Befehle („Neue Notiz", „Graph öffnen", „Theme wechseln"…); `↑↓` + `Enter`.
- **Vorschlags-Inbox** (F-33): Liste gruppiert nach Notiz; jede Zeile = Vorschlagskarte wie im Editor; Kopfzeile „Alle übernehmen / Alle ablehnen".
- **Papierkorb** (F-12): schlichte Liste mit „Wiederherstellen" / „Endgültig löschen" (Bestätigungsdialog), Hinweis „Automatische Leerung nach 30 Tagen".
- **Einstellungen** (F-50): eine Seite, vier Gruppen – KI (Key-Eingabe mit „Testen", an/aus, Schwellen-Slider 0,5–1,0, Sprache, Nutzungsanzeige), Darstellung (Theme), Daten (Export-ZIP, DB-Pfad-Anzeige), Shortcuts (Referenzliste).

## Keyboard-Shortcuts (F-51)

| Shortcut | Aktion |
|---|---|
| `Ctrl/Cmd+N` | Neue Notiz (im aktuellen Ordner) |
| `Ctrl/Cmd+K` | Command-Palette / Suche |
| `Ctrl/Cmd+J` | Agent-Panel ein/aus |
| `Ctrl/Cmd+G` | Graph öffnen |
| `Ctrl/Cmd+E` | Ordnerbaum ein-/ausklappen |
| `Ctrl/Cmd+P` | Notiz anpinnen |
| `Ctrl/Cmd+Z` | Rückgängig (auch für „Auto-Einsortiert"-Aktion, solange Snackbar sichtbar) |
| `Esc` | Popover/Panel schließen |

## Responsive-Verhalten

Desktop-first. Unter 1 100 px: Agent-Panel als Overlay statt andockend. Unter 800 px (PWA/Tablet): Spalten werden zu Stapel-Navigation (Liste → Editor mit Zurück-Pfeil), Graph bleibt verfügbar (Touch: Pinch-Zoom), Sidebar als Drawer.
