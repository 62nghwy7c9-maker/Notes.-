# Higgsfield Master-Prompt — Startklar Hero-Bild & Hero-Video

Ziel: Ein cinematisches Hero-Foto für die Startseite von **startklar88.netlify.app**, das anschließend in Higgsfield per Image-to-Video animiert wird. Es ist das Erste, was Besucher:innen sehen.

## Das Motiv: „Der Abwurf"

Eine junge Person (Rückenansicht) steht im wehenden Gras auf einer schwebenden Wieseninsel und hat gerade einen **Papierflieger** aus cremefarbenem Papier in den weiten Himmel geworfen. Der Flieger steigt in den leeren Bildbereich oben — genau dorthin, wo die Headline stehen wird.

Warum dieses Motiv:

- **Markengeschichte in einem Bild:** „Behörden-Papier, das fliegen lernt = Bürokratie wird zu Aufbruch" — der Papierflieger ist das wiederkehrende Motiv der App (Begleiter „Flo").
- **Blickführung:** Der Flieger zieht den Blick in den Negativraum zur Headline.
- **Animierbar:** Flieger gleitet, Gras weht, Kamera pusht langsam rein — perfekt für Image-to-Video.
- **Zielgruppe 16–26:** Editorial-Look mit Film Grain und leichter chromatischer Aberration statt Stock-Foto; Rückenansicht = Identifikation („das könntest du sein").

## Farbwelt (strikt)

| Farbe | Hex | Einsatz im Bild |
|---|---|---|
| Olive Leaf | `#606C38` | Gras, Wiese, Insel-Oberfläche |
| Black Forest | `#283618` | Schatten, Erdreich/Wurzeln unter der Insel, dunkle Grastiefen |
| Cornsilk | `#FEFAE0` | Himmel, Licht, Nebel — und der Papierflieger selbst (hellster Punkt im Bild) |

---

## 1) Master-Prompt (Text-to-Image, 16:9)

> Empfohlenes Modell: **Soul** (Cinema-Stil). Zum günstigen Iterieren: **Nano Banana** (1 Credit/Bild), dann final in Soul/Seedream. Prompt ist auf Englisch, weil Bildmodelle darauf am zuverlässigsten reagieren.

```text
Dreamy cinematic wide shot of a floating grassy island, a small hill of long
wind-blown meadow grass hovering in a vast empty sky, with raw earth and roots
visible on the underside of the island, as if seen from outside the fourth wall.

A young adult around 18, seen from behind, casual streetwear with a loose light
jacket moving in the wind, stands near the edge of the island. They have just
thrown a paper airplane folded from warm cream paper — the plane is caught
mid-flight, rising diagonally up and away into the open sky.

Strict color palette, no other hues: meadow grass in muted olive green (#606C38),
shadows, soil and root underside in deep forest green (#283618), sky, haze,
soft light and the paper airplane in warm cream (#FEFAE0). Tonal, almost
monochromatic grading within these three tones.

Composition: island and person in the lower third of the frame, the upper two
thirds are calm negative space of soft cream sky for a headline. The paper
airplane leads the eye from the person up into that empty space. No text,
no logos.

Soft diffuse golden light, gentle drifting haze, dreamy atmosphere. Subtle
chromatic aberration at the frame edges, delicate film grain, shallow
cinematic depth, editorial photography look — feels shot, not generated.
Wide 16:9 landscape format.
```

**Higgsfield-Einstellungen:**

- Aspect Ratio: **16:9** (für Ultrawide-Hero später oben/unten auf 21:9 croppen — der Negativraum verträgt das)
- Batch/Variationen: 2–4 Bilder pro Run generieren, besten Seed merken
- Enhance/Upscale erst beim finalen Favoriten

### Prompt-Variationen

**A — Ohne Person (nur Flieger, sehr clean):**

```text
… same scene, but no person: a single warm cream paper airplane (#FEFAE0)
soaring alone above the floating olive-green meadow island, rising into the
vast empty cream sky, tiny against the negative space.
```

**B — Näher an der Person (mehr Emotion):**

```text
… medium shot from behind over the shoulder of the young adult, wind in their
hair and jacket, the cream paper airplane just leaving their hand, meadow
grass brushing the lower frame, sky filling the rest.
```

**C — Flieger-Schwarm (Community-Gefühl):**

```text
… a loose trail of five cream paper airplanes (#FEFAE0) gliding upward in a
gentle arc across the sky, launched from the floating meadow island, the
leading plane highest and closest to the upper negative space.
```

---

## 2) Motion-Prompt (Image-to-Video in Higgsfield)

> Empfohlenes Modell: **Kling** (neueste verfügbare Version). Nur **ein** finaler Run — Video kostet die meisten Credits. Bewusst wenig Bewegung: wirkt hochwertig und loopt sauber.

```text
Very slow, calm cinematic motion. The long meadow grass sways gently in the
wind in soft waves. Thin haze drifts slowly across the cream sky. The paper
airplane glides smoothly upward and slightly across the frame, softly rocking
on the air. The person stays almost still, only their jacket and hair move in
the wind. Extremely slow camera push-in, no cuts, no zoom bursts, seamless
loop-friendly, dreamy and serene mood.
```

**Tipps für den Video-Run:**

- Dauer 5 s reicht für einen Hero-Loop
- Falls das Modell „camera motion" als Preset anbietet: langsames **Push-in** oder **Static** wählen, nichts Schnelles
- Ergebnis prüfen: Flieger darf nicht morphen/knicken — falls doch, Variante A (Flieger kleiner im Bild) animieren

---

## 3) Modellwahl in der kostenlosen Version

1. **Entwerfen:** Nano Banana (1 Credit/Bild) — beste Treue zu Farb-Hexwerten und Kompositionsanweisungen, ideal zum Iterieren
2. **Finalisieren:** Soul (Cinema) für den cinematischen Editorial-Look; Alternative: Seedream (hohe Auflösung, 1 Credit)
3. **Animieren:** Kling, ein einziger Run mit dem Motion-Prompt oben
4. Credits knapp? Der Master-Prompt funktioniert modellunabhängig — Bild z. B. kostenlos mit Nano Banana in Google Gemini erzeugen und nur den Video-Schritt in Higgsfield machen

## 4) Einbindung auf der Startseite

- Video als `<video autoplay muted loop playsinline>` im Hero, Poster-Frame = das finale Foto (schneller First Paint)
- Headline („Bereit fürs echte Leben.") in **Cornsilk `#FEFAE0`** in den oberen Negativraum; falls sie über hellem Himmel steht, dezenter Schatten oder Farbton **Black Forest `#283618`** für Kontrast
- CTA-Button: Black Forest-Fläche mit Cornsilk-Text — bleibt in der Palette
- Video auf ≤ 3–4 MB komprimieren (H.264/H.265 oder WebM), sonst leidet die Ladezeit auf Mobilgeräten
