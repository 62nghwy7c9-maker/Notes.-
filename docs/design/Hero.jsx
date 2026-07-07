// Startklar Hero — React/Vite Variante
// Ablage-Vorschlag:  src/components/Hero.jsx  +  src/components/Hero.css
// Assets:            public/hero.mp4 (Higgsfield-Video) · public/hero.jpg (Standbild/Poster)
// Einbau:            in src/App.(jsx|tsx) ganz oben rendern:  <Hero />
//
// Solange die Assets fehlen, zeigt die Komponente automatisch den Farb-Platzhalter.
// Sobald public/hero.mp4 existiert, HAS_MEDIA auf true setzen.

import './Hero.css';

const HAS_MEDIA = false; // -> true, sobald public/hero.mp4 + public/hero.jpg vorhanden sind

export default function Hero() {
  return (
    <section className="hero">
      {HAS_MEDIA ? (
        <video
          className="hero__media"
          autoPlay
          muted
          loop
          playsInline
          poster="/hero.jpg"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>
      ) : (
        <div className="hero__placeholder">
          <div className="hero__island" />
        </div>
      )}

      <div className="hero__scrim" />

      <div className="hero__content">
        <p className="hero__eyebrow">Startklar</p>
        <h1 className="hero__title">
          Bereit fürs <em>echte</em> Leben.
        </h1>
        <a className="hero__cta" href="#start">
          Jetzt startklar werden
        </a>
      </div>
    </section>
  );
}
