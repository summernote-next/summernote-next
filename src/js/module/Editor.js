import $$ from '../core/dom-query.js';
import env from '../core/env';
import key from '../core/key';
import func from '../core/func';
import lists from '../core/lists';
import dom from '../core/dom';
import range from '../core/range';
import { readFileAsDataURL, createImage } from '../core/async';
import History from '../editing/History';
import Style from '../editing/Style';
import Typing from '../editing/Typing';
import Table from '../editing/Table';
import Bullet from '../editing/Bullet';

const KEY_BOGUS = 'bogus';
const MAILTO_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const TEL_PATTERN = /^\+?\d[\d\s-]{5,}\d$/;
const URL_SCHEME_PATTERN = /^([A-Za-z][A-Za-z0-9+-.]*\:|#|\/)/;

export default class Editor {
  constructor(context) {
    this.context = context;

    this.$note = context.layoutInfo.note;
    this.$editor = context.layoutInfo.editor;
    this.$editable = context.layoutInfo.editable;
    this.options = context.options;
    this.lang = this.options.langInfo;

    this.editable = this.$editable[0];
    this.lastRange = null;
    this.snapshot = null;

    this.style = new Style();
    this.table = new Table();
    this.typing = new Typing(context);
    this.bullet = new Bullet();
    this.history = new History(context);

    this.context.memo('help.escape', this.lang.help.escape);
    this.context.memo('help.undo', this.lang.help.undo);
    this.context.memo('help.redo', this.lang.help.redo);
    this.context.memo('help.tab', this.lang.help.tab);
    this.context.memo('help.untab', this.lang.help.untab);
    this.context.memo('help.insertParagraph', this.lang.help.insertParagraph);
    this.context.memo('help.insertOrderedList', this.lang.help.insertOrderedList);
    this.context.memo('help.insertUnorderedList', this.lang.help.insertUnorderedList);
    this.context.memo('help.indent', this.lang.help.indent);
    this.context.memo('help.outdent', this.lang.help.outdent);
    this.context.memo('help.formatPara', this.lang.help.formatPara);
    this.context.memo('help.insertHorizontalRule', this.lang.help.insertHorizontalRule);
    this.context.memo('help.fontName', this.lang.help.fontName);

    const commands = [
      'bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript',
      'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull',
      'formatBlock', 'removeFormat', 'backColor',
    ];

    for (let idx = 0, len = commands.length; idx < len; idx++) {
      this[commands[idx]] = ((sCmd) => {
        return (value) => {
          this.beforeCommand();
          document.execCommand(sCmd, false, value);
          this.afterCommand(true);
        };
      })(commands[idx]);
      this.context.memo('help.' + commands[idx], this.lang.help[commands[idx]]);
    }

    this.fontName = this.wrapCommand((value) => {
      return this.fontStyling('font-family', env.validFontName(value));
    });

    this.fontSize = this.wrapCommand((value) => {
      const unit = this.currentStyle()['font-size-unit'];
      return this.fontStyling('font-size', value + unit);
    });

    this.fontSizeUnit = this.wrapCommand((value) => {
      const size = this.currentStyle()['font-size'];
      return this.fontStyling('font-size', size + value);
    });

    for (let idx = 1; idx <= 6; idx++) {
      this['formatH' + idx] = ((idx) => {
        return () => {
          this.formatBlock('H' + idx);
        };
      })(idx);
      this.context.memo('help.formatH' + idx, this.lang.help['formatH' + idx]);
    }

    this.insertParagraph = this.wrapCommand(() => {
      this.typing.insertParagraph(this.editable);
    });

    this.insertOrderedList = this.wrapCommand(() => {
      this.bullet.insertOrderedList(this.editable);
    });

    this.insertUnorderedList = this.wrapCommand(() => {
      this.bullet.insertUnorderedList(this.editable);
    });

    this.indent = this.wrapCommand(() => {
      this.bullet.indent(this.editable);
    });

    this.outdent = this.wrapCommand(() => {
      this.bullet.outdent(this.editable);
    });

    /* @param {Node} */
    this.insertNode = this.wrapCommand((node) => {
      if (this.isLimited($$(node).text().length)) {
        return;
      }
      const rng = this.getLastRange();
      rng.insertNode(node);
      this.setLastRange(range.createFromNodeAfter(node).select());
    });

    /* @param {String} */
    this.insertText = this.wrapCommand((text) => {
      if (this.isLimited(text.length)) {
        return;
      }
      const rng = this.getLastRange();
      const textNode = rng.insertNode(dom.createText(text));
      this.setLastRange(range.create(textNode, dom.nodeLength(textNode)).select());
    });

    /* @param {String} */
    this.pasteHTML = this.wrapCommand((markup) => {
      if (this.isLimited(markup.length)) {
        return;
      }
      markup = this.context.invoke('codeview.purify', markup);
      const contents = this.getLastRange().pasteHTML(markup);
      this.setLastRange(range.createFromNodeAfter(lists.last(contents)).select());
    });

    /* @param {String} */
    this.formatBlock = this.wrapCommand((tagName, $target) => {
      const onApplyCustomStyle = this.options.callbacks.onApplyCustomStyle;
      if (onApplyCustomStyle) {
        onApplyCustomStyle.call(this, $target, this.context, this.onFormatBlock);
      } else {
        this.onFormatBlock(tagName, $target);
      }
    });

    this.insertHorizontalRule = this.wrapCommand(() => {
      const hrNode = this.getLastRange().insertNode(dom.create('HR'));
      if (hrNode.nextSibling) {
        this.setLastRange(range.create(hrNode.nextSibling, 0).normalize().select());
      }
    });

    /* @param {String} */
    this.lineHeight = this.wrapCommand((value) => {
      this.style.stylePara(this.getLastRange(), {
        lineHeight: value,
      });
    });

    /* @param {Object} */
    this.createLink = this.wrapCommand((linkInfo) => {
      let rel = [];
      let linkUrl = linkInfo.url;
      const linkText = linkInfo.text;
      const isNewWindow = linkInfo.isNewWindow;
      const addNoReferrer = this.options.linkAddNoReferrer;
      const addNoOpener = this.options.linkAddNoOpener;
      let rng = linkInfo.range || this.getLastRange();
      const additionalTextLength = linkText.length - rng.toString().length;
      if (additionalTextLength > 0 && this.isLimited(additionalTextLength)) {
        return;
      }
      const isTextChanged = rng.toString() !== linkText;

      if (typeof linkUrl === 'string') {
        linkUrl = linkUrl.trim();
      }

      if (this.options.onCreateLink) {
        linkUrl = this.options.onCreateLink(linkUrl);
      } else {
        linkUrl = this.checkLinkUrl(linkUrl);
      }

      linkUrl = func.sanitizeUrl(linkUrl);

      let anchors = [];
      if (isTextChanged) {
        rng = rng.deleteContents();
        const anchor = rng.insertNode($$('<A></A>').text(linkText)[0]);
        anchors.push(anchor);
      } else {
        anchors = this.style.styleNodes(rng, {
          nodeName: 'A',
          expandClosestSibling: true,
          onlyPartialContains: true,
        });
      }

      $$.each(anchors, (idx, anchor) => {
        $$(anchor).attr('href', linkUrl);
        if (isNewWindow) {
          $$(anchor).attr('target', '_blank');
          if (addNoReferrer) {
            rel.push('noreferrer');
          }
          if (addNoOpener) {
            rel.push('noopener');
          }
          if (rel.length) {
            $$(anchor).attr('rel', rel.join(' '));
          }
        } else {
          $$(anchor).removeAttr('target');
        }
      });

      this.setLastRange(
        this.createRangeFromList(anchors).select(),
      );
    });

    /* @param {Object} @param {String} @param {String} */
    this.color = this.wrapCommand((colorInfo) => {
      const foreColor = colorInfo.foreColor;
      const backColor = colorInfo.backColor;

      if (foreColor) { document.execCommand('foreColor', false, foreColor); }
      if (backColor) { document.execCommand('backColor', false, backColor); }
    });

    /* @param {String} */
    this.foreColor = this.wrapCommand((colorInfo) => {
      document.execCommand('foreColor', false, colorInfo);
    });

    /* @param {String} */
    this.insertTable = this.wrapCommand((dim) => {
      const dimension = dim.split('x');

      const rng = this.getLastRange().deleteContents();
      rng.insertNode(this.table.createTable(dimension[0], dimension[1], this.options));
    });

    this.removeMedia = this.wrapCommand(() => {
      let $target = $$(this.restoreTarget()).parent();
      if ($target.closest('figure').length) {
        $target.closest('figure').remove();
      } else {
        $target = $$(this.restoreTarget()).detach();
      }
      
      this.setLastRange(range.createFromSelection($target).select());
      this.context.triggerEvent('media.delete', $target, this.$editable);
    });

    /* @param {String} */
    this.floatMe = this.wrapCommand((value) => {
      const $target = $$(this.restoreTarget());
      $target.toggleClass('note-float-left', value === 'left');
      $target.toggleClass('note-float-right', value === 'right');
      $target.css('float', (value === 'none' ? '' : value));
    });

    /* @param {String} */
    this.resize = this.wrapCommand((value) => {
      const $target = $$(this.restoreTarget());
      value = parseFloat(value);
      if (value === 0) {
        $target.css('width', '');
      } else {
        $target.css({
          width: value * 100 + '%',
          height: '',
        });
      }
    });

    this.playMedia = this.wrapCommand(() => {
      const target = this.restoreTarget();
      if (!target) {
        return;
      }

      $$(target).addClass('note-video-interactive');

      if (target instanceof HTMLVideoElement) {
        if (typeof target.play === 'function') {
          target.play();
        }
        return;
      }

      if (target instanceof HTMLIFrameElement) {
        const source = target.getAttribute('src');
        if (!source) {
          return;
        }

        const normalizedSource = source.startsWith('//')
          ? `${window.location.protocol}${source}`
          : source;
        const url = new URL(normalizedSource, window.location.href);
        url.searchParams.set('autoplay', '1');

        const nextSource = source.startsWith('//')
          ? url.toString().replace(/^https?:/, '')
          : url.toString();
        target.setAttribute('src', nextSource);
      }
    });
  }

  initialize() {
    
    this.$editable.on('keydown', (event) => {
      if (event.keyCode === key.code.ENTER) {
        this.context.triggerEvent('enter', event);
      }
      this.context.triggerEvent('keydown', event);

      this.snapshot = this.history.makeSnapshot();
      this.hasKeyShortCut = false;
      if (!event.isDefaultPrevented()) {
        if (this.options.shortcuts) {
          this.hasKeyShortCut = this.handleKeyMap(event);
        } else {
          this.preventDefaultEditableShortCuts(event);
        }
      }
      if (this.isLimited(1, event)) {
        const lastRange = this.getLastRange();
        if (lastRange.eo - lastRange.so === 0) {
          return false;
        }
      }
      this.setLastRange();

      if (this.options.recordEveryKeystroke) {
        if (this.hasKeyShortCut === false) {
          this.history.recordUndo();
        }
      }
    }).on('keyup', (event) => {
      this.setLastRange();
      this.context.triggerEvent('keyup', event);
    }).on('focus', (event) => {
      this.setLastRange();
      this.context.triggerEvent('focus', event);
    }).on('blur', (event) => {
      this.context.triggerEvent('blur', event);
    }).on('mousedown', (event) => {
      this.context.triggerEvent('mousedown', event);
    }).on('mouseup', (event) => {
      this.setLastRange();
      this.history.recordUndo();
      this.context.triggerEvent('mouseup', event);
    }).on('scroll', (event) => {
      this.context.triggerEvent('scroll', event);
    }).on('paste', (event) => {
      this.setLastRange();
      this.context.triggerEvent('paste', event);
    }).on('copy', (event) => {
      this.context.triggerEvent('copy', event);
    }).on('input', () => {
      
      if (this.isLimited(0) && this.snapshot) {
        this.history.applySnapshot(this.snapshot);
      }
    });

    this.$editable.attr('spellcheck', this.options.spellCheck);

    this.$editable.attr('autocorrect', this.options.spellCheck);

    if (this.options.disableGrammar) {
      this.$editable.attr('data-gramm', false);
    }

    this.$editable.html(dom.html(this.$note) || dom.emptyPara);

    this.$editable.on(env.inputEventName, func.debounce(() => {
      this.context.triggerEvent('change', this.$editable.html(), this.$editable);
    }, 10));

    this.$editable.on('focusin', (event) => {
      this.context.triggerEvent('focusin', event);
    }).on('focusout', (event) => {
      this.context.triggerEvent('focusout', event);
    });

    if (this.options.airMode) {
      if (this.options.overrideContextMenu) {
        this.$editor.on('contextmenu', (event) => {
          this.context.triggerEvent('contextmenu', event);
          return false;
        });
      }
    } else {
      if (this.options.width) {
        this.$editor.outerWidth(this.options.width);
      }
      if (this.options.height) {
        this.$editable.outerHeight(this.options.height);
      }
      if (this.options.maxHeight) {
        this.$editable.css('max-height', this.options.maxHeight);
      }
      if (this.options.minHeight) {
        this.$editable.css('min-height', this.options.minHeight);
      }
    }

    this.history.recordUndo();
    this.setLastRange();
  }

  destroy() {
    this.$editable.off();
  }

  handleKeyMap(event) {
    const keyMap = this.options.keyMap[env.isMac ? 'mac' : 'pc'];
    const keys = [];

    if (event.metaKey) { keys.push('CMD'); }
    if (event.ctrlKey && !event.altKey) { keys.push('CTRL'); }
    if (event.shiftKey) { keys.push('SHIFT'); }

    const keyName = key.nameFromCode[event.keyCode];
    if (keyName) {
      keys.push(keyName);
    }

    const eventName = keyMap[keys.join('+')];

    if (keyName === 'TAB' && !this.options.tabDisable) {
      this.afterCommand();
    } else if (eventName) {
      if (this.context.invoke(eventName) !== false) {
        event.preventDefault();
        return true;
      }
    } else if (key.isEdit(event.keyCode)) {
      if (key.isRemove(event.keyCode)) {
        this.context.invoke('removed');
      }
      this.afterCommand();
    }
    return false;
  }

  preventDefaultEditableShortCuts(event) {
    
    if ((event.ctrlKey || event.metaKey) &&
      lists.contains([66, 73, 85], event.keyCode)) {
      event.preventDefault();
    }
  }

  isLimited(pad, event) {
    pad = pad || 0;

    if (typeof event !== 'undefined') {
      if (key.isMove(event.keyCode) ||
          key.isNavigation(event.keyCode) ||
          (event.ctrlKey || event.metaKey) ||
          lists.contains([key.code.BACKSPACE, key.code.DELETE], event.keyCode)) {
        return false;
      }
    }

    if (this.options.maxTextLength > 0) {
      if ((this.$editable.text().length + pad) > this.options.maxTextLength) {
        return true;
      }
    }
    return false;
  }

  checkLinkUrl(linkUrl) {
    if (MAILTO_PATTERN.test(linkUrl)) {
      return 'mailto:' + linkUrl;
    } else if (TEL_PATTERN.test(linkUrl)) {
      return 'tel:' + linkUrl;
    } else if (!URL_SCHEME_PATTERN.test(linkUrl)) {
      return 'http://' + linkUrl;
    }
    return func.sanitizeUrl(linkUrl);
  }

  /* @return {WrappedRange} */
  createRange() {
    this.focus();
    this.setLastRange();
    return this.getLastRange();
  }

  /* @param {list} @return {WrappedRange} */
  createRangeFromList(lst) {
    const startRange = range.createFromNodeBefore(lists.head(lst));
    const startPoint = startRange.getStartPoint();
    const endRange = range.createFromNodeAfter(lists.last(lst));
    const endPoint = endRange.getEndPoint();

    return range.create(
      startPoint.node,
      startPoint.offset,
      endPoint.node,
      endPoint.offset,
    );
  }

  /* @param {WrappedRange} */
  setLastRange(rng) {
    if (rng) {
      this.lastRange = rng;
    } else {
      this.lastRange = range.create(this.editable);

      if ($$(this.lastRange.sc).closest('.note-editable').length === 0) {
        this.lastRange = range.createFromBodyElement(this.editable);
      }
    }
  }

  /* @return {WrappedRange} */
  getLastRange() {
    
    const currentSelection = range.createFromSelection();
    const selectionContainer = currentSelection?.sc?.nodeType === Node.TEXT_NODE
      ? currentSelection.sc.parentElement
      : currentSelection?.sc;

    if (currentSelection && $$(selectionContainer).closest('.note-editable').get(0) === this.editable) {
      
      this.lastRange = currentSelection;
      return this.lastRange;
    }

    if (!this.lastRange) {
      this.setLastRange();
    }
    return this.lastRange;
  }

  /* @param {Boolean} */
  saveRange(thenCollapse) {
    const currentRange = this.getLastRange();

    if (thenCollapse) {
      currentRange.collapse().select();
    }
  }

  restoreRange() {
    if (this.lastRange) {
      this.lastRange.select();
      this.focus();
    }
  }

  saveTarget(node) {
    this.$editable.data('target', node);
  }

  clearTarget() {
    this.$editable.removeData('target');
  }

  restoreTarget() {
    return this.$editable.data('target');
  }

  getTableCommandRange() {
    const rng = this.getLastRange(this.$editable);
    if (rng.isCollapsed() && rng.isOnCell()) {
      return rng;
    }

    const target = this.restoreTarget();
    const cell = dom.isCell(target) ? target : dom.ancestor(target, dom.isCell);
    if (!cell || !this.editable.contains(cell)) {
      return null;
    }

    const cellRange = range.createFromNode(cell).collapse(true);
    this.setLastRange(cellRange);
    return cellRange;
  }

  /* @return {Object|Boolean} */
  currentStyle() {
    const rng = this.getLastRange();
    return rng ? this.style.current(rng.normalize()) : this.style.fromNode(this.$editable);
  }

  /* @param {DomQuery|Element} @return {Object} */
  styleFromNode($node) {
    return this.style.fromNode($node);
  }

  undo() {
    this.context.triggerEvent('before.command', this.$editable.html());
    this.history.undo();
    this.context.triggerEvent('change', this.$editable.html(), this.$editable);
  }

  commit() {
    this.context.triggerEvent('before.command', this.$editable.html());
    this.history.commit();
    this.context.triggerEvent('change', this.$editable.html(), this.$editable);
  }

  redo() {
    this.context.triggerEvent('before.command', this.$editable.html());
    this.history.redo();
    this.context.triggerEvent('change', this.$editable.html(), this.$editable);
  }

  beforeCommand() {
    this.context.triggerEvent('before.command', this.$editable.html());

    document.execCommand('styleWithCSS', false, this.options.styleWithCSS);

    this.focus();
  }

  /* @param {Boolean} */
  afterCommand(isPreventTrigger) {
    this.normalizeContent();
    this.history.recordUndo();
    if (!isPreventTrigger) {
      this.context.triggerEvent('change', this.$editable.html(), this.$editable);
    }
  }

  tab() {
    const rng = this.getLastRange();
    if (rng.isCollapsed() && rng.isOnCell()) {
      this.table.tab(rng);
    } else {
      if (this.options.tabSize === 0) {
        return false;
      }

      if (!this.isLimited(this.options.tabSize)) {
        this.beforeCommand();
        this.typing.insertTab(rng, this.options.tabSize);
        this.afterCommand();
      }
    }
  }

  untab() {
    const rng = this.getLastRange();
    if (rng.isCollapsed() && rng.isOnCell()) {
      this.table.tab(rng, true);
    } else {
      if (this.options.tabSize === 0) {
        return false;
      }
    }
  }

  wrapCommand(fn) {
    return function() {
      this.beforeCommand();
      fn.apply(this, arguments);
      this.afterCommand();
    };
  }
  
  removed(rng, node, tagName) { 
    rng = range.create();
    if (rng.isCollapsed() && rng.isOnCell()) {
      node = rng.ec;
      if( (tagName = node.tagName) &&
				(node.childElementCount === 1) &&
				(node.childNodes[0].tagName === "BR") ){

        if(tagName === "P") {
          node.remove();
        } else if(['TH', 'TD'].indexOf(tagName) >=0) {
          node.firstChild.remove();
        }
      }
    }
  }
  /* @param {String} @param {String|Function} @return {Promise} */
  insertImage(src, param) {
    const insertRange = this.getLastRange();
    const normalizedInsertRange = dom.isEditable(insertRange.sc) && dom.isEditable(insertRange.ec)
      ? range.createFromBodyElement(this.editable, insertRange.isCollapsed() && insertRange.so === 0)
      : insertRange;

    return createImage(src, param).then(($image) => {
      this.beforeCommand();

      if (typeof param === 'function') {
        param($image);
      } else {
        if (typeof param === 'string') {
          $image.attr('data-filename', param);
        }
        const imageNode = $image[0];
        const editableWidth = this.$editable.width();
        const intrinsicWidth = imageNode?.naturalWidth || imageNode?.width || $image.width();

        if (editableWidth && intrinsicWidth && intrinsicWidth > editableWidth) {
          $image.css('width', editableWidth);
        } else {
          $image.css('width', '');
        }
      }

      $image.show();
      normalizedInsertRange.insertNode($image[0]);
      this.setLastRange(range.createFromNodeAfter($image[0]).select());
      this.afterCommand();
    }).catch((e) => {
      this.context.triggerEvent('image.upload.error', e);
    });
  }

  /* @param {File[]} */
  insertImagesAsDataURL(files) {
    $$.each(files, (idx, file) => {
      const filename = file.name;
      if (this.options.maximumImageFileSize && this.options.maximumImageFileSize < file.size) {
        this.context.triggerEvent('image.upload.error', this.lang.image.maximumFileSizeError);
      } else {
        readFileAsDataURL(file).then((dataURL) => {
          return this.insertImage(dataURL, filename);
        }).catch(() => {
          this.context.triggerEvent('image.upload.error');
        });
      }
    });
  }

  /* @param {File[]} */
  insertImagesOrCallback(files) {
    const callbacks = this.options.callbacks;
    const normalizedFiles = Array.from(files || []);

    if (!normalizedFiles.length) {
      return;
    }

    if (callbacks.onImageUpload) {
      this.context.triggerEvent('image.upload', normalizedFiles);
      
    } else {
      this.insertImagesAsDataURL(normalizedFiles);
    }
  }

  /* @return {String} */
  getSelectedText() {
    let rng = this.getLastRange();

    if (rng.isOnAnchor()) {
      rng = range.createFromNode(dom.ancestor(rng.sc, dom.isAnchor));
    }

    return rng.toString();
  }

  onFormatBlock(tagName, $target) {
    
    document.execCommand('FormatBlock', false, env.isMSIE ? '<' + tagName + '>' : tagName);

    if ($target && $target.length) {
      
      if ($target[0].tagName.toUpperCase() !== tagName.toUpperCase()) {
        $target = $target.find(tagName);
      }

      if ($target && $target.length) {
        const currentRange = this.createRange();
        const $parent = $$([currentRange.sc, currentRange.ec]).closest(tagName);
        
        $parent.removeClass();
        const className = $target[0].className || '';
        if (className) {
          $parent.addClass(className);
        }
      }
    }
  }

  formatPara() {
    this.formatBlock('P');
  }

  fontStyling(target, value) {
    const rng = this.getLastRange();

    if (rng !== '') {
      const spans = this.style.styleNodes(rng);
      this.$editor.find('.note-status-output').html('');
      $$(spans).css(target, value);

      if (rng.isCollapsed()) {
        const firstSpan = lists.head(spans);
        if (firstSpan && !dom.nodeLength(firstSpan)) {
          firstSpan.innerHTML = dom.ZERO_WIDTH_NBSP_CHAR;
          range.createFromNode(firstSpan.firstChild).select();
          this.setLastRange();
          this.$editable.data(KEY_BOGUS, firstSpan);
        }
      } else {
        rng.select();
      }
    } else {
      const noteStatusOutput = Date.now();
      this.$editor.find('.note-status-output').html('<div id="note-status-output-' + noteStatusOutput + '" class="alert alert-info">' + this.lang.output.noSelection + '</div>');
      setTimeout(function() { $$('#note-status-output-' + noteStatusOutput).remove(); }, 5000);
    }
  }

  unlink() {
    let rng = this.getLastRange();
    if (rng.isOnAnchor()) {
      const anchor = dom.ancestor(rng.sc, dom.isAnchor);
      rng = range.createFromNode(anchor);
      rng.select();
      this.setLastRange();

      this.beforeCommand();
      document.execCommand('unlink');
      this.afterCommand();
    }
  }

  /* @return {Object} @return {WrappedRange} @return {String} @return {Boolean} @return {String} */
  getLinkInfo() {
    if (!this.hasFocus()) {
      this.focus();
    }

    const rng = this.getLastRange().expand(dom.isAnchor);
    
    const $anchor = $$(lists.head(rng.nodes(dom.isAnchor)));
    const linkInfo = {
      range: rng,
      text: rng.toString(),
      url: $anchor.length ? $anchor.attr('href') : '',
    };

    if ($anchor.length) {
      
      linkInfo.isNewWindow = $anchor.attr('target') === '_blank';
    }

    return linkInfo;
  }

  addRow(position) {
    const rng = this.getTableCommandRange();
    if (rng) {
      this.beforeCommand();
      this.table.addRow(rng, position);
      this.afterCommand();
    }
  }

  addCol(position) {
    const rng = this.getTableCommandRange();
    if (rng) {
      this.beforeCommand();
      this.table.addCol(rng, position);
      this.afterCommand();
    }
  }

  deleteRow() {
    const rng = this.getTableCommandRange();
    if (rng) {
      this.beforeCommand();
      this.table.deleteRow(rng);
      this.afterCommand();
    }
  }

  deleteCol() {
    const rng = this.getTableCommandRange();
    if (rng) {
      this.beforeCommand();
      this.table.deleteCol(rng);
      this.afterCommand();
    }
  }

  deleteTable() {
    const rng = this.getTableCommandRange();
    if (rng) {
      this.beforeCommand();
      this.table.deleteTable(rng);
      this.afterCommand();
    }
  }

  /* @param {Position} @param {DomQuery} @param {Boolean} */
  resizeTo(pos, $target, bKeepRatio) {
    let imageSize;
    if (bKeepRatio) {
      const newRatio = pos.y / pos.x;
      const ratio = $target.data('ratio');
      imageSize = {
        width: ratio > newRatio ? pos.x : pos.y / ratio,
        height: ratio > newRatio ? pos.x * ratio : pos.y,
      };
    } else {
      imageSize = {
        width: pos.x,
        height: pos.y,
      };
    }

    $target.css(imageSize);
  }

  hasFocus() {
    return this.$editable.is(':focus');
  }

  focus() {
    
    if (!this.hasFocus()) {
      const preservedRange = this.lastRange;
      this.$editable.trigger('focus');
      if (preservedRange) {
        preservedRange.select();
        this.lastRange = preservedRange;
      }
    }
  }

  /* @return {Boolean} */
  isEmpty() {
    return dom.isEmpty(this.$editable[0]) || dom.emptyPara === this.$editable.html();
  }

  empty() {
    this.context.invoke('code', dom.emptyPara);
  }

  normalizeContent() {
    this.$editable[0].normalize();
  }
}