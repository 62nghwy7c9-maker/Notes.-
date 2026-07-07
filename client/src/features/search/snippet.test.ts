import { describe, expect, it } from 'vitest';
import { snippetToHtml } from './CommandPalette.js';

describe('snippetToHtml', () => {
  it('erhält die <b>-Hervorhebung des Servers', () => {
    expect(snippetToHtml('das <b>Hochbeet</b> im…')).toBe('das <b>Hochbeet</b> im…');
  });

  it('escaped HTML aus dem Notizinhalt (kein XSS)', () => {
    expect(snippetToHtml('<script>alert(1)</script> & <b>Treffer</b>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt; &amp; <b>Treffer</b>',
    );
  });
});
