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
 */

(function() {
  'use strict';

  const PLUGIN_NAME = 'alignmentButtons';

  const ICONS = {
    left: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M2 3.5h12v1H2zm0 3h8v1H2zm0 3h12v1H2zm0 3h8v1H2z"/></svg>',
    center: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M2 3.5h12v1H2zm2 3h8v1H4zm-2 3h12v1H2zm2 3h8v1H4z"/></svg>',
    right: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M2 3.5h12v1H2zm4 3h8v1H6zm-4 3h12v1H2zm4 3h8v1H6z"/></svg>',
    justify: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M2 3.5h12v1H2zm0 3h12v1H2zm0 3h12v1H2zm0 3h12v1H2z"/></svg>',
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
      const labelKey = `align${value[0].toUpperCase()}${value.slice(1)}`;
      const label = (context.options.langInfo && context.options.langInfo.options && context.options.langInfo.options[labelKey])
        || value[0].toUpperCase() + value.slice(1);
      return ui.button({
        className: `note-btn-align-${value} sn-plugin-align`,
        contents: ICONS[value],
        tooltip: label,
        click(event) {
          event.preventDefault();
          context.invoke('alignmentButtons.align', value);
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
    ALIGNMENTS.forEach((alignment) => {
      buttons[`align${alignment[0].toUpperCase()}${alignment.slice(1)}`] = buttonFactory(alignment);
    });
    ns.registerPlugin(PLUGIN_NAME, AlignmentButtonsPlugin, {
      stylesheets: [
        './css/alignment-buttons.css',
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