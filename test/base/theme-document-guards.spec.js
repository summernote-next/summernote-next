import { afterEach, describe, expect, it, vi } from 'vitest';
import env from '@/js/core/env.js';
import Theme from '@/js/module/Theme';

describe('Theme module: document-unavailable guards', () => {
  let hasDocumentSpy;

  afterEach(() => {
    if (hasDocumentSpy) {
      hasDocumentSpy.mockRestore();
    }
  });

  it('returns auto when document is unavailable in auto mode', () => {
    hasDocumentSpy = vi.spyOn(env, 'hasDocument').mockReturnValue(false);

    const theme = new Theme({
      options: { darkMode: 'auto' },
      layoutInfo: { editor: null },
    });
    theme.apply('auto');
    expect(theme.currentMode).to.equal('auto');
  });

  it('skips surface updates when document is unavailable in forced mode', () => {
    hasDocumentSpy = vi.spyOn(env, 'hasDocument').mockReturnValue(false);

    const theme = new Theme({
      options: { darkMode: 'on' },
      layoutInfo: { editor: null },
    });
    expect(() => theme.apply('on')).not.to.throw();
    expect(theme.currentMode).to.equal('on');
  });

  it('returns null surface observer when document is unavailable', () => {
    hasDocumentSpy = vi.spyOn(env, 'hasDocument').mockReturnValue(false);

    const theme = new Theme({
      options: { darkMode: 'on' },
      layoutInfo: { editor: null },
    });
    theme.initialize();
    expect(theme._surfaceObserver).to.equal(null);
    theme.destroy();
  });

  it('skips document attribute watching when document is unavailable', () => {
    hasDocumentSpy = vi.spyOn(env, 'hasDocument').mockReturnValue(false);

    const theme = new Theme({
      options: { darkMode: 'auto' },
      layoutInfo: { editor: null },
    });
    theme.initialize();
    expect(theme._documentObserver).to.equal(null);
    theme.destroy();
  });
});
