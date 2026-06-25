/**
 * Word Counter Plugin tests
 * (c) 2026-present Jürgen Schwind
 * Summernote Next may be freely distributed under the MIT license.
 */

import { afterEach, describe, expect, it } from 'vitest';
import $$ from '@/js/core/dom-query.js';
import Context from '@/js/Context';
import '@/styles/bs5/summernote-bs5';

function countWords(html) {
  if (!html) {
    return 0;
  }
  const trimmed = html.replace(/<[^>]*>/g, ' ').trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function countCharacters(html) {
  if (!html) {
    return 0;
  }
  return html.replace(/<[^>]*>/g, '').length;
}

function createEditorWithPlugin(initialHtml) {
  const $note = $$([`<div>${initialHtml}</div>`].join('')).appendTo('body');
  const baseModules = $$.summernote.options.modules || {};
  const context = new Context($note, $$.extend({}, $$.summernote.options, {
    modules: $$.extend({}, baseModules, {
      wordCounter: class WordCounterStub {
        constructor(instance) {
          this.context = instance;
          this.instances = (this.instances || 0) + 1;
          this.visible = true;
          this.events = {};
        }
        shouldInitialize() {
          return true;
        }
        initialize() {
          this.badge = document.createElement('div');
          this.badge.className = 'sn-plugin-word-counter';
          this.badge.setAttribute('data-sn-word-counter', '');
          this.context.layoutInfo.statusbar[0].appendChild(this.badge);
          this.refresh();
        }
        destroy() {
          if (this.badge && this.badge.parentNode) {
            this.badge.parentNode.removeChild(this.badge);
          }
          this.badge = null;
        }
        refresh() {
          if (!this.badge) return;
          const html = this.context.invoke('code');
          this.badge.textContent = `${countWords(html)} words · ${countCharacters(html)} characters`;
          this.badge.dataset.snWords = String(countWords(html));
          this.badge.dataset.snCharacters = String(countCharacters(html));
        }
        stats() {
          const html = this.context.invoke('code');
          return {
            words: countWords(html),
            characters: countCharacters(html),
            visible: this.visible,
          };
        }
        toggle(force) {
          const next = typeof force === 'boolean' ? force : !this.visible;
          this.visible = next;
          if (this.badge) {
            this.badge.classList.toggle('d-none', !next);
          }
          return this.visible;
        }
      },
    }),
  }));
  return context;
}

describe('Word counter plugin pattern', () => {
  let context;

  afterEach(() => {
    context?.destroy();
    $$('body').empty();
  });

  it('creates a badge element inside the status bar', () => {
    context = createEditorWithPlugin('<p>Hello world</p>');
    const badge = context.layoutInfo.statusbar.find('[data-sn-word-counter]');
    expect(badge.length).to.equal(1);
  });

  it('counts words and characters inside the editor content', () => {
    context = createEditorWithPlugin('<p>Hello world from summernote</p>');
    const html = context.invoke('code');
    const stats = context.modules.wordCounter.stats();
    expect({ html, words: stats.words, characters: stats.characters }).to.deep.equal({
      html: '<p>Hello world from summernote</p>',
      words: 4,
      characters: 27,
    });
  });

  it('updates the badge when the content changes', () => {
    context = createEditorWithPlugin('<p>Hello world</p>');
    context.code('<p>Hello world from a longer text with more content here</p>');
    context.modules.wordCounter.refresh();
    const badge = context.layoutInfo.statusbar.find('[data-sn-word-counter]')[0];
    expect(badge.dataset.snWords).to.equal('10');
  });

  it('toggles the badge visibility', () => {
    context = createEditorWithPlugin('<p>Hello world</p>');
    const plugin = context.modules.wordCounter;

    expect(plugin.toggle()).to.equal(false);
    expect(plugin.toggle()).to.equal(true);
    expect(plugin.toggle(true)).to.equal(true);
    expect(plugin.toggle(false)).to.equal(false);
  });

  it('cleans up the badge when the editor is destroyed', () => {
    context = createEditorWithPlugin('<p>Hello world</p>');
    context.destroy();

    expect(document.querySelectorAll('[data-sn-word-counter]').length).to.equal(0);
    context = null;
  });
});