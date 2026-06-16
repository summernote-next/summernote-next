import $$ from '../core/dom-query.js';

const DARK_CLASS = 'note-editor-dark';
const LIGHT_CLASS = 'note-editor-light';
const SURFACE_SELECTORS = '.note-editor, .note-popover, .note-modal, .note-air-popover, .note-image-popover, .note-video-popover, .note-table-popover, .note-link-popover, .note-hint-popover';

function resolveDarkModeOption(value) {
  if (value === true) {
    return 'on';
  }

  if (value === false) {
    return 'off';
  }

  if (typeof value !== 'string') {
    return 'auto';
  }

  const normalized = value.trim().toLowerCase();

  if (['auto', 'on', 'off', 'system', 'media'].indexOf(normalized) !== -1) {
    return normalized;
  }

  if (normalized.startsWith('class:')) {
    const className = normalized.slice(6).trim();

    if (className) {
      return { kind: 'class', className: className };
    }
  }

  if (normalized.startsWith('selector:')) {
    const selector = normalized.slice(9).trim();

    if (selector) {
      return { kind: 'selector', selector: selector };
    }
  }

  return 'auto';
}

function isMediaDark() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function ancestorHasClass($node, className) {
  if (!$node || !$node.length) {
    return false;
  }

  const element = $node[0];

  if (typeof element.closest === 'function') {
    return !!element.closest('.' + className);
  }

  let current = element.parentElement;

  while (current) {
    if (current.classList && current.classList.contains(className)) {
      return true;
    }
    current = current.parentElement;
  }

  return false;
}

function ancestorMatchesSelector($node, selector) {
  if (!$node || !$node.length || typeof document === 'undefined') {
    return false;
  }

  const element = $node[0];

  if (typeof element.closest === 'function' && element.closest(selector)) {
    return true;
  }

  return false;
}

const PAGE_DARK_ATTRIBUTES = ['data-bs-theme', 'data-theme', 'data-mode', 'data-color-scheme', 'data-bs-color-scheme'];
const PAGE_DARK_CLASSES = ['dark', 'dark-mode', 'theme-dark'];

function hasExplicitPageTheme() {
  if (typeof document === 'undefined') {
    return null;
  }

  const html = document.documentElement;
  const body = document.body;

  for (let i = 0; i < PAGE_DARK_ATTRIBUTES.length; i++) {
    const attr = PAGE_DARK_ATTRIBUTES[i];
    const htmlValue = html && html.getAttribute(attr);
    const bodyValue = body && body.getAttribute(attr);

    if (htmlValue === 'dark' || bodyValue === 'dark') {
      return 'on';
    }

    if (htmlValue === 'light' || bodyValue === 'light') {
      return 'off';
    }
  }

  for (let i = 0; i < PAGE_DARK_CLASSES.length; i++) {
    const cls = PAGE_DARK_CLASSES[i];

    if ((html && html.classList.contains(cls)) || (body && body.classList.contains(cls))) {
      return 'on';
    }
  }

  for (let i = 0; i < PAGE_DARK_CLASSES.length; i++) {
    const cls = PAGE_DARK_CLASSES[i];
    const lightCls = cls === 'dark' ? 'light' : cls === 'dark-mode' ? 'light-mode' : 'theme-light';

    if ((html && html.classList.contains(lightCls)) || (body && body.classList.contains(lightCls))) {
      return 'off';
    }
  }

  return null;
}

function detectInitialMode(resolved, $editor) {
  if (resolved === 'on') {
    return 'on';
  }

  if (resolved === 'off') {
    return 'off';
  }

  if (resolved === 'media' || resolved === 'system') {
    return isMediaDark() ? 'on' : 'off';
  }

  if (resolved && resolved.kind === 'class') {
    return ancestorHasClass($editor, resolved.className) ? 'on' : 'off';
  }

  if (resolved && resolved.kind === 'selector') {
    return ancestorMatchesSelector($editor, resolved.selector) ? 'on' : 'off';
  }

  const pageTheme = hasExplicitPageTheme();

  if (pageTheme) {
    return pageTheme;
  }

  return 'auto';
}

function applyModeToNode($node, mode) {
  if (!$node || !$node.length) {
    return;
  }

  $node.removeClass(DARK_CLASS);
  $node.removeClass(LIGHT_CLASS);

  if (mode === 'on') {
    $node.addClass(DARK_CLASS);
  } else if (mode === 'off') {
    $node.addClass(LIGHT_CLASS);
  }
}

function applyModeToSurfaces(mode) {
  if (typeof document === 'undefined') {
    return;
  }

  const nodes = document.querySelectorAll(SURFACE_SELECTORS);
  nodes.forEach((node) => {
    applyModeToNode($$(node), mode);
  });
}

