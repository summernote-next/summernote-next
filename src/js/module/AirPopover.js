import $$ from '../core/dom-query.js';
import lists from '../core/lists';
import func from '../core/func';

const AIRMODE_POPOVER_X_OFFSET = -5;
const AIRMODE_POPOVER_Y_OFFSET = 5;
const AIRMODE_POPOVER_EDGE_PADDING = 10;

export default class AirPopover {
  constructor(context) {
    this.context = context;

    this.ui = $$.summernote.ui;
    this.options = context.options;

    this.hidable = true;
    this.onContextmenu = false;
    this.pageX = null;
    this.pageY = null;

    this.events = {
      'summernote.contextmenu': (event) => {
        if (this.options.editing) {
          event.preventDefault();
          event.stopPropagation();
          this.onContextmenu = true;
          this.update(true);
        }
      },
      'summernote.mousedown': (we, event) => {
        this.pageX = event.pageX;
        this.pageY = event.pageY;
      },
      'summernote.keyup summernote.mouseup summernote.scroll': (we, event) => {
        if (this.options.editing && !this.onContextmenu) {
          if (event.type == 'keyup') {
            let range = this.context.invoke('editor.getLastRange');
            let wordRange = range.getWordRange();
            const bnd = func.rect2bnd(lists.last(wordRange.getClientRects()));
            this.pageX = bnd.left;
            this.pageY = bnd.top;
          } else {
            this.pageX = event.pageX;
            this.pageY = event.pageY;
          }
          this.update();
        }
        this.onContextmenu = false;
      },
      'summernote.disable summernote.change summernote.dialog.shown summernote.blur': () => {
        this.hide();
      },
      'summernote.focusout': () => {
        if (!this.$popover.is(':active,:focus')) {
          this.hide();
        }
      },
    };
  }

  shouldInitialize() {
    return this.options.airMode && !lists.isEmpty(this.options.popover.air);
  }

  initialize() {
    this.$popover = this.ui.popover({
      className: 'note-air-popover',
    }).render().appendTo(this.options.container);
    this.$editable = this.context.layoutInfo.editable;
    const $content = this.$popover.find('.popover-content,.note-popover-content');

    this.context.invoke('buttons.build', $content, this.options.popover.air, {
      classPrefix: 'popover',
    });

    // disable hiding this popover preemptively by 'summernote.blur' event.
    this.$popover.on('mousedown', () => { this.hidable = false; });
    // (re-)enable hiding after 'summernote.blur' has been handled (aka. ignored).
    this.$popover.on('mouseup', () => { this.hidable = true; });
  }

  destroy() {
    this.$popover.remove();
  }

  update(forcelyOpen) {
    const styleInfo = this.context.invoke('editor.currentStyle');
    if (styleInfo.range && (!styleInfo.range.isCollapsed() || forcelyOpen)) {
      this.$popover.css('display', 'block');
      this.reposition();
      this.context.invoke('buttons.updateCurrentStyle', this.$popover);
    } else {
      this.hide();
    }
  }

  reposition() {
    // The popover body uses `display: flex` with `gap`, so the popover width
    // only stabilises after the browser finishes laying out the flex children
    // and computing the inter-group gaps. Wait a few frames, then re-measure
    // and re-apply. Repeat until the width is stable.
    let lastWidth = -1;
    let frames = 0;
    const settle = () => {
      if (!this.$popover || !this.$popover[0]) {
        return;
      }
      const popoverWidth = this.$popover[0].offsetWidth;
      if (popoverWidth === lastWidth || frames >= 10) {
        const containerOffset = $$(this.options.container).offset();
        this.applyPosition(containerOffset, popoverWidth);
        return;
      }
      lastWidth = popoverWidth;
      frames++;
      setTimeout(settle, 16);
    };
    setTimeout(settle, 16);
  }

  applyPosition(containerOffset, popoverWidth) {
    let left = this.pageX - containerOffset.left + AIRMODE_POPOVER_X_OFFSET;
    let top = this.pageY - containerOffset.top + AIRMODE_POPOVER_Y_OFFSET;

    let maxRight = window.innerWidth - containerOffset.left - AIRMODE_POPOVER_EDGE_PADDING;
    const editable = this.$editable && this.$editable[0];
    if (editable) {
      const editableRect = editable.getBoundingClientRect();
      const editableRight = editableRect.right - containerOffset.left - AIRMODE_POPOVER_EDGE_PADDING;
      if (editableRight < maxRight) {
        maxRight = editableRight;
      }
    }
    const maxLeft = maxRight - popoverWidth;
    if (left > maxLeft) {
      left = Math.max(AIRMODE_POPOVER_EDGE_PADDING - containerOffset.left, maxLeft);
    }

    this.$popover.css({
      left: Math.max(left, AIRMODE_POPOVER_EDGE_PADDING - containerOffset.left),
      top: top,
    });
  }

  updateCodeview(isCodeview) {
    this.ui.toggleBtnActive(this.$popover.find('.btn-codeview'), isCodeview);
    if (isCodeview) {
      this.hide();
    }
  }

  hide() {
    if (this.hidable) {
      this.$popover.hide();
    }
  }
}