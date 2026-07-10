/**
 * Summernote Next - Special Characters Plugin
 *
 * Adds a dropdown picker of common special characters (currency, math, arrows,
 * punctuation, Greek letters) to the toolbar.
 *
 * Public API:
 *   - summernote.invoke(target, 'specialCharacters.insert', '©')
 *   - summernote.invoke(target, 'specialCharacters.open')
 *   - summernote.invoke(target, 'specialCharacters.close')
 *
 * Toolbar:
 *   - 'specialCharacters'
 *
 * Button style options (via `plugins.buttonStyle`):
 *   - 'svg' (default): small SVG icon button
 *   - 'text': compact uppercase label, same height as the SVG variant
 */

(function() {
  'use strict';

  function pluginAssetUrl(relativePath) {
    const script = document.currentScript;
    if (script && script.src) {
      const base = script.src.replace(/js\/[^/]*$/, '');
      return new URL(relativePath.replace(/^\.?\//, ''), base).href;
    }
    return relativePath;
  }

  const PLUGIN_NAME = 'specialCharacters';
  const BUTTON_NAME = 'specialCharacters';
  const HELPERS_URL = '../../assets/plugin-button-helpers.js';

  const DEFAULT_GROUPS = [
    {
      title: 'Currency',
      icon: 'currency',
      items: ['€', '£', '¥', '$', '¢', '₹', '₽', '₩', '฿', '₺', '₴', '₦'],
    },
    {
      title: 'Math',
      icon: 'math',
      items: ['±', '×', '÷', '∞', '∑', '∏', '√', '∫', '∂', '∆', '≈', '≠', '≤', '≥', '≡', '∝'],
    },
    {
      title: 'Arrows',
      icon: 'arrows',
      items: ['←', '→', '↑', '↓', '↔', '↕', '⇒', '⇔', '➔', '➜', '➞', '➲'],
    },
    {
      title: 'Greek',
      icon: 'greek',
      items: ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω', 'Α', 'Β', 'Γ', 'Δ', 'Θ', 'Λ', 'Π', 'Σ', 'Φ', 'Ω'],
    },
    {
      title: 'Symbols',
      icon: 'symbols',
      items: ['©', '®', '™', '§', '¶', '†', '‡', '•', '…', '–', '—', '«', '»', '‘', '’', '“', '”', '¿', '¡', '°', 'µ'],
    },
  ];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildIconMarkup(name) {
    if (!name || typeof window === 'undefined' || !window.summernote || typeof window.summernote.ui !== 'object') {
      return '';
    }
    try {
      const ui = window.summernote.ui;
      if (ui && typeof ui.icon === 'function') {
        return ui.icon('note-icon-' + name);
      }
    } catch (err) {
      return '';
    }
    return '';
  }

  function buildMenuMarkup(groups) {
    return groups.map((group) => {
      const cells = group.items.map((symbol) => {
        return `<button type="button" class="sn-plugin-special-chars-cell" data-sn-special-char="${escapeHtml(symbol)}" tabindex="-1" aria-label="Insert ${escapeHtml(symbol)}"><span class="sn-plugin-special-chars-cell-glyph">${escapeHtml(symbol)}</span></button>`;
      }).join('');
      const iconMarkup = buildIconMarkup(group.icon);
      return `<div class="sn-plugin-special-chars-group" role="group" aria-label="${escapeHtml(group.title)}"><div class="sn-plugin-special-chars-group-title">${iconMarkup}<span>${escapeHtml(group.title)}</span></div><div class="sn-plugin-special-chars-grid">${cells}</div></div>`;
    }).join('');
  }

  class SpecialCharactersPlugin {
    constructor(context) {
      this.context = context;
      this.options = context.options;
      this.lang = context.options.langInfo;
      this.ui = context.ui;
    }

    shouldInitialize() {
      return true;
    }

    initialize() {
      this.events = {};
      this.bindDropdown();
    }

    destroy() {
      this.close();
    }

    open() {
      this.bindDropdown();
    }

    close() {}

    findDropdown() {
      const layout = this.context.layoutInfo;
      const groups = layout.toolbar.find('.sn-plugin-special-chars');
      if (!groups.length) {
        return null;
      }
      return groups.closest('.note-btn-group')[0];
    }

    bindDropdown() {
      const group = this.findDropdown();
      if (!group || group.dataset.snBound === '1') {
        return;
      }
      const buttons = group.querySelectorAll('[data-sn-special-char]');
      buttons.forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          const symbol = button.dataset.snSpecialChar;
          this.insert(symbol);
        });
      });
      group.dataset.snBound = '1';
    }

    insert(symbol) {
      if (!symbol) {
        return;
      }
      this.context.invoke('editor.focus');
      this.context.invoke('editor.insertText', symbol);
    }
  }

  function SpecialCharactersButton(context) {
    const ui = context.ui;
    const lang = context.options.langInfo;
    const label = (lang && lang.options && lang.options.specialCharacters) || 'Special characters';
    const groups = context.options.specialCharactersGroups || DEFAULT_GROUPS;
    const pluginUi = window.summernote && window.summernote.pluginUi;
    const requestedStyle = context.options && context.options.buttonStyle;
    const style = pluginUi && pluginUi.normalizeStyle
      ? pluginUi.normalizeStyle(requestedStyle)
      : 'svg';

    let innerContent;
    if (style === 'text') {
      innerContent = pluginUi ? pluginUi.textLabel('Sym') : ui.icon('note-icon-special-character');
    } else if (style === 'glyph') {
      innerContent = pluginUi ? pluginUi.glyphSpan('Ω') : ui.icon('note-icon-special-character');
    } else {
      innerContent = ui.icon('note-icon-special-character');
    }

    return ui.buttonGroup([
      ui.button({
        className: `dropdown-toggle sn-plugin-special-chars-toggle sn-plugin-button-${style}-mode`,
        contents: ui.dropdownButtonContents(innerContent, context.options),
        tooltip: label,
        data: {
          toggle: 'dropdown',
        },
      }),
      ui.dropdown({
        className: 'sn-plugin-special-chars',
        title: label,
        items: buildMenuMarkup(groups),
      }),
    ]).render();
  }

  function ensureHelpersLoaded(callback) {
    if (typeof window === 'undefined') {
      callback();
      return;
    }
    if (window.summernote && window.summernote.pluginUi) {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.src = HELPERS_URL;
    script.dataset.snPluginHelpers = 'special-characters';
    script.onload = () => callback();
    script.onerror = () => callback();
    document.head.appendChild(script);
  }

  function register() {
    const ns = (typeof window !== 'undefined' && window.summernote) || null;
    if (!ns || typeof ns.registerPlugin !== 'function') {
      return;
    }
    ns.registerPlugin(PLUGIN_NAME, SpecialCharactersPlugin, {
      stylesheets: [
        pluginAssetUrl('./css/special-characters.css'),
      ],
      version: '1.0.0',
      buttons: {
        [BUTTON_NAME]: function Button(context) {
          const render = () => SpecialCharactersButton(context);
          if (window.summernote && window.summernote.pluginUi) {
            return render();
          }
          const wrapper = document.createElement('span');
          wrapper.dataset.snPluginPending = 'specialCharacters';
          ensureHelpersLoaded(() => {
            const node = render();
            if (wrapper.parentNode) {
              wrapper.parentNode.replaceChild(node, wrapper);
            }
          });
          return wrapper.outerHTML;
        },
      },
    });
  }

  if (typeof window !== 'undefined') {
    if (window.summernote && typeof window.summernote.registerPlugin === 'function') {
      register();
    } else {
      window.addEventListener('DOMContentLoaded', register, { once: true });
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpecialCharactersPlugin, register, DEFAULT_GROUPS };
  }
})();