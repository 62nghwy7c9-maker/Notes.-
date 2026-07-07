// Startklar Hero — React/Vite Variante
// Ablage-Vorschlag:  src/components/Hero.jsx  +  src/components/Hero.css
// Assets:            public/hero.mp4 (Higgsfield-Video) · public/hero.jpg (Standbild/Poster)
// Einbau:            in src/App.(jsx|tsx) ganz oben rendern:  <Hero />
//
// Die fertigen Assets liegen in diesem Ordner (docs/design/hero.mp4 + hero.jpg)
// und müssen nur nach public/ kopiert werden.

import './Hero.css';

const HAS_MEDIA = true; // Assets vorhanden: public/hero.mp4 + public/hero.jpg

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
