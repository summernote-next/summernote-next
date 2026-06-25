/**
 * Summernote Next - Text Styles Plugin
 *
 * Adds inline text-style commands (mark, inline code, keyboard, variable, sample)
 * to the toolbar. The plugin owns its CSS, JavaScript, and button factory.
 *
 * Public API:
 *   - summernote.invoke(target, 'textStyles.toggle', 'mark')
 *
 * Toolbar:
 *   - 'markText', 'inlineCode', 'kbdText', 'varText', 'sampleText'
 */

(function() {
  'use strict';

  const PLUGIN_NAME = 'textStyles';

  const STYLES = {
    markText: { tag: 'mark', label: 'Mark' },
    inlineCode: { tag: 'code', label: 'Inline code' },
    kbdText: { tag: 'kbd', label: 'Keyboard' },
    varText: { tag: 'var', label: 'Variable' },
    sampleText: { tag: 'samp', label: 'Sample' },
  };

  class TextStylesPlugin {
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

    destroy() {}

    toggle(styleName) {
      const def = STYLES[styleName];
      if (!def) {
        return;
      }
      this.context.invoke('editor.focus');
      this.context.invoke('editor.restoreRange');

      const range = this.context.invoke('editor.getLastRange');
      if (!range || range.isCollapsed()) {
        return;
      }

      const selectedText = range.toString();
      if (!selectedText) {
        return;
      }

      const classAttr = def.className ? ` class="${def.className}"` : '';
      const wrapped = `<${def.tag}${classAttr}>${selectedText}</${def.tag}>`;

      range.pasteHTML(wrapped);
      this.context.invoke('editor.afterCommand');
    }
  }

  function buttonFactory(styleName) {
    return function TextStyleButton(context) {
      const ui = context.ui;
      const def = STYLES[styleName];
      if (!def) {
        return ui.button({ contents: '?' }).render();
      }
      const lang = context.options.langInfo;
      const label = (lang && lang.options && lang.options[styleName]) || def.label;
      return ui.button({
        className: `note-btn-${styleName} sn-plugin-text-styles`,
        contents: `<span class="sn-plugin-text-styles-label">${label}</span>`,
        tooltip: `${label}`,
        click(event) {
          event.preventDefault();
          context.invoke('textStyles.toggle', styleName);
        },
      }).render();
    };
  }

  function register() {
    const ns = (typeof window !== 'undefined' && window.summernote) || null;
    if (!ns || typeof ns.registerPlugin !== 'function') {
      return;
    }
    const buttons = {};
    Object.keys(STYLES).forEach((styleName) => {
      buttons[styleName] = buttonFactory(styleName);
    });
    ns.registerPlugin(PLUGIN_NAME, TextStylesPlugin, {
      stylesheets: [
        './css/text-styles.css',
      ],
      version: '1.0.0',
      buttons,
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
    module.exports = { TextStylesPlugin, register, STYLES };
  }
})();