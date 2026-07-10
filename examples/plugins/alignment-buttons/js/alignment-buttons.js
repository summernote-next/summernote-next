/**
 * Summernote Next - Alignment Buttons Plugin
 *
 * Adds four paragraph-alignment buttons (left, center, right, justify) to the
 * toolbar. The plugin owns its CSS, JavaScript, and button factory.
 *
 * Public API:
 *   - summernote.invoke(target, 'alignmentButtons.align', 'left'|'center'|'right'|'justify')
 *
 * Toolbar:
 *   - 'alignLeft', 'alignCenter', 'alignRight', 'alignJustify'
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

  const PLUGIN_NAME = 'alignmentButtons';
  const HELPERS_URL = '../../assets/plugin-button-helpers.js';

  const ICON_NAMES = {
    left: 'align-left',
    center: 'align-center',
    right: 'align-right',
    justify: 'align-justify',
  };

  const SHORT_LABELS = {
    left: 'Left',
    center: 'Center',
    right: 'Right',
    justify: 'Justify',
  };

  const ALIGN_TO_METHOD = {
    left: 'justifyLeft',
    center: 'justifyCenter',
    right: 'justifyRight',
    justify: 'justifyFull',
  };

  const ALIGNMENTS = Object.keys(ALIGN_TO_METHOD);

  class AlignmentButtonsPlugin {
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

    align(value, $target) {
      const method = ALIGN_TO_METHOD[value];
      if (!method) {
        return;
      }
      this.context.invoke('editor.focus');
      this.context.invoke(`editor.${method}`);
    }
  }

  function buttonFactory(value) {
    return function AlignmentButton(context) {
      const ui = context.ui;
      const pluginUi = window.summernote && window.summernote.pluginUi;
      const textMode = pluginUi && pluginUi.isTextStyle && pluginUi.isTextStyle(context);
      const labelKey = `align${value[0].toUpperCase()}${value.slice(1)}`;
      const label = (context.options.langInfo && context.options.langInfo.options && context.options.langInfo.options[labelKey])
        || value[0].toUpperCase() + value.slice(1);

      let contents;
      if (textMode) {
        contents = pluginUi.textLabel(SHORT_LABELS[value]);
      } else {
        contents = ui.icon('note-icon-' + ICON_NAMES[value]);
      }

      return ui.button({
        className: `note-btn-align-${value} sn-plugin-align${textMode ? ' sn-plugin-button-text-mode' : ' sn-plugin-button-svg-mode'}`,
        contents,
        tooltip: label,
        click(event) {
          event.preventDefault();
          context.invoke('alignmentButtons.align', value);
        },
      }).render();
    };
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
    script.dataset.snPluginHelpers = 'alignment-buttons';
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
    ALIGNMENTS.forEach((alignment) => {
      buttons[`align${alignment[0].toUpperCase()}${alignment.slice(1)}`] = function Button(context) {
        const render = () => buttonFactory(alignment)(context);
        if (window.summernote && window.summernote.pluginUi) {
          return render();
        }
        const wrapper = document.createElement('span');
        wrapper.dataset.snPluginPending = `align-${alignment}`;
        ensureHelpersLoaded(() => {
          const node = render();
          if (wrapper.parentNode) {
            wrapper.parentNode.replaceChild(node, wrapper);
          }
        });
        return wrapper.outerHTML;
      };
    });
    ns.registerPlugin(PLUGIN_NAME, AlignmentButtonsPlugin, {
      stylesheets: [
        pluginAssetUrl('./css/alignment-buttons.css'),
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
    module.exports = { AlignmentButtonsPlugin, register };
  }
})();