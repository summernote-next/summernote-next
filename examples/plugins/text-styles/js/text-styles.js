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

  const PLUGIN_NAME = 'textStyles';
  const HELPERS_URL = '../../assets/plugin-button-helpers.js';

  const STYLES = {
    markText: { tag: 'mark', label: 'Mark', shortLabel: 'Mark', icon: 'mark' },
    inlineCode: { tag: 'code', label: 'Inline code', shortLabel: 'Code', icon: 'inline-code' },
    kbdText: { tag: 'kbd', label: 'Keyboard', shortLabel: 'Kbd', icon: 'keyboard' },
    varText: { tag: 'var', label: 'Variable', shortLabel: 'Var', icon: 'variable' },
    sampleText: { tag: 'samp', label: 'Sample', shortLabel: 'Samp', icon: 'sample' },
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

  function renderButton(context, def, styleName) {
    const pluginUi = window.summernote && window.summernote.pluginUi;
    const lang = context.options.langInfo;
    const label = (lang && lang.options && lang.options[styleName]) || def.label;

    if (pluginUi && typeof pluginUi.buildButton === 'function') {
      const shortLabel = def.shortLabel;
      return pluginUi.buildButton(context, {
        className: `note-btn-${styleName} sn-plugin-text-styles`,
        text: shortLabel,
        icon: def.icon,
        tooltip: label,
        click(event) {
          event.preventDefault();
          context.invoke('textStyles.toggle', styleName);
        },
      });
    }

    const ui = context.ui;
    return ui.button({
      className: `note-btn-${styleName} sn-plugin-text-styles`,
      contents: ui.icon(`note-icon-${def.icon}`),
      tooltip: label,
      click(event) {
        event.preventDefault();
        context.invoke('textStyles.toggle', styleName);
      },
    }).render();
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
    script.dataset.snPluginHelpers = 'text-styles';
    script.onload = () => callback();
    script.onerror = () => callback();
    document.head.appendChild(script);
  }

  function register() {
    const ns = (typeof window !== 'undefined' && window.summernote) || null;
    if (!ns || typeof ns.registerPlugin !== 'function') {
      return;
    }
    const buttons = {};
    Object.keys(STYLES).forEach((styleName) => {
      const def = STYLES[styleName];
      buttons[styleName] = function Button(context) {
        const render = () => renderButton(context, def, styleName);
        if (window.summernote && window.summernote.pluginUi) {
          return render();
        }
        const wrapper = document.createElement('span');
        wrapper.dataset.snPluginPending = styleName;
        ensureHelpersLoaded(() => {
          const node = render();
          if (wrapper.parentNode) {
            wrapper.parentNode.replaceChild(node, wrapper);
          }
        });
        return wrapper.outerHTML;
      };
    });
    ns.registerPlugin(PLUGIN_NAME, TextStylesPlugin, {
      stylesheets: [
        pluginAssetUrl('./css/text-styles.css'),
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