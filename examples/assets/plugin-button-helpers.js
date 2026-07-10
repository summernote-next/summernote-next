/**
 * Summernote Next - Plugin button helpers
 *
 * Shared helpers for rendering plugin toolbar buttons. Three variants are
 * supported through the `buttonStyle` option:
 *
 *   - 'svg'   (default): small SVG icon button matching the built-in toolbar
 *   - 'text':          compact uppercase label, same height as the SVG variant
 *   - 'glyph':         an emoji/Greek glyph as the button content (only
 *                      available for plugins that opt-in via `glyph`)
 */

(function() {
  'use strict';

  if (typeof window === 'undefined') {
    return;
  }

  function ensureNamespace() {
    window.summernote = window.summernote || {};
    window.summernote.plugins = window.summernote.plugins || {};
    window.summernote.pluginUi = window.summernote.pluginUi || {};
  }

  function normalizeStyle(value) {
    if (value === 'text' || value === 'glyph') {
      return value;
    }
    return 'svg';
  }

  function getStyle(context, available) {
    const options = context && context.options;
    const raw = (options && options.buttonStyle) || 'svg';
    const normalized = normalizeStyle(raw);
    if (available && available.indexOf(normalized) === -1) {
      return available[0] || 'svg';
    }
    return normalized;
  }

  function isTextStyle(context) {
    return getStyle(context, ['svg', 'text', 'glyph']) === 'text';
  }

  function isGlyphStyle(context) {
    return getStyle(context, ['svg', 'text', 'glyph']) === 'glyph';
  }

  function svgIcon(context, name) {
    const ui = context && context.ui;
    if (!ui || typeof ui.icon !== 'function') {
      return '';
    }
    return ui.icon('note-icon-' + name);
  }

  function glyphSpan(value) {
    const safe = String(value == null ? '' : value);
    return `<span class="sn-plugin-button-glyph" aria-hidden="true">${safe}</span>`;
  }

  function textLabel(content) {
    return `<span class="sn-plugin-button-text">${content}</span>`;
  }

  function buildButton(context, options) {
    const ui = context.ui;
    const style = getStyle(context, ['svg', 'text', 'glyph']);
    let contents;
    if (style === 'text') {
      contents = textLabel(options.text);
    } else if (style === 'glyph' && options.glyph != null) {
      contents = glyphSpan(options.glyph);
    } else if (options.icon) {
      contents = svgIcon(context, options.icon);
    } else {
      contents = textLabel(options.text);
    }

    const classes = ['note-btn', options.className];
    if (style === 'text') {
      classes.push('sn-plugin-button-text-mode');
    } else if (style === 'glyph') {
      classes.push('sn-plugin-button-glyph-mode');
    } else {
      classes.push('sn-plugin-button-svg-mode');
    }

    return ui.button({
      className: classes.filter(Boolean).join(' '),
      contents,
      tooltip: options.tooltip,
      click: options.click,
    }).render();
  }

  function buildDropdownToggle(context, options) {
    const ui = context.ui;
    const style = getStyle(context, ['svg', 'text', 'glyph']);
    let innerContent;
    if (style === 'text') {
      innerContent = textLabel(options.text);
    } else if (style === 'glyph' && options.glyph != null) {
      innerContent = glyphSpan(options.glyph);
    } else if (options.icon) {
      innerContent = svgIcon(context, options.icon);
    } else {
      innerContent = textLabel(options.text);
    }

    const contents = ui.dropdownButtonContents(innerContent, context.options);

    const toggleClasses = ['dropdown-toggle', options.className];
    if (style === 'text') {
      toggleClasses.push('sn-plugin-button-text-mode');
    } else if (style === 'glyph') {
      toggleClasses.push('sn-plugin-button-glyph-mode');
    } else {
      toggleClasses.push('sn-plugin-button-svg-mode');
    }

    return ui.button({
      className: toggleClasses.filter(Boolean).join(' '),
      contents,
      tooltip: options.tooltip,
      data: { toggle: 'dropdown' },
    }).render();
  }

  ensureNamespace();
  window.summernote.pluginUi = {
    normalizeStyle,
    getStyle,
    isTextStyle,
    isGlyphStyle,
    svgIcon,
    glyphSpan,
    textLabel,
    buildButton,
    buildDropdownToggle,
  };
})();