import { describe, expect, it } from 'vitest';
import { ICONS, getIconSvg, ICON_PREFIX } from '@/js/icons-svg.js';

describe('icons-svg', () => {
  it('exports the note-icon- prefix used by the ui templates', () => {
    expect(ICON_PREFIX).to.equal('note-icon-');
  });

  it('bundles every svg in src/font/icons as a normalized inline string', () => {
    const names = Object.keys(ICONS);
    expect(names.length).to.be.greaterThan(0);
    for (const name of names) {
      const svg = ICONS[name];
      expect(svg, `svg for ${name}`).to.be.a('string');
      expect(svg.charAt(0)).to.equal('<');
      expect(svg).to.contain('<svg');
      expect(svg).to.contain('</svg>');
    }
  });

  it('strips defs, metadata, style tags, comments, and fixed dimensions', () => {
    const svg = ICONS.bold;
    expect(svg).not.to.contain('<defs');
    expect(svg).not.to.contain('<style');
    expect(svg).not.to.contain('<metadata');
    expect(svg).not.to.contain('width="');
    expect(svg).not.to.contain('height="');
    expect(svg).not.to.match(/<!--/);
  });

  it('rewrites hardcoded fills so the icon picks up currentColor', () => {
    const svg = ICONS.bold;
    expect(svg).not.to.match(/fill="#[0-9a-fA-F]{3,8}"/);
  });

  it('keeps the original viewBox so the glyph stays centered', () => {
    expect(ICONS.bold).to.match(/viewBox="0 0 \d+ \d+"/);
  });

  it('returns the bundled svg by name', () => {
    expect(getIconSvg('bold')).to.equal(ICONS.bold);
    expect(getIconSvg('italic')).to.equal(ICONS.italic);
  });

  it('returns null for unknown icon names', () => {
    expect(getIconSvg('does-not-exist')).to.equal(null);
  });
});
