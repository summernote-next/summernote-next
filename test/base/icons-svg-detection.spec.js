import { describe, expect, it } from 'vitest';
import { __detectIconBaseUrl__, getIconBaseUrl, setIconBaseUrl } from '@/js/icons-svg.js';

describe('icons-svg detectIconBaseUrl', () => {
  it('falls back to the default icons path when no document-like host is available', () => {
    expect(__detectIconBaseUrl__(undefined)).to.equal('icons/');
    expect(__detectIconBaseUrl__(null)).to.equal('icons/');
  });

  it('falls back when the host object has no script discovery method', () => {
    expect(__detectIconBaseUrl__({})).to.equal('icons/');
  });

  it('derives the icon base url from a summernote-next.js script tag', () => {
    const host = {
      getElementsByTagName: () => ([
        { src: '' },
        { src: 'https://cdn.example.com/dist/summernote-next.js?v=42' },
      ]),
    };
    expect(__detectIconBaseUrl__(host)).to.equal('https://cdn.example.com/dist/icons/');
  });

  it('derives the icon base url from a summernote-next-classic.min.js script tag', () => {
    const host = {
      getElementsByTagName: () => ([
        { src: '' },
        { src: 'https://cdn.example.com/v2/summernote-next-classic.min.js' },
      ]),
    };
    expect(__detectIconBaseUrl__(host)).to.equal('https://cdn.example.com/v2/icons/');
  });

  it('ignores script tags that do not look like the bundled editor', () => {
    const host = {
      getElementsByTagName: () => ([
        { src: 'https://cdn.example.com/lib/jquery.js' },
        { src: 'https://cdn.example.com/lib/bootstrap.js' },
      ]),
    };
    expect(__detectIconBaseUrl__(host)).to.equal('icons/');
  });

  it('skips a script whose src ends with a slash before evaluating the filename', () => {
    const host = {
      getElementsByTagName: () => ([
        { src: 'https://cdn.example.com/dist/summernote-next.js' },
        { src: 'https://cdn.example.com/build/' },
      ]),
    };
    expect(__detectIconBaseUrl__(host)).to.equal('https://cdn.example.com/dist/icons/');
  });

  it('clears the icon base url when setIconBaseUrl receives an empty or falsy value', () => {
    setIconBaseUrl('');
    expect(getIconBaseUrl()).to.equal('');
    setIconBaseUrl(null);
    expect(getIconBaseUrl()).to.equal('');
    setIconBaseUrl(undefined);
    expect(getIconBaseUrl()).to.equal('');
  });
});