/**
 * Summernote Next - Emoji Picker Plugin
 *
 * Adds a dropdown picker of common emoji to the toolbar.
 *
 * Public API:
 *   - summernote.invoke(target, 'emojiPicker.insert', '😀')
 *   - summernote.invoke(target, 'emojiPicker.toggle')
 *
 * Toolbar:
 *   - 'emojiPicker'
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

  const PLUGIN_NAME = 'emojiPicker';
  const BUTTON_NAME = 'emojiPicker';
  const HELPERS_URL = '../../assets/plugin-button-helpers.js';

  const EMOJI_GROUPS = [
    {
      title: 'Smileys',
      icon: 'emoji-smile',
      items: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'],
    },
    {
      title: 'Gestures',
      icon: 'gestures',
      items: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃'],
    },
    {
      title: 'Hearts',
      icon: 'heart',
      items: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '❤️‍🔥', '❤️‍🩹', '💌', '💋'],
    },
    {
      title: 'Symbols',
      icon: 'symbols',
      items: ['🔥', '✨', '⭐', '🌟', '💫', '⚡', '💥', '💯', '🎉', '🎊', '🎁', '🎈', '🎂', '🎄', '🎃', '🎀', '🎗️', '🎟️', '🎫', '🎖️', '🏆', '🏅', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐'],
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
      const cells = group.items.map((emoji) => {
        return `<button type="button" class="sn-plugin-emoji-cell" data-sn-emoji="${escapeHtml(emoji)}" tabindex="-1" aria-label="Insert ${escapeHtml(emoji)}"><span class="sn-plugin-emoji-cell-glyph">${escapeHtml(emoji)}</span></button>`;
      }).join('');
      const iconMarkup = buildIconMarkup(group.icon);
      return `<div class="sn-plugin-emoji-group" role="group" aria-label="${escapeHtml(group.title)}"><div class="sn-plugin-emoji-group-title">${iconMarkup}<span>${escapeHtml(group.title)}</span></div><div class="sn-plugin-emoji-grid">${cells}</div></div>`;
    }).join('');
  }

  class EmojiPickerPlugin {
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

    bindDropdown() {
      const groups = this.context.layoutInfo.toolbar.find('.sn-plugin-emoji-picker');
      if (!groups.length) {
        return;
      }
      const group = groups.closest('.note-btn-group')[0];
      if (!group || group.dataset.snBound === '1') {
        return;
      }
      const buttons = group.querySelectorAll('[data-sn-emoji]');
      buttons.forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          const emoji = button.dataset.snEmoji;
          this.insert(emoji);
        });
      });
      group.dataset.snBound = '1';
    }

    insert(emoji) {
      if (!emoji) {
        return;
      }
      this.context.invoke('editor.focus');
      this.context.invoke('editor.insertText', emoji);
    }

    open() {
      this.bindDropdown();
    }

    close() {}

    findDropdown() {
      const layout = this.context.layoutInfo;
      const groups = layout.toolbar.find('.sn-plugin-emoji-picker');
      if (!groups.length) {
        return null;
      }
      return groups.closest('.note-btn-group')[0];
    }
  }

  function EmojiPickerButton(context) {
    const ui = context.ui;
    const lang = context.options.langInfo;
    const label = (lang && lang.options && lang.options.emojiPicker) || 'Emoji picker';
    const groups = context.options.emojiPickerGroups || EMOJI_GROUPS;
    const pluginUi = window.summernote && window.summernote.pluginUi;
    const requestedStyle = context.options && context.options.buttonStyle;
    const style = pluginUi && pluginUi.normalizeStyle
      ? pluginUi.normalizeStyle(requestedStyle)
      : 'svg';

    let innerContent;
    if (style === 'text') {
      innerContent = pluginUi ? pluginUi.textLabel('Emoji') : ui.icon('note-icon-emoji');
    } else if (style === 'glyph') {
      innerContent = pluginUi ? pluginUi.glyphSpan('😀') : ui.icon('note-icon-emoji');
    } else {
      innerContent = ui.icon('note-icon-emoji');
    }

    return ui.buttonGroup([
      ui.button({
        className: `dropdown-toggle sn-plugin-emoji-toggle sn-plugin-button-${style}-mode`,
        contents: ui.dropdownButtonContents(innerContent, context.options),
        tooltip: label,
        data: {
          toggle: 'dropdown',
        },
      }),
      ui.dropdown({
        className: 'sn-plugin-emoji-picker',
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
    script.dataset.snPluginHelpers = 'emoji-picker';
    script.onload = () => callback();
    script.onerror = () => callback();
    document.head.appendChild(script);
  }

  function register() {
    const ns = (typeof window !== 'undefined' && window.summernote) || null;
    if (!ns || typeof ns.registerPlugin !== 'function') {
      return;
    }
    ns.registerPlugin(PLUGIN_NAME, EmojiPickerPlugin, {
      stylesheets: [
        pluginAssetUrl('./css/emoji-picker.css'),
      ],
      version: '1.0.0',
      buttons: {
        [BUTTON_NAME]: function Button(context) {
          const render = () => EmojiPickerButton(context);
          if (window.summernote && window.summernote.pluginUi) {
            return render();
          }
          const wrapper = document.createElement('span');
          wrapper.dataset.snPluginPending = 'emojiPicker';
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
    module.exports = { EmojiPickerPlugin, register, EMOJI_GROUPS };
  }
})();