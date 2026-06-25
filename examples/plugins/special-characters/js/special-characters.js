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
 */

(function() {
  'use strict';

  const PLUGIN_NAME = 'specialCharacters';
  const BUTTON_NAME = 'specialCharacters';

  const DEFAULT_GROUPS = [
    {
      title: 'Currency',
      items: ['€', '£', '¥', '$', '¢', '₹', '₽', '₩', '฿', '₺', '₴', '₦'],
    },
    {
      title: 'Math',
      items: ['±', '×', '÷', '∞', '∑', '∏', '√', '∫', '∂', '∆', '≈', '≠', '≤', '≥', '≡', '∝'],
    },
    {
      title: 'Arrows',
      items: ['←', '→', '↑', '↓', '↔', '↕', '⇒', '⇔', '➔', '➜', '➞', '➲'],
    },
    {
      title: 'Greek',
      items: ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω', 'Α', 'Β', 'Γ', 'Δ', 'Θ', 'Λ', 'Π', 'Σ', 'Φ', 'Ω'],
    },
    {
      title: 'Symbols',
      items: ['©', '®', '™', '§', '¶', '†', '‡', '•', '…', '–', '—', '«', '»', '‘', '’', '“', '”', '¿', '¡', '°', 'µ'],
    },
  ];

  function buildMenuMarkup(groups) {
    return groups.map((group) => {
      const cells = group.items.map((symbol) => {
        return `<button type="button" class="sn-plugin-special-chars-cell" data-sn-special-char="${symbol}" tabindex="-1" aria-label="Insert ${symbol}">${symbol}</button>`;
      }).join('');
      return `<div class="sn-plugin-special-chars-group" role="group" aria-label="${group.title}"><div class="sn-plugin-special-chars-group-title">${group.title}</div><div class="sn-plugin-special-chars-grid">${cells}</div></div>`;
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
    }

    destroy() {
      this.close();
    }

    open() {
      const dropdown = this.findDropdown();
      if (!dropdown) {
        return;
      }
      this.bindDropdown(dropdown);
      this.context.invoke('toolbar.activate', true);
    }

    close() {
      const dropdown = this.findDropdown();
      if (!dropdown) {
        return;
      }
      this.context.invoke('toolbar.deactivate', true);
    }

    findDropdown() {
      const layout = this.context.layoutInfo;
      const groups = layout.toolbar.find('.sn-plugin-special-chars');
      if (!groups.length) {
        return null;
      }
      return groups.closest('.note-btn-group')[0];
    }

    bindDropdown(group) {
      if (!group || group.dataset.snBound === '1') {
        return;
      }
      const buttons = group.querySelectorAll('[data-sn-special-char]');
      buttons.forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          const symbol = button.dataset.snSpecialChar;
          this.insert(symbol);
          this.context.invoke('toolbar.deactivate', true);
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
    return ui.buttonGroup([
      ui.button({
        className: 'dropdown-toggle sn-plugin-special-chars-toggle',
        contents: ui.dropdownButtonContents(`<span class="sn-plugin-special-chars-glyph">Ω</span>`, context.options),
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

  function register() {
    const ns = (typeof window !== 'undefined' && window.summernote) || null;
    if (!ns || typeof ns.registerPlugin !== 'function') {
      return;
    }
    ns.registerPlugin(PLUGIN_NAME, SpecialCharactersPlugin, {
      stylesheets: [
        './css/special-characters.css',
      ],
      version: '1.0.0',
      buttons: {
        [BUTTON_NAME]: SpecialCharactersButton,
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