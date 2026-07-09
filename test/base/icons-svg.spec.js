import { describe, expect, it, beforeEach } from 'vitest';
import {
  ICONS,
  ICON_PREFIX,
  getIconSvg,
  getIconUrl,
  getIconBaseUrl,
  setIconBaseUrl,
  hasIcon,
  iconNames,
  loadIcon,
  loadAllIcons,
  resetIconCache,
} from '@/js/icons-svg.js';

describe('icons-svg', () => {
  beforeEach(async() => {
    resetIconCache();
    setIconBaseUrl('/src/font/icons/');
  });

  it('exports the note-icon- prefix used by the ui templates', () => {
    expect(ICON_PREFIX).to.equal('note-icon-');
  });

  it('exposes the icon manifest compiled from src/font/icons', () => {
    const names = iconNames();
    expect(names.length).to.be.greaterThan(0);
    expect(names).to.include('bold');
    expect(names).to.include('italic');
  });

  it('keeps the cache empty until an icon is explicitly loaded', () => {
    expect(Object.keys(ICONS).length).to.equal(0);
    expect(getIconSvg('bold')).to.equal(null);
  });

  it('reports known and unknown icon names via hasIcon', () => {
    expect(hasIcon('bold')).to.equal(true);
    expect(hasIcon('does-not-exist')).to.equal(false);
  });

  it('resolves icon fetch urls against the configured base url', () => {
    const original = getIconBaseUrl();
    try {
      setIconBaseUrl('https://cdn.example.com/assets/icons');
      expect(getIconBaseUrl()).to.equal('https://cdn.example.com/assets/icons/');
      expect(getIconUrl('bold')).to.equal('https://cdn.example.com/assets/icons/bold.svg');
    } finally {
      setIconBaseUrl(original);
    }
  });

  it('fetches a single icon lazily, normalizes it, and caches the result', async() => {
    const svg = await loadIcon('bold');
    expect(svg).to.be.a('string');
    expect(svg.charAt(0)).to.equal('<');
    expect(svg).to.contain('<svg');
    expect(svg).to.contain('</svg>');
    expect(getIconSvg('bold')).to.equal(svg);
    expect(ICONS.bold).to.equal(svg);
  });

  it('strips defs, metadata, style tags, comments, and fixed dimensions', async() => {
    const svg = await loadIcon('bold');
    expect(svg).not.to.contain('<defs');
    expect(svg).not.to.contain('<style');
    expect(svg).not.to.contain('<metadata');
    expect(svg).not.to.contain('width="');
    expect(svg).not.to.contain('height="');
    expect(svg).not.to.match(/<!--/);
  });

  it('rewrites hardcoded fills so the icon picks up currentColor', async() => {
    const svg = await loadIcon('bold');
    expect(svg).not.to.match(/fill="#[0-9a-fA-F]{3,8}"/);
  });

  it('keeps the original viewBox so the glyph stays centered', async() => {
    const svg = await loadIcon('bold');
    expect(svg).to.match(/viewBox="0 0 \d+ \d+"/);
  });

  it('shares a single in-flight request when loadIcon is called concurrently', async() => {
    const a = loadIcon('italic');
    const b = loadIcon('italic');
    expect(a).to.equal(b);
    const [svgA, svgB] = await Promise.all([a, b]);
    expect(svgA).to.equal(svgB);
    expect(getIconSvg('italic')).to.equal(svgA);
  });

  it('returns the cached svg immediately on subsequent loadIcon calls', async() => {
    const first = await loadIcon('italic');
    const second = await loadIcon('italic');
    expect(second).to.equal(first);
  });

  it('resolves with null when loading an unknown icon name', async() => {
    const svg = await loadIcon('does-not-exist');
    expect(svg).to.equal(null);
  });

  it('rejects when the icon asset cannot be fetched', async() => {
    setIconBaseUrl('/definitely/not/where/icons/live/');
    await expect(loadIcon('bold')).rejects.toThrow(/bold/);
  });

  it('returns null for unknown icon names from getIconSvg', () => {
    expect(getIconSvg('does-not-exist')).to.equal(null);
  });

  it('fetches every discovered icon through loadAllIcons exactly once', async() => {
    await loadAllIcons();
    const names = iconNames();
    for (const name of names) {
      const svg = ICONS[name];
      expect(svg, `svg for ${name}`).to.be.a('string');
      expect(svg.charAt(0)).to.equal('<');
      expect(svg).to.contain('<svg');
      expect(svg).to.contain('</svg>');
    }
    expect(Object.keys(ICONS).length).to.equal(names.length);

    const previous = Object.keys(ICONS).length;
    await loadAllIcons();
    expect(Object.keys(ICONS).length).to.equal(previous);
  });

  it('returns the bundled svg by name after it has been loaded', async() => {
    await loadAllIcons();
    expect(getIconSvg('bold')).to.equal(ICONS.bold);
    expect(getIconSvg('italic')).to.equal(ICONS.italic);
  });
});