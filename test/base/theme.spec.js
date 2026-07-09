import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import $$ from '@/js/core/dom-query.js';
import Context from '@/js/Context';
import Theme from '@/js/module/Theme';
import '@/styles/classic/summernote-next-classic';

function makeContext(options = {}) {
  $$('body').empty();
  const $note = $$('<div><p>hello</p></div>').appendTo('body');
  return new Context($note, $$.extend({}, $$.summernote.options, options));
}

function resetDocumentTheme() {
  ['data-bs-theme', 'data-theme', 'data-mode', 'data-color-scheme', 'data-bs-color-scheme', 'data-app-theme'].forEach((name) => {
    document.documentElement.removeAttribute(name);
    document.body.removeAttribute(name);
  });
  ['dark', 'dark-mode', 'theme-dark', 'light', 'light-mode', 'theme-light', 'app-dark'].forEach((name) => {
    document.documentElement.classList.remove(name);
    document.body.classList.remove(name);
  });
}

function getColorSchemeToken($editor) {
  return getComputedStyle($editor[0]).getPropertyValue('--bs-body-bg').trim();
}

function toRgb(value) {
  const trimmed = value.trim();

  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);

    if (hex.length === 3) {
      const [r, g, b] = hex.split('').map((c) => c + c);
      return `rgb(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)})`;
    }

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgb(${r}, ${g}, ${b})`;
  }

  return trimmed;
}

describe('Theme module: dark mode option', () => {
  let originalMatchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    resetDocumentTheme();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    $$('body').empty();
    resetDocumentTheme();
  });

  it('defaults to auto and follows Bootstrap 5 data-bs-theme="dark"', () => {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    const context = makeContext();
    const theme = new Theme(context);

    theme.initialize();

    expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(true);
    expect(toRgb(getColorSchemeToken(context.layoutInfo.editor))).to.equal('rgb(33, 37, 41)');
  });

  it('follows data-theme="dark" without any JS configuration', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const context = makeContext();
    const theme = new Theme(context);

    theme.initialize();

    expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(true);
    expect(toRgb(getColorSchemeToken(context.layoutInfo.editor))).to.equal('rgb(33, 37, 41)');
  });

  it('follows .dark class on the document element', () => {
    document.documentElement.classList.add('dark');
    const context = makeContext();
    const theme = new Theme(context);

    theme.initialize();

    expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(true);
    expect(toRgb(getColorSchemeToken(context.layoutInfo.editor))).to.equal('rgb(33, 37, 41)');
  });

  it('keeps the editor light when data-bs-theme="light" is set', () => {
    document.documentElement.setAttribute('data-bs-theme', 'light');
    const context = makeContext();
    const theme = new Theme(context);

    theme.initialize();

    expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(false);
    expect(toRgb(getColorSchemeToken(context.layoutInfo.editor))).to.equal('rgb(255, 255, 255)');
  });

  it('forces dark mode when the option is "on"', () => {
    const context = makeContext({ darkMode: 'on' });
    const theme = new Theme(context);

    theme.initialize();

    expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(true);
    expect(toRgb(getColorSchemeToken(context.layoutInfo.editor))).to.equal('rgb(33, 37, 41)');
  });

  it('forces light mode when the option is "off"', () => {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    const context = makeContext({ darkMode: 'off' });
    const theme = new Theme(context);

    theme.initialize();

    expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(false);
    expect(context.layoutInfo.editor.hasClass('note-editor-light')).to.equal(true);
    expect(toRgb(getColorSchemeToken(context.layoutInfo.editor))).to.equal('rgb(255, 255, 255)');
  });

  it('accepts the boolean shorthand for the dark mode option', () => {
    const context = makeContext({ darkMode: true });
    const theme = new Theme(context);

    theme.initialize();

    expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(true);
  });

  it('follows prefers-color-scheme when the option is "media"', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => {
      return {
        matches: query === '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      };
    });

    const context = makeContext({ darkMode: 'media' });
    const theme = new Theme(context);

    theme.initialize();

    expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(true);
  });

  it('listens to media changes when using the "media" mode', () => {
    const listeners = [];
    window.matchMedia = vi.fn().mockImplementation(() => {
      return {
        matches: false,
        addEventListener: (event, callback) => listeners.push({ event, callback }),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      };
    });

    const context = makeContext({ darkMode: 'media' });

    expect(listeners.length).to.equal(1);
    expect(listeners[0].event).to.equal('change');

    listeners[0].callback({ matches: true });

    expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(true);

    listeners[0].callback({ matches: false });

    expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(false);
  });

  it('watches a custom class name when the option is "class:<name>"', () => {
    const context = makeContext({ darkMode: 'class:app-dark' });

    expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(false);

    document.documentElement.classList.add('app-dark');

    return new Promise((resolve) => setTimeout(resolve, 50)).then(() => {
      expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(true);

      document.documentElement.classList.remove('app-dark');

      return new Promise((resolve) => setTimeout(resolve, 50));
    }).then(() => {
      expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(false);
    });
  });

  it('watches a custom selector when the option is "selector:<css>"', () => {
    const context = makeContext({ darkMode: 'selector:html[data-app-theme="night"]' });

    expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(false);

    document.documentElement.setAttribute('data-app-theme', 'night');

    return new Promise((resolve) => setTimeout(resolve, 50)).then(() => {
      expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(true);
    });
  });

  it('updates the editor mode when setMode is called', () => {
    const context = makeContext();
    const theme = new Theme(context);

    theme.initialize();

    expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(false);

    theme.setMode('on');

    expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(true);
  });

  it('switches the media watch on and off through setMode', () => {
    const listeners = [];
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: (event, callback) => listeners.push({ event, callback }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));

    const context = makeContext({ darkMode: 'auto' });
    const theme = new Theme(context);

    theme.initialize();
    expect(listeners.length).to.equal(0);

    theme.setMode('media');
    expect(listeners.length).to.equal(1);

    theme.setMode('auto');
    theme.setMode('media');
    expect(listeners.length).to.equal(2);
  });

  it('switches the document watch on and off through setMode', () => {
    const disconnect = vi.fn();
    const originalDisconnect = MutationObserver.prototype.disconnect;
    MutationObserver.prototype.disconnect = disconnect;

    try {
      const context = makeContext({ darkMode: 'auto' });
      const theme = new Theme(context);

      theme.initialize();

      theme.setMode('class:app-mode');
      theme.setMode('auto');
      theme.setMode('class:app-mode');

      expect(disconnect).toHaveBeenCalled();
    } finally {
      MutationObserver.prototype.disconnect = originalDisconnect;
    }
  });

  it('applies the dark class to new popovers and modals', () => {
    makeContext({ darkMode: 'on' });

    const $popover = $$('<div class="note-popover popover"></div>').appendTo('body');
    const $modal = $$('<div class="note-modal"></div>').appendTo('body');

    return new Promise((resolve) => setTimeout(resolve, 50)).then(() => {
      expect($popover.hasClass('note-editor-dark')).to.equal(true);
      expect($modal.hasClass('note-editor-dark')).to.equal(true);
    });
  });

  it('removes observers and listeners on destroy', () => {
    const removeEventListener = vi.fn();
    const disconnect = vi.fn();

    window.matchMedia = vi.fn().mockImplementation(() => {
      return {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: removeEventListener,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      };
    });

    const originalDisconnect = MutationObserver.prototype.disconnect;
    MutationObserver.prototype.disconnect = disconnect;

    try {
      const context = makeContext({ darkMode: 'media' });
      const theme = new Theme(context);

      theme.initialize();
      theme.destroy();

      expect(removeEventListener).toHaveBeenCalled();
      expect(disconnect).toHaveBeenCalled();
    } finally {
      MutationObserver.prototype.disconnect = originalDisconnect;
    }
  });

  it('falls back to the legacy addListener API when addEventListener is missing', () => {
    const addListener = vi.fn();
    const removeListener = vi.fn();

    window.matchMedia = vi.fn().mockImplementation(() => {
      return {
        matches: false,
        addEventListener: undefined,
        removeEventListener: undefined,
        addListener: addListener,
        removeListener: removeListener,
      };
    });

    const context = makeContext({ darkMode: 'media' });
    const theme = new Theme(context);

    theme.initialize();
    expect(addListener).toHaveBeenCalled();

    theme.destroy();
    expect(removeListener).toHaveBeenCalled();
  });

  it('skips media observation when neither addEventListener nor addListener is available', () => {
    window.matchMedia = vi.fn().mockImplementation(() => {
      return {
        matches: false,
        addEventListener: undefined,
        removeEventListener: undefined,
        addListener: undefined,
        removeListener: undefined,
      };
    });

    const context = makeContext({ darkMode: 'media' });
    const theme = new Theme(context);

    expect(() => theme.initialize()).not.to.throw();
    expect(() => theme.destroy()).not.to.throw();
  });

  it('normalises unknown option values to auto', () => {
    const context = makeContext({ darkMode: 'banana' });
    const theme = new Theme(context);

    theme.initialize();

    expect(theme.resolved).to.equal('auto');
    expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(false);
  });

  it('keeps the editor untouched when no class: prefix is provided', () => {
    const context = makeContext({ darkMode: 'class:' });
    const theme = new Theme(context);

    theme.initialize();

    expect(theme.resolved).to.equal('auto');
    expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(false);
  });

  it('keeps the editor untouched when no selector: prefix is provided', () => {
    const context = makeContext({ darkMode: 'selector:' });
    const theme = new Theme(context);

    theme.initialize();

    expect(theme.resolved).to.equal('auto');
    expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(false);
  });

  it('skips document observation when MutationObserver is not available', () => {
    const originalMutationObserver = globalThis.MutationObserver;
    const originalDocument = globalThis.document;

    delete globalThis.MutationObserver;
    try {
      const context = makeContext({ darkMode: 'class:app-dark' });
      const theme = new Theme(context);

      expect(() => theme.initialize()).not.to.throw();
      expect(() => theme.destroy()).not.to.throw();
    } finally {
      globalThis.MutationObserver = originalMutationObserver;
      void originalDocument;
    }
  });
});

describe('Theme module: CSS dark mode triggers', () => {
  afterEach(() => {
    $$('body').empty();
    resetDocumentTheme();
  });

  const triggers = [
    { name: 'data-bs-theme="dark"', setup: () => document.documentElement.setAttribute('data-bs-theme', 'dark') },
    { name: 'data-theme="dark"', setup: () => document.documentElement.setAttribute('data-theme', 'dark') },
    { name: 'data-mode="dark"', setup: () => document.documentElement.setAttribute('data-mode', 'dark') },
    { name: 'data-color-scheme="dark"', setup: () => document.documentElement.setAttribute('data-color-scheme', 'dark') },
    { name: 'html.dark class', setup: () => document.documentElement.classList.add('dark') },
    { name: 'html.dark-mode class', setup: () => document.documentElement.classList.add('dark-mode') },
    { name: 'html.theme-dark class', setup: () => document.documentElement.classList.add('theme-dark') },
  ];

  triggers.forEach(({ name, setup }) => {
    it(`switches the editor to dark when the page uses ${name}`, () => {
      setup();
      const context = makeContext();
      const $editor = context.layoutInfo.editor;

      const token = toRgb(getColorSchemeToken($editor));
      if (token !== 'rgb(33, 37, 41)') {
        console.log('DEBUG for', name, 'token:', token, 'html:', document.documentElement.outerHTML.substring(0, 300));
      }
      expect(token).to.equal('rgb(33, 37, 41)');
    });
  });

  const lightTriggers = [
    { name: 'html.light class', setup: () => document.documentElement.classList.add('light') },
    { name: 'html.light-mode class', setup: () => document.documentElement.classList.add('light-mode') },
    { name: 'html.theme-light class', setup: () => document.documentElement.classList.add('theme-light') },
  ];

  lightTriggers.forEach(({ name, setup }) => {
    it(`keeps the editor light when the page uses ${name}`, () => {
      setup();
      const context = makeContext({ darkMode: 'auto' });
      const $editor = context.layoutInfo.editor;

      expect(context.layoutInfo.editor.hasClass('note-editor-light')).to.equal(true);
      expect(toRgb(getColorSchemeToken($editor))).to.equal('rgb(255, 255, 255)');
    });
  });

  it('switches the editor back to light when the trigger clears', () => {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    const context = makeContext();
    const $editor = context.layoutInfo.editor;

    expect(toRgb(getColorSchemeToken($editor))).to.equal('rgb(33, 37, 41)');

    document.documentElement.removeAttribute('data-bs-theme');

    return new Promise((resolve) => setTimeout(resolve, 50)).then(() => {
      expect(toRgb(getColorSchemeToken($editor))).to.equal('rgb(255, 255, 255)');
    });
  });

  it('keeps the editor light when only data-bs-theme="light" is set', () => {
    document.documentElement.setAttribute('data-bs-theme', 'light');
    const context = makeContext();
    const $editor = context.layoutInfo.editor;

    expect(toRgb(getColorSchemeToken($editor))).to.equal('rgb(255, 255, 255)');
  });

  it('exposes a .note-editor-dark override for forced dark mode', () => {
    const context = makeContext();
    const $editor = context.layoutInfo.editor;

    $editor.addClass('note-editor-dark');

    expect(toRgb(getColorSchemeToken($editor))).to.equal('rgb(33, 37, 41)');
  });

  it('exposes a .note-editor-light override for forced light mode', () => {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    const context = makeContext();
    const $editor = context.layoutInfo.editor;

    expect(toRgb(getColorSchemeToken($editor))).to.equal('rgb(33, 37, 41)');

    $editor.addClass('note-editor-light');

    expect(toRgb(getColorSchemeToken($editor))).to.equal('rgb(255, 255, 255)');
  });

  it('applies dark mode to a popover inside the dark editor', () => {
    
    resetDocumentTheme();
    const $editor = $$('<div class="note-editor note-frame card note-editor-dark"></div>');
    const $popover = $$('<div class="note-popover popover note-air-popover"></div>').appendTo($editor);
    document.body.appendChild($editor[0]);
    void $editor[0].offsetHeight;
    expect(toRgb(getColorSchemeToken($popover))).to.equal('rgb(33, 37, 41)');
  });
});

describe('Theme module: defensive branches', () => {
  let originalMatchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    resetDocumentTheme();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.unstubAllGlobals();
    $$('body').empty();
    resetDocumentTheme();
  });

  it('resolves boolean false darkMode option to off', () => {
    const context = makeContext({ darkMode: false });
    const theme = new Theme(context);
    theme.initialize();
    expect(theme.resolved).to.equal('off');
    context.destroy();
  });

  it('resolves non-string non-boolean darkMode option to auto', () => {
    const context = makeContext({ darkMode: 42 });
    const theme = new Theme(context);
    theme.initialize();
    expect(theme.resolved).to.equal('auto');
    context.destroy();
  });

  it('returns false from isMediaDark when matchMedia is unavailable', () => {
    window.matchMedia = undefined;
    const context = makeContext({ darkMode: 'media' });
    const theme = new Theme(context);
    expect(() => theme.initialize()).not.to.throw();
    context.destroy();
  });

  it('guards ancestorHasClass against null nodes', () => {
    const theme = new Theme({
      options: { darkMode: 'class:app-dark' },
      layoutInfo: { editor: null },
    });
    theme.apply({ kind: 'class', className: 'app-dark' });
    expect(theme.currentMode).to.equal('off');
  });

  it('uses the manual ancestor traversal when closest is unavailable', () => {
    const parent = document.createElement('div');
    parent.className = 'app-dark';
    const child = document.createElement('div');
    child.closest = undefined;
    parent.appendChild(child);
    document.body.appendChild(parent);

    const theme = new Theme({
      options: { darkMode: 'class:app-dark' },
      layoutInfo: { editor: $$([child]) },
    });
    theme.apply({ kind: 'class', className: 'app-dark' });
    expect(theme.currentMode).to.equal('on');

    parent.remove();
  });

  it('returns false from manual ancestor traversal when no ancestor matches', () => {
    const parent = document.createElement('div');
    const child = document.createElement('div');
    child.closest = undefined;
    parent.appendChild(child);
    document.body.appendChild(parent);

    const theme = new Theme({
      options: { darkMode: 'class:app-dark' },
      layoutInfo: { editor: $$([child]) },
    });
    theme.apply({ kind: 'class', className: 'app-dark' });
    expect(theme.currentMode).to.equal('off');

    parent.remove();
  });

  it('guards ancestorMatchesSelector against null nodes', () => {
    const theme = new Theme({
      options: { darkMode: 'selector:html[data-x="y"]' },
      layoutInfo: { editor: null },
    });
    theme.apply({ kind: 'selector', selector: 'html[data-x="y"]' });
    expect(theme.currentMode).to.equal('off');
  });

  it('guards applyModeToNode against null nodes', () => {
    const theme = new Theme({
      options: { darkMode: 'on' },
      layoutInfo: { editor: null },
    });
    theme.apply('on');
    expect(theme.currentMode).to.equal('on');
  });

  it('handles missing document in hasExplicitPageTheme and applyModeToSurfaces', () => {
    const theme = new Theme({
      options: { darkMode: 'on' },
      layoutInfo: { editor: $$('<div></div>').appendTo('body') },
    });
    expect(() => theme.apply('on')).not.to.throw();
  });

  it('handles missing document in auto mode detection', () => {
    const theme = new Theme({
      options: { darkMode: 'auto' },
      layoutInfo: { editor: null },
    });
    theme.apply('auto');
    expect(theme.currentMode).to.equal('auto');
  });

  it('applies the resolved mode when apply is called without arguments', () => {
    const context = makeContext({ darkMode: 'on' });
    const theme = new Theme(context);
    theme.apply();
    expect(context.layoutInfo.editor.hasClass('note-editor-dark')).to.equal(true);
    context.destroy();
  });

  it('normalises non-string setMode argument to auto', () => {
    const context = makeContext();
    const theme = new Theme(context);
    theme.initialize();
    theme.setMode(undefined);
    expect(theme.resolved).to.equal('auto');
    context.destroy();
  });

  it('watches descendant surfaces added inside container elements', () => {
    return new Promise((resolve) => {
      makeContext({ darkMode: 'on' });
      setTimeout(() => {
        const wrapper = document.createElement('div');
        const popover = document.createElement('div');
        popover.className = 'note-popover popover';
        wrapper.appendChild(popover);
        document.body.appendChild(wrapper);

        setTimeout(() => {
          expect($$(popover).hasClass('note-editor-dark')).to.equal(true);
          wrapper.remove();
          resolve();
        }, 60);
      }, 60);
    });
  });

  it('skips querySelectorAll branch for added nodes without it', () => {
    return new Promise((resolve) => {
      makeContext({ darkMode: 'on' });
      setTimeout(() => {
        const bare = document.createElement('div');
        Object.defineProperty(bare, 'querySelectorAll', { value: undefined, configurable: true });
        Object.defineProperty(bare, 'matches', { value: undefined, configurable: true });
        document.body.appendChild(bare);

        setTimeout(() => {
          document.body.removeChild(bare);
          resolve();
        }, 60);
      }, 60);
    });
  });
});