/**
 * Plugin registration API tests
 * (c) 2026-present Jürgen Schwind
 * Summernote Next may be freely distributed under the MIT license.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import $$ from '@/js/core/dom-query.js';
import '@/styles/bs5/summernote-bs5';

function makePluginClass() {
  return class TestPlugin {
    constructor(context) {
      this.context = context;
      this.instances = (this.instances || 0) + 1;
    }
    shouldInitialize() {
      return true;
    }
    initialize() {
      this.initialized = true;
    }
    destroy() {
      this.destroyed = true;
    }
    customMethod(value) {
      return `custom:${value}`;
    }
  };
}

describe('summernote plugin API', () => {
  afterEach(() => {
    $$('body').empty();
  });

  describe('registerPlugin', () => {
    let previousPlugins;

    beforeEach(() => {
      previousPlugins = $$.summernote.plugins;
      $$.summernote.plugins = {};
      $$.summernote.pluginMeta = {};
    });

    afterEach(() => {
      $$.summernote.plugins = previousPlugins;
      delete $$.summernote.pluginMeta;
    });

    it('rejects empty or missing plugin names', () => {
      expect(() => $$.registerPlugin('', makePluginClass())).to.throw('non-empty plugin name');
      expect(() => $$.registerPlugin(null, makePluginClass())).to.throw('non-empty plugin name');
      expect(() => $$.registerPlugin(123, makePluginClass())).to.throw('non-empty plugin name');
    });

    it('rejects non-function plugin classes', () => {
      expect(() => $$.registerPlugin('onlyMeta', null)).to.throw('plugin class constructor');
      expect(() => $$.registerPlugin('onlyMeta', {})).to.throw('plugin class constructor');
      expect(() => $$.registerPlugin('onlyMeta', 'not-a-class')).to.throw('plugin class constructor');
    });

    it('stores the class in the plugins registry', () => {
      const PluginClass = makePluginClass();
      $$.registerPlugin('myPlugin', PluginClass);

      expect($$.summernote.plugins.myPlugin).to.equal(PluginClass);
      expect($$.listPlugins()).to.include('myPlugin');
    });

    it('creates the summernote namespace and pluginMeta map when missing', () => {
      const previousMeta = $$.summernote.pluginMeta;
      try {
        delete $$.summernote.pluginMeta;
        $$.registerPlugin('lazyInitPlugin', makePluginClass());
        expect($$.summernote.pluginMeta.lazyInitPlugin).to.not.equal(undefined);
      } finally {
        $$.summernote.pluginMeta = previousMeta;
      }
    });

    it('skips plugins that have no buttons when merging', () => {
      const previousMeta = $$.summernote.pluginMeta;
      try {
        $$.summernote.pluginMeta = {
          pluginWithButtons: {
            name: 'pluginWithButtons',
            stylesheets: [],
            scripts: [],
            buttons: { foo: () => {} },
            version: '1',
          },
          pluginWithoutButtons: {
            name: 'pluginWithoutButtons',
            stylesheets: [],
            scripts: [],
            buttons: null,
            version: '1',
          },
        };

        const $note = $$('<div><p>hi</p></div>').appendTo('body');
        const context = $$.create($note, {
          toolbar: [['custom', ['foo']]],
        });

        expect(context.memo('button.foo')).to.be.a('function');
      } finally {
        $$.summernote.pluginMeta = previousMeta;
      }
    });

    it('returns null for unknown plugin metadata and empty list when no plugins exist', () => {
      const previousMeta = $$.summernote.pluginMeta;
      const previousPlugins = $$.summernote.plugins;
      try {
        delete $$.summernote.pluginMeta;
        expect($$.getPluginMeta('missingPlugin')).to.equal(null);

        delete $$.summernote.plugins;
        expect($$.listPlugins()).to.deep.equal([]);
      } finally {
        $$.summernote.plugins = previousPlugins;
        $$.summernote.pluginMeta = previousMeta;
      }
    });

    it('returns null when summernote namespace is missing entirely', () => {
      const previousSummernote = $$.summernote;
      try {
        delete $$.summernote;
        expect($$.getPluginMeta('nope')).to.equal(null);
        expect($$.listPlugins()).to.deep.equal([]);
      } finally {
        $$.summernote = previousSummernote;
      }
    });

    it('recreates the summernote and plugins namespaces when missing', () => {
      const previousSummernote = $$.summernote;
      try {
        delete $$.summernote;
        $$.registerPlugin('autoInit', makePluginClass());
        expect($$.summernote.plugins.autoInit).to.be.a('function');
        expect($$.summernote.pluginMeta.autoInit).to.not.equal(undefined);
      } finally {
        $$.summernote = previousSummernote;
      }
    });

    it('recreates the plugins namespace when summernote exists but plugins does not', () => {
      const previousPlugins = $$.summernote.plugins;
      try {
        delete $$.summernote.plugins;
        $$.registerPlugin('noPluginsKey', makePluginClass());
        expect($$.summernote.plugins.noPluginsKey).to.be.a('function');
      } finally {
        $$.summernote.plugins = previousPlugins;
      }
    });

    it('stores the plugin metadata and exposes it via getPluginMeta', () => {
      const PluginClass = makePluginClass();
      $$.registerPlugin('metaPlugin', PluginClass, {
        stylesheets: ['./css/foo.css', './css/bar.css'],
        buttons: { myButton: () => {} },
        version: '1.2.3',
      });

      const meta = $$.getPluginMeta('metaPlugin');
      expect(meta).to.not.equal(null);
      expect(meta.name).to.equal('metaPlugin');
      expect(meta.version).to.equal('1.2.3');
      expect(meta.stylesheets).to.deep.equal(['./css/foo.css', './css/bar.css']);
      expect(Object.keys(meta.buttons)).to.deep.equal(['myButton']);
    });

    it('falls back to empty arrays for missing stylesheets and buttons', () => {
      const PluginClass = makePluginClass();
      $$.registerPlugin('minimalPlugin', PluginClass);

      const meta = $$.getPluginMeta('minimalPlugin');
      expect(meta.stylesheets).to.deep.equal([]);
      expect(meta.buttons).to.deep.equal({});
      expect(meta.version).to.equal(null);
    });

    it('returns the registered class for chaining', () => {
      const PluginClass = makePluginClass();
      const result = $$.registerPlugin('chainable', PluginClass);
      expect(result).to.equal(PluginClass);
    });
  });

  describe('plugin initialization through Context', () => {
    let previousPlugins;

    beforeEach(() => {
      previousPlugins = $$.summernote.plugins;
      $$.summernote.plugins = {};
      $$.summernote.pluginMeta = {};
    });

    afterEach(() => {
      $$.summernote.plugins = previousPlugins;
      delete $$.summernote.pluginMeta;
    });

    it('instantiates a registered plugin when summernote.create runs', () => {
      class TestPlugin {
        constructor(context) {
          this.context = context;
        }
        shouldInitialize() {
          return true;
        }
        initialize() {
          this.initialized = true;
        }
      }

      $$.registerPlugin('contextPlugin', TestPlugin);

      const $note = $$('<div><p>hello</p></div>').appendTo('body');
      const context = $$.create($note);

      expect(context.modules.contextPlugin).toBeInstanceOf(TestPlugin);
      expect(context.modules.contextPlugin.initialized).to.equal(true);
    });

    it('exposes plugin methods through summernote.invoke', () => {
      class TestPlugin {
        constructor(context) {
          this.context = context;
        }
        shouldInitialize() {
          return true;
        }
        initialize() {}
        echo(value) {
          return value;
        }
      }

      $$.registerPlugin('echoPlugin', TestPlugin);

      const $note = $$('<div><p>hello</p></div>').appendTo('body');
      const context = $$.create($note);

      expect($$.invoke(context, 'echoPlugin.echo', 'hi')).to.equal('hi');
    });

    it('merges plugin buttons into options.buttons when no overrides are provided', () => {
      const buttonFactory = vi.fn(() => ({ render: () => '<button/>' }));
      class ButtonPlugin {
        shouldInitialize() {
          return true;
        }
      }

      $$.registerPlugin('buttonPlugin', ButtonPlugin, {
        buttons: { myButton: buttonFactory },
      });

      const $note = $$('<div><p>hello</p></div>').appendTo('body');
      $$.create($note, {
        toolbar: [['custom', ['myButton']]],
      });

      expect($note.data('summernote').memo('button.myButton')).to.equal(buttonFactory);
    });

    it('preserves user-provided buttons when both define the same key', () => {
      const pluginButton = vi.fn(() => ({ render: () => '<button class="plugin"/>' }));
      const userButton = vi.fn(() => ({ render: () => '<button class="user"/>' }));

      class OverridePlugin {
        shouldInitialize() {
          return true;
        }
      }

      $$.registerPlugin('overridePlugin', OverridePlugin, {
        buttons: { sharedButton: pluginButton },
      });

      const $note = $$('<div><p>hello</p></div>').appendTo('body');
      const context = $$.create($note, {
        buttons: { sharedButton: userButton },
      });

      expect(context.memo('button.sharedButton')).to.equal(userButton);
    });
  });

  describe('loadPluginStylesheet', () => {
    let registeredPlugins;

    beforeEach(() => {
      registeredPlugins = $$.summernote.plugins;
      $$.summernote.plugins = {};
      $$.summernote.pluginMeta = {};
    });

    afterEach(() => {
      $$.summernote.plugins = registeredPlugins;
      delete $$.summernote.pluginMeta;
      document.head.querySelectorAll('link[data-summernote-plugin-stylesheet]').forEach((node) => node.remove());
    });

    it('appends a link element for unique URLs', async() => {
      const url = `https://example.test/plugin-${Date.now()}.css`;
      const promise = $$.loadPluginStylesheet(url);
      const link = document.head.querySelector(`link[data-summernote-plugin-stylesheet][href="${url}"]`);
      expect(link).to.not.equal(null);
      expect(link.getAttribute('href')).to.equal(url);
      link.dispatchEvent(new Event('load'));
      await promise;
    });

    it('deduplicates repeated load calls for the same URL', async() => {
      const url = `https://example.test/dedupe-${Date.now()}.css`;
      const first = $$.loadPluginStylesheet(url);
      const second = $$.loadPluginStylesheet(url);

      const matches = document.head.querySelectorAll(`link[data-summernote-plugin-stylesheet][href="${url}"]`);
      expect(matches.length).to.equal(1);

      const link = matches[0];
      link.dispatchEvent(new Event('load'));
      await Promise.all([first, second]);
    });

    it('returns immediately for empty URLs', async() => {
      const initialCount = document.head.querySelectorAll('link[data-summernote-plugin-stylesheet]').length;
      await $$.loadPluginStylesheet('');
      await $$.loadPluginStylesheet(null);
      await $$.loadPluginStylesheet(undefined);

      const afterCount = document.head.querySelectorAll('link[data-summernote-plugin-stylesheet]').length;
      expect(afterCount).to.equal(initialCount);
    });

    it('loadPluginStylesheets forwards an array of URLs', async() => {
      const url1 = `https://example.test/batch1-${Date.now()}.css`;
      const url2 = `https://example.test/batch2-${Date.now()}.css`;
      const promise = $$.loadPluginStylesheets([url1, url2]);
      const link1 = document.head.querySelector(`link[data-summernote-plugin-stylesheet][href="${url1}"]`);
      const link2 = document.head.querySelector(`link[data-summernote-plugin-stylesheet][href="${url2}"]`);
      expect(link1).to.not.equal(null);
      expect(link2).to.not.equal(null);
      link1.dispatchEvent(new Event('load'));
      link2.dispatchEvent(new Event('load'));
      await promise;
    });

    it('loadPluginStylesheets tolerates a missing array', async() => {
      await $$.loadPluginStylesheets(null);
      await $$.loadPluginStylesheets(undefined);
      const links = document.head.querySelectorAll('link[data-summernote-plugin-stylesheet]');
      expect(links.length).to.equal(0);
    });

    it('attaches a load event listener that resolves the returned promise', async() => {
      const url = `https://example.test/load-${Date.now()}.css`;
      const promise = $$.loadPluginStylesheet(url);
      const link = document.head.querySelector(`link[data-summernote-plugin-stylesheet][href="${url}"]`);
      link.dispatchEvent(new Event('load'));
      await promise;
      expect(link.getAttribute('href')).to.equal(url);
    });

    it('removes a deduped URL from the cache when a link fails to load', async() => {
      const url = `https://example.test/fail-${Date.now()}.css`;
      const promise = $$.loadPluginStylesheet(url).catch(() => null);
      const initialLinks = document.head.querySelectorAll(`link[data-summernote-plugin-stylesheet][href="${url}"]`);
      expect(initialLinks.length).to.equal(1);
      const link = initialLinks[0];
      link.dispatchEvent(new Event('error'));
      await promise;

      const retry = $$.loadPluginStylesheet(url);
      const afterLinks = document.head.querySelectorAll(`link[data-summernote-plugin-stylesheet][href="${url}"]`);
      expect(afterLinks.length).to.equal(2);
      const retryLink = afterLinks[afterLinks.length - 1];
      retryLink.dispatchEvent(new Event('load'));
      await retry;
    });
  });
});