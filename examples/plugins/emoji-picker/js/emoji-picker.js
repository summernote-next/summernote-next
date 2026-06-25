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
 */

(function() {
  'use strict';

  const PLUGIN_NAME = 'emojiPicker';
  const BUTTON_NAME = 'emojiPicker';

  const EMOJI_GROUPS = [
    {
      title: 'Smileys',
      items: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'],
    },
    {
      title: 'Gestures',
      items: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃'],
    },
    {
      title: 'Hearts',
      items: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💌', '💋'],
    },
    {
      title: 'Symbols',
      items: ['🔥', '✨', '⭐', '🌟', '💫', '⚡', '💥', '💯', '🎉', '🎊', '🎁', '🎈', '🎂', '🎄', '🎃', '🎀', '🎗️', '🎟️', '🎫', '🎖️', '🏆', '🏅', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐'],
    },
  ];

  function buildMenuMarkup(groups) {
    return groups.map((group) => {
      const cells = group.items.map((emoji) => {
        return `<button type="button" class="sn-plugin-emoji-cell" data-sn-emoji="${emoji}" tabindex="-1" aria-label="Insert ${emoji}">${emoji}</button>`;
      }).join('');
      return `<div class="sn-plugin-emoji-group" role="group" aria-label="${group.title}"><div class="sn-plugin-emoji-group-title">${group.title}</div><div class="sn-plugin-emoji-grid">${cells}</div></div>`;
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
          this.context.invoke('toolbar.deactivate', true);
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
      const dropdown = this.findDropdown();
      if (!dropdown) {
        return;
      }
      this.bindDropdown();
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
    return ui.buttonGroup([
      ui.button({
        className: 'dropdown-toggle sn-plugin-emoji-toggle',
        contents: ui.dropdownButtonContents(`<span class="sn-plugin-emoji-glyph">😀</span>`, context.options),
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

  function register() {
    const ns = (typeof window !== 'undefined' && window.summernote) || null;
    if (!ns || typeof ns.registerPlugin !== 'function') {
      return;
    }
    ns.registerPlugin(PLUGIN_NAME, EmojiPickerPlugin, {
      stylesheets: [
        './css/emoji-picker.css',
      ],
      version: '1.0.0',
      buttons: {
        [BUTTON_NAME]: EmojiPickerButton,
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