function watchNewSurfaces(callback) {
  if (typeof document === 'undefined' || typeof MutationObserver !== 'function') {
    return null;
  }

  const observer = new MutationObserver((mutations) => {
    for (let i = 0; i < mutations.length; i++) {
      const added = mutations[i].addedNodes;

      for (let j = 0; j < added.length; j++) {
        const node = added[j];

        if (!node || node.nodeType !== 1) {
          continue;
        }

        const matches = node.matches && node.matches(SURFACE_SELECTORS);

        if (matches) {
          callback($$(node));
        } else if (node.querySelectorAll) {
          const descendants = node.querySelectorAll(SURFACE_SELECTORS);
          descendants.forEach((descendant) => callback($$(descendant)));
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}

/**
 * @class Theme
 *
 * Resolves the editor's dark mode setting and applies matching surface classes.
 * The CSS in src/styles/classic/summernote-next-classic.scss already reacts to
 * common page-level signals (data-bs-theme="dark", data-theme, .dark class,
 * prefers-color-scheme, etc.). The Theme module only forces a mode or wires
 * a custom page-level signal that the CSS does not cover.
 */
export default class Theme {
  constructor(context) {
    this.context = context;
    this.options = context.options;
    this.$editor = context.layoutInfo.editor;
    this.resolved = resolveDarkModeOption(this.options.darkMode);
    this.currentMode = 'auto';
    this._mediaQueryList = null;
    this._mediaListener = null;
    this._surfaceObserver = null;
    this._documentObserver = null;
  }

  shouldInitialize() {
    return true;
  }

  initialize() {
    this.apply(this.resolved);

    if (this._needsMediaWatch()) {
      this._watchMedia();
    }

    if (this._needsClassWatch() || this.resolved === 'auto') {
      this._watchDocumentAttributes();
    }

    this._surfaceObserver = watchNewSurfaces(($node) => {
      applyModeToNode($node, this.currentMode);
    });
  }

  destroy() {
    this._unwatchMedia();
    this._unwatchDocumentAttributes();

    if (this._surfaceObserver) {
      this._surfaceObserver.disconnect();
      this._surfaceObserver = null;
    }
  }

  apply(resolvedMode) {
    const target = resolvedMode || this.resolved;
    const mode = detectInitialMode(target, this.$editor);
    this.currentMode = mode;

    if (mode === 'on') {
      applyModeToNode(this.$editor, 'on');
      applyModeToSurfaces('on');
    } else if (mode === 'off') {
      applyModeToNode(this.$editor, 'off');
      applyModeToSurfaces('off');
    } else {
      applyModeToNode(this.$editor, 'auto');
    }
  }

  setMode(mode) {
    const normalized = (typeof mode === 'string') ? mode.trim().toLowerCase() : '';
    const resolved = resolveDarkModeOption(normalized);
    this.resolved = resolved;
    this._unwatchMedia();
    this._unwatchDocumentAttributes();
    this.apply(resolved);

    if (this._needsMediaWatch()) {
      this._watchMedia();
    }

    if (this._needsClassWatch() || this.resolved === 'auto') {
      this._watchDocumentAttributes();
    }
  }

  _needsMediaWatch() {
    return this.resolved === 'media' || this.resolved === 'system';
  }

  _needsClassWatch() {
    return !!(this.resolved && (this.resolved.kind === 'class' || this.resolved.kind === 'selector'));
  }

  _watchMedia() {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    this._unwatchMedia();
    this._mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    this._mediaListener = (event) => {
      this.apply(event.matches ? 'on' : 'off');
    };

    if (typeof this._mediaQueryList.addEventListener === 'function') {
      this._mediaQueryList.addEventListener('change', this._mediaListener);
    } else if (typeof this._mediaQueryList.addListener === 'function') {
      this._mediaQueryList.addListener(this._mediaListener);
    }
  }

  _unwatchMedia() {
    if (!this._mediaQueryList || !this._mediaListener) {
      this._mediaQueryList = null;
      this._mediaListener = null;
      return;
    }

    if (typeof this._mediaQueryList.removeEventListener === 'function') {
      this._mediaQueryList.removeEventListener('change', this._mediaListener);
    } else if (typeof this._mediaQueryList.removeListener === 'function') {
      this._mediaQueryList.removeListener(this._mediaListener);
    }

    this._mediaQueryList = null;
    this._mediaListener = null;
  }

  _watchDocumentAttributes() {
    if (typeof document === 'undefined' || typeof MutationObserver !== 'function') {
      return;
    }

    this._unwatchDocumentAttributes();
    this._documentObserver = new MutationObserver(() => this.apply(this.resolved));
    this._documentObserver.observe(document.documentElement, {
      attributes: true,
    });
    this._documentObserver.observe(document.body, {
      attributes: true,
    });
  }

  _unwatchDocumentAttributes() {
    if (this._documentObserver) {
      this._documentObserver.disconnect();
      this._documentObserver = null;
    }
  }
}
