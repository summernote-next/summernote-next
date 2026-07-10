/**
 * Special Characters Plugin tests
 * (c) 2026-present Jürgen Schwind
 * Summernote Next may be freely distributed under the MIT license.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import $$ from '@/js/core/dom-query.js';
import { loadAllIcons } from '@/js/icons-svg.js';
import '@/styles/bs5/summernote-bs5';

const pluginSource = import.meta.glob('../../examples/plugins/special-characters/js/special-characters.js', {
  eager: true,
  query: '?raw',
  import: 'default',
})['../../examples/plugins/special-characters/js/special-characters.js'];

const helpersSource = import.meta.glob('../../examples/assets/plugin-button-helpers.js', {
  eager: true,
  query: '?raw',
  import: 'default',
})['../../examples/assets/plugin-button-helpers.js'];

function loadScript(source, dataset) {
  const script = document.createElement('script');
  if (dataset) {
    Object.keys(dataset).forEach((key) => {
      script.dataset[key] = dataset[key];
    });
  }
  script.textContent = source;
  document.head.appendChild(script);
  script.remove();
}

function flush() {
  return new Promise((r) => setTimeout(r, 0));
}

async function paintToolbarIcons() {
  await loadAllIcons();
  await flush();
}

function countDisabledToolbarButtons() {
  return $$('.note-toolbar button').filter((_, btn) => {
    return btn.hasAttribute('disabled') || btn.classList.contains('disabled');
  }).length;
}

describe('Special Characters plugin', () => {
  let context;
  let restore;
  let suppressUnhandled;

  function setupPluginAndEditor() {
    const previousPlugins = $$.summernote.plugins;
    const previousMeta = $$.summernote.pluginMeta;
    const previousWindowSummernote = typeof window !== 'undefined' ? window.summernote : undefined;
    suppressUnhandled = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', suppressUnhandled, true);
    }
    $$.summernote.plugins = {};
    $$.summernote.pluginMeta = {};
    if (typeof window !== 'undefined') {
      window.summernote = $$;
    }

    loadScript(helpersSource, { snPluginHelpers: 'special-characters-test' });
    loadScript(pluginSource, { snPluginTest: 'special-characters' });

    restore = () => {
      $$.summernote.plugins = previousPlugins;
      $$.summernote.pluginMeta = previousMeta;
      if (typeof window !== 'undefined') {
        if (previousWindowSummernote === undefined) {
          delete window.summernote;
        } else {
          window.summernote = previousWindowSummernote;
        }
      }
    };
  }

  afterEach(() => {
    context?.destroy();
    $$('body').empty();
    if (restore) restore();
    if (suppressUnhandled && typeof window !== 'undefined') {
      window.removeEventListener('unhandledrejection', suppressUnhandled, true);
    }
    restore = null;
    suppressUnhandled = null;
    context = null;
  });

  async function createEditor() {
    setupPluginAndEditor();
    await flush();
    const $note = $$('<div><p>hello world</p></div>').appendTo('body');
    context = $$.create($note, $$.extend({}, $$.summernote.options, {
      toolbar: [
        ['insert', ['specialCharacters']],
      ],
    }));
    await paintToolbarIcons();
    await flush();
    return context;
  }

  it('does not disable the toolbar after inserting a special character', async() => {
    await createEditor();

    const specialPlugin = context.modules.specialCharacters;
    expect(specialPlugin).toBeDefined();

    const $editable = context.layoutInfo.editable;
    $editable.focus();
    await flush();

    expect(countDisabledToolbarButtons()).to.equal(0);

    specialPlugin.insert('©');
    await flush();

    expect(countDisabledToolbarButtons()).to.equal(0);

    const html = context.invoke('code');
    expect(html).to.contain('©');
  });

  it('does not invoke toolbar.deactivate from the click handler', async() => {
    await createEditor();

    const $editable = context.layoutInfo.editable;
    $editable.focus();
    await flush();

    const invokeSpy = vi.spyOn(context, 'invoke');
    const cell = context.layoutInfo.toolbar.find('.sn-plugin-special-chars-cell').first()[0];
    expect(cell).toBeDefined();
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();

    const deactivateCalls = invokeSpy.mock.calls.filter((call) => call[0] === 'toolbar.deactivate');
    const activateCalls = invokeSpy.mock.calls.filter((call) => call[0] === 'toolbar.activate');
    expect(deactivateCalls).toHaveLength(0);
    expect(activateCalls).toHaveLength(0);
  });

  it('open() and close() do not touch toolbar activation state', async() => {
    await createEditor();

    const invokeSpy = vi.spyOn(context, 'invoke');
    const plugin = context.modules.specialCharacters;

    plugin.open();
    plugin.close();

    const deactivateCalls = invokeSpy.mock.calls.filter((call) => call[0] === 'toolbar.deactivate');
    const activateCalls = invokeSpy.mock.calls.filter((call) => call[0] === 'toolbar.activate');
    expect(deactivateCalls).toHaveLength(0);
    expect(activateCalls).toHaveLength(0);
  });
});