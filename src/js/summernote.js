import $$, { DomQuery } from './core/dom-query.js';
import env from './core/env';
import lists from './core/lists';
import Context from './Context';

function resolveCollection(target) {
  const collection = target instanceof Context ? target.$note : $$(target);

  if (!collection.length) {
    throw new Error('Summernote target not found.');
  }

  return collection;
}

function getContexts(target, requireInitialized = true) {
  const collection = resolveCollection(target);
  const contexts = collection.map((idx, note) => $$(note).data('summernote'));

  if (requireInitialized && contexts.some((context) => !context)) {
    throw new Error('Summernote is not initialized on the target.');
  }

  return contexts;
}

function unwrapResult(results) {
  return results.length === 1 ? results[0] : results;
}

/**
 * Summernote API
 *
 * @param {Object|String}
 * @return {this}
 */
DomQuery.prototype.summernote = function() {
  const type = typeof(lists.head(arguments));
  const isExternalAPICalled = type === 'string';
  const hasInitOptions = type === 'object';
  let initOptions = hasInitOptions ? lists.head(arguments) : {};

  const pluginMeta = ($$.summernote && $$.summernote.pluginMeta) || {};

  if (Object.keys(pluginMeta).length) {
    const mergedButtons = {};

    Object.values(pluginMeta).forEach((meta) => {
      if (meta && meta.buttons) {
        Object.assign(mergedButtons, meta.buttons);
      }
    });

    if (Object.keys(mergedButtons).length) {
      initOptions = $$.extend({}, initOptions, {
        buttons: $$.extend({}, mergedButtons, initOptions.buttons || {}),
      });
    }
  }

  const options = $$.extend({}, $$.summernote.options, initOptions);

  // Update options
  options.langInfo = $$.extend(true, {}, $$.summernote.lang['en-US'], $$.summernote.lang[options.lang]);
  if (!Object.prototype.hasOwnProperty.call(initOptions, 'colorsName') && options.langInfo.color?.colorsName) {
    options.colorsName = options.langInfo.color.colorsName;
  }
  options.icons = $$.extend(true, {}, $$.summernote.options.icons, options.icons);
  options.tooltip = options.tooltip === 'auto' ? !env.isSupportTouch : options.tooltip;

  this.each((idx, note) => {
    const $note = $$(note);
    if (!$note.data('summernote')) {
      const context = new Context($note, options);
      $note.data('summernote', context);
      $note.data('summernote').triggerEvent('init', context.layoutInfo);
    }
  });

  const $note = this.first();
  if ($note.length) {
    const context = $note.data('summernote');
    if (isExternalAPICalled) {
      return context.invoke.apply(context, lists.from(arguments));
    } else if (options.focus) {
      context.invoke('editor.focus');
    }
  }

  return this;
};

const loadedStylesheetUrls = new Set();

function loadStylesheet(url) {
  if (!url || typeof document === 'undefined' || loadedStylesheetUrls.has(url)) {
    return Promise.resolve();
  }

  loadedStylesheetUrls.add(url);

  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.dataset.summernotePluginStylesheet = '';
    link.addEventListener('load', () => resolve());
    link.addEventListener('error', (event) => {
      loadedStylesheetUrls.delete(url);
      reject(event);
    });
    document.head.appendChild(link);
  });
}

function loadStylesheets(urls) {
  return Promise.all((urls || []).map(loadStylesheet));
}

Object.assign($$, {
  create(target, options = {}) {
    const collection = resolveCollection(target);
    collection.summernote(options);
    return unwrapResult(getContexts(collection));
  },

  getInstance(target) {
    return unwrapResult(getContexts(target));
  },

  destroy(target) {
    getContexts(target).forEach((context) => context.destroy());
  },

  invoke(target, method, ...args) {
    return unwrapResult(getContexts(target).map((context) => context.invoke(method, ...args)));
  },

  loadPluginStylesheet(url) {
    return loadStylesheet(url);
  },

  loadPluginStylesheets(urls) {
    return loadStylesheets(urls);
  },

  registerPlugin(name, pluginClass, options = {}) {
    if (!name || typeof name !== 'string') {
      throw new Error('registerPlugin(name, pluginClass) requires a non-empty plugin name.');
    }
    if (typeof pluginClass !== 'function') {
      throw new Error('registerPlugin(name, pluginClass) requires a plugin class constructor.');
    }

    $$.summernote = $$.summernote || { lang: {}, plugins: {} };
    $$.summernote.plugins = $$.summernote.plugins || {};
    $$.summernote.pluginMeta = $$.summernote.pluginMeta || {};
    $$.summernote.plugins[name] = pluginClass;
    $$.summernote.pluginMeta[name] = Object.freeze({
      name,
      stylesheets: Object.freeze([...(options.stylesheets || [])]),
      scripts: Object.freeze([...(options.scripts || [])]),
      buttons: Object.freeze({ ...(options.buttons || {}) }),
      version: options.version || null,
    });

    const stylesheets = $$.summernote.pluginMeta[name].stylesheets;

    if (stylesheets.length) {
      loadStylesheets(stylesheets);
    }

    return pluginClass;
  },

  getPluginMeta(name) {
    return ($$.summernote && $$.summernote.pluginMeta && $$.summernote.pluginMeta[name]) || null;
  },

  listPlugins() {
    return Object.keys(($$.summernote && $$.summernote.plugins) || {});
  },
});
