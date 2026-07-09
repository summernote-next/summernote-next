/**
 * Summernote Next - Link Extractor Plugin
 *
 * Collects every <a href="..."> inside the editor and renders them in a sidebar
 * panel below the editable area. The plugin owns its CSS, JavaScript, and
 * toolbar button registration.
 *
 * Public API:
 *   - summernote.invoke(target, 'linkExtractor.refresh')
 *   - summernote.invoke(target, 'linkExtractor.list')
 *
 * Toolbar:
 *   - 'linkExtractorToggle'
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

  const PLUGIN_NAME = 'linkExtractor';
  const BUTTON_NAME = 'linkExtractorToggle';

  function extractLinks(html) {
    if (!html) {
      return [];
    }
    const container = document.createElement('div');
    container.innerHTML = html;
    const anchors = container.querySelectorAll('a[href]');
    const links = [];
    anchors.forEach((anchor) => {
      const href = anchor.getAttribute('href');
      if (!href) {
        return;
      }
      links.push({
        href,
        text: (anchor.textContent || href).trim(),
        host: anchor.host || '',
      });
    });
    return links;
  }

  class LinkExtractorPlugin {
    constructor(context) {
      this.context = context;
      this.options = context.options;
      this.lang = context.options.langInfo;
      this.ui = context.ui;
      this.handleChange = this.handleChange.bind(this);
    }

    shouldInitialize() {
      return true;
    }

    initialize() {
      const layout = this.context.layoutInfo;
      this.$editingArea = layout.editingArea;

      this.panel = document.createElement('aside');
      this.panel.className = 'sn-plugin-link-extractor';
      this.panel.setAttribute('data-sn-link-extractor', '');
      this.panel.setAttribute('role', 'complementary');
      this.panel.setAttribute('aria-label', (this.lang && this.lang.options && this.lang.options.linkExtractor) || 'Links');

      this.title = document.createElement('header');
      this.title.className = 'sn-plugin-link-extractor-title';
      this.listElement = document.createElement('ul');
      this.listElement.className = 'sn-plugin-link-extractor-list';

      this.panel.appendChild(this.title);
      this.panel.appendChild(this.listElement);

      layout.editor[0].appendChild(this.panel);

      this.events = {
        'summernote.change summernote.paste summernote.keyup': this.handleChange,
      };

      this.refresh();
    }

    destroy() {
      if (this.panel && this.panel.parentNode) {
        this.panel.parentNode.removeChild(this.panel);
      }
      this.panel = null;
    }

    handleChange() {
      this.refresh();
    }

    refresh() {
      if (!this.panel) {
        return;
      }
      const html = this.context.invoke('code');
      const links = extractLinks(html);
      const titleText = (this.lang && this.lang.options && this.lang.options.linkExtractor) || 'Links';
      const countLabel = links.length === 1 ? 'link' : 'links';
      this.title.textContent = `${titleText} · ${links.length} ${countLabel}`;

      this.listElement.innerHTML = '';
      if (!links.length) {
        const empty = document.createElement('li');
        empty.className = 'sn-plugin-link-extractor-empty';
        empty.textContent = (this.lang && this.lang.options && this.lang.options.linkExtractorEmpty) || 'No links yet.';
        this.listElement.appendChild(empty);
        return;
      }
      links.forEach((link, index) => {
        const item = document.createElement('li');
        item.className = 'sn-plugin-link-extractor-item';
        const text = document.createElement('span');
        text.className = 'sn-plugin-link-extractor-text';
        text.textContent = link.text;
        const anchor = document.createElement('a');
        anchor.className = 'sn-plugin-link-extractor-link';
        anchor.href = link.href;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.textContent = link.host || link.href;
        item.appendChild(text);
        item.appendChild(anchor);
        this.listElement.appendChild(item);
      });
    }

    list() {
      return extractLinks(this.context.invoke('code'));
    }

    toggle(forceState) {
      if (!this.panel) {
        return false;
      }
      const next = typeof forceState === 'boolean' ? forceState : this.panel.classList.contains('d-none');
      this.panel.classList.toggle('d-none', !next);
      return next;
    }
  }

  function LinkExtractorToggleButton(context) {
    const ui = context.ui;
    const lang = context.options.langInfo;
    const label = (lang && lang.options && lang.options.linkExtractor) || 'Link extractor';
    return ui.button({
      className: 'note-btn-link-extractor sn-plugin-link-extractor-toggle',
      contents: '<span class="sn-plugin-link-extractor-glyph" aria-hidden="true">↗</span>',
      tooltip: label,
      click(event) {
        event.preventDefault();
        context.invoke('linkExtractor.toggle');
      },
    }).render();
  }

  function register() {
    const ns = (typeof window !== 'undefined' && window.summernote) || null;
    if (!ns || typeof ns.registerPlugin !== 'function') {
      return;
    }
    ns.registerPlugin(PLUGIN_NAME, LinkExtractorPlugin, {
      stylesheets: [
        pluginAssetUrl('./css/link-extractor.css'),
      ],
      version: '1.0.0',
      buttons: {
        [BUTTON_NAME]: LinkExtractorToggleButton,
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
    module.exports = { LinkExtractorPlugin, register };
  }
})();