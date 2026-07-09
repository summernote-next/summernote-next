/**
 * Summernote Next - Word Counter Plugin
 *
 * Adds a real-time word and character counter overlay to the editor status area.
 * The plugin owns its CSS, JavaScript, and toolbar button registration.
 *
 * Public API:
 *   - summernote.registerPlugin('wordCounter', WordCounterPlugin, { ... })
 *   - summernote.invoke(target, 'wordCounter.refresh')
 *   - summernote.invoke(target, 'wordCounter.stats')
 *
 * Toolbar:
 *   - 'wordCounterToggle' — toggles the inline counter badge inside the status bar
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

  const PLUGIN_NAME = 'wordCounter';
  const TOGGLE_BUTTON = 'wordCounterToggle';

  function countWords(text) {
    if (!text) {
      return 0;
    }
    const trimmed = text.replace(/<[^>]*>/g, ' ').trim();
    if (!trimmed) {
      return 0;
    }
    return trimmed.split(/\s+/).length;
  }

  function countCharacters(text) {
    if (!text) {
      return 0;
    }
    return text.replace(/<[^>]*>/g, '').length;
  }

  class WordCounterPlugin {
    constructor(context) {
      this.context = context;
      this.options = context.options;
      this.lang = this.options.langInfo;
      this.ui = context.ui;
      this.visible = true;

      this.handleChange = this.handleChange.bind(this);
    }

    shouldInitialize() {
      return true;
    }

    initialize() {
      const layout = this.context.layoutInfo;
      this.$statusbar = layout.statusbar;
      this.$editable = layout.editable;

      this.badge = document.createElement('div');
      this.badge.className = 'sn-plugin-word-counter badge text-bg-secondary';
      this.badge.setAttribute('data-sn-word-counter', '');
      this.badge.setAttribute('role', 'status');
      this.badge.setAttribute('aria-live', 'polite');
      this.$statusbar[0].appendChild(this.badge);

      this.events = {
        'summernote.change summernote.keyup summernote.mouseup summernote.paste': this.handleChange,
      };

      this.refresh();
    }

    destroy() {
      if (this.badge && this.badge.parentNode) {
        this.badge.parentNode.removeChild(this.badge);
      }
      this.badge = null;
    }

    handleChange() {
      this.refresh();
    }

    toggle(forceState) {
      if (!this.badge) {
        return this.visible;
      }

      const next = typeof forceState === 'boolean'
        ? forceState
        : !this.visible;

      this.visible = next;
      this.badge.classList.toggle('d-none', !next);
      this.context.invoke('buttons.updateCurrentStyle');
      return this.visible;
    }

    refresh() {
      if (!this.badge) {
        return;
      }
      const html = this.context.invoke('code');
      const words = countWords(html);
      const characters = countCharacters(html);
      const wordsLabel = (this.lang && this.lang.options && this.lang.options.wordCount) || 'Words';
      const charsLabel = (this.lang && this.lang.options && this.lang.options.characterCount) || 'Characters';
      this.badge.textContent = `${words} ${wordsLabel} · ${characters} ${charsLabel}`;
      this.badge.dataset.snWords = String(words);
      this.badge.dataset.snCharacters = String(characters);
    }

    stats() {
      const html = this.context.invoke('code');
      return {
        words: countWords(html),
        characters: countCharacters(html),
        visible: this.visible,
      };
    }

    static buttonFactory(context) {
      const ui = context.ui;
      const lang = context.options.langInfo;
      const label = (lang && lang.options && lang.options.wordCounter) || 'Word counter';
      return ui.button({
        className: 'note-btn-word-counter',
        contents: '<span class="sn-plugin-word-counter-icon" aria-hidden="true">123</span>',
        tooltip: label,
        click(event) {
          event.preventDefault();
          context.invoke('wordCounter.toggle');
        },
      }).render();
    }
  }

  WordCounterPlugin.buttonName = TOGGLE_BUTTON;

  function register() {
    const ns = (typeof window !== 'undefined' && window.summernote) || null;
    if (!ns || typeof ns.registerPlugin !== 'function') {
      return;
    }
    ns.registerPlugin(PLUGIN_NAME, WordCounterPlugin, {
      stylesheets: [
        pluginAssetUrl('./css/word-counter.css'),
      ],
      version: '1.0.0',
      buttons: {
        [TOGGLE_BUTTON]: WordCounterPlugin.buttonFactory,
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
    module.exports = { WordCounterPlugin, register };
  }
})();