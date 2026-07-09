import $$ from '../core/dom-query.js';
import dom from '../core/dom';
import key from '../core/key';

export default class CodeView {
  constructor(context) {
    this.context = context;
    this.$editor = context.layoutInfo.editor;
    this.$editable = context.layoutInfo.editable;
    this.$codable = context.layoutInfo.codable;
    this.$editingArea = context.layoutInfo.editingArea;
    this.options = context.options;
    this.lang = context.options.langInfo;
    this.CodeMirrorConstructor = window.CodeMirror;

    if (this.options.codemirror.CodeMirrorConstructor) {
      this.CodeMirrorConstructor = this.options.codemirror.CodeMirrorConstructor;
    }

    this.handleCloseClick = this.handleCloseClick.bind(this);
  }

  isAirMode() {
    return Boolean(this.options.airMode);
  }

  ensureAirModeCloseButton() {
    if (!this.isAirMode() || !this.options.editing) {
      return null;
    }

    if (!this.$airCodeviewClose || !this.$airCodeviewClose.length) {
      this.removeAirModeCloseButton({ keepCache: true });
      const tooltip = this.lang?.options?.codeview || 'Code View';
      this.$airCodeviewClose = $$('<button type="button" class="note-air-codeview-close btn btn-outline-secondary btn-sm" tabindex="-1"></button>')
        .html(this.context.ui.icon(this.options.icons.close))
        .attr({
          title: tooltip,
          'aria-label': tooltip,
        });
      this.$airCodeviewClose.on('click', this.handleCloseClick);
      this.$editingArea.append(this.$airCodeviewClose);
    }

    return this.$airCodeviewClose;
  }

  removeAirModeCloseButton(options = {}) {
    const $button = options.keepCache ? this.$editingArea.find('.note-air-codeview-close') : this.$airCodeviewClose;
    if ($button && $button.length) {
      $button.off('click', this.handleCloseClick);
      $button.remove();
    }
    if (!options.keepCache) {
      this.$airCodeviewClose = null;
    }
  }

  handleCloseClick(event) {
    event.preventDefault();
    if (this.isActivated()) {
      this.toggle();
    }
  }

  sync(html) {
    const isCodeview = this.isActivated();
    const CodeMirror = this.CodeMirrorConstructor;

    if (isCodeview) {
      if (html) {
        if (CodeMirror) {
          this.$codable.data('cmEditor').getDoc().setValue(html);
        } else {
          this.$codable.val(html);
        }
      } else {
        if (CodeMirror) {
          this.$codable.data('cmEditor').save();
        }
      }
    }
  }

  initialize() {
    this.$codable.on('keyup', (event) => {
      if (event.keyCode === key.code.ESCAPE) {
        this.deactivate();
      }
    });
  }

  /* @return {Boolean} */
  isActivated() {
    return this.$editor.hasClass('codeview');
  }

  toggle() {
    if (this.isActivated()) {
      this.deactivate();
    } else {
      this.activate();
    }
    this.context.triggerEvent('codeview.toggled');
  }

  /* @returns {*} */
  purify(value) {
    if (this.options.codeviewFilter) {
      
      value = value.replace(this.options.codeviewFilterRegex, '');
      
      if (this.options.codeviewIframeFilter) {
        const whitelist = this.options.codeviewIframeWhitelistSrc.concat(this.options.codeviewIframeWhitelistSrcBase);
        value = value.replace(/(<iframe.*?>.*?(?:<\/iframe>)?)/gi, function(tag) {
          
          if (/<.+src(?==?('|"|\s)?)[\s\S]+src(?=('|"|\s)?)[^>]*?>/i.test(tag)) {
            return '';
          }
          for (const src of whitelist) {
            
            if ((new RegExp('src="(https?:)?\/\/' + src.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\/(.+)"')).test(tag)) {
              return tag;
            }
          }
          return '';
        });
      }
    }
    return value;
  }

  activate() {
    const CodeMirror = this.CodeMirrorConstructor;
    this.$codable.val(dom.html(this.$editable, this.options.prettifyHtml));
    this.$codable.height(this.$editable.height());

    this.context.invoke('toolbar.updateCodeview', true);
    this.context.invoke('airPopover.updateCodeview', true);

    this.$editor.addClass('codeview');
    if (this.isAirMode()) {
      this.ensureAirModeCloseButton();
    }
    this.$codable.trigger('focus');

    if (CodeMirror) {
      const cmEditor = CodeMirror.fromTextArea(this.$codable[0], this.options.codemirror);

      if (this.options.codemirror.tern) {
        const server = new CodeMirror.TernServer(this.options.codemirror.tern);
        cmEditor.ternServer = server;
        cmEditor.on('cursorActivity', (cm) => {
          server.updateArgHints(cm);
        });
      }

      cmEditor.on('blur', (event) => {
        this.context.triggerEvent('blur.codeview', cmEditor.getValue(), event);
      });
      cmEditor.on('change', () => {
        this.context.triggerEvent('change.codeview', cmEditor.getValue(), cmEditor);
      });

      cmEditor.setSize(null, this.$editable.outerHeight());
      this.$codable.data('cmEditor', cmEditor);
    } else {
      this.$codable.on('blur', (event) => {
        this.context.triggerEvent('blur.codeview', this.$codable.val(), event);
      });
      this.$codable.on('input', () => {
        this.context.triggerEvent('change.codeview', this.$codable.val(), this.$codable);
      });
    }
  }

  deactivate() {
    const CodeMirror = this.CodeMirrorConstructor;
    
    if (CodeMirror) {
      const cmEditor = this.$codable.data('cmEditor');
      this.$codable.val(cmEditor.getValue());
      cmEditor.toTextArea();
    }

    const value = this.purify(dom.value(this.$codable, this.options.prettifyHtml) || dom.emptyPara);
    const isChange = this.$editable.html() !== value;

    this.$editable.html(value);
    this.$editable.height(this.options.height ? this.$codable.height() : 'auto');
    this.$editor.removeClass('codeview');
    this.removeAirModeCloseButton();

    if (isChange) {
      this.context.triggerEvent('change', this.$editable.html(), this.$editable);
    }

    this.$editable.trigger('focus');

    this.context.invoke('toolbar.updateCodeview', false);
    this.context.invoke('airPopover.updateCodeview', false);
  }

  destroy() {
    this.removeAirModeCloseButton();
    if (this.isActivated()) {
      this.deactivate();
    }
  }
}