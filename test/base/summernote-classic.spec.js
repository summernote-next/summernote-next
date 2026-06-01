import { beforeEach, describe, expect, it } from 'vitest';
import $$ from '@/js/core/dom-query.js';
import Context from '@/js/Context';
import '@/styles/classic/summernote-next-classic';

describe('summernote classic bundle', () => {
  beforeEach(() => {
    $$('body').empty();
    delete window.bootstrap;
  });

  it('registers the classic interface and shows dialogs without Bootstrap JS', () => {
    const ui = $$.summernote.ui_template({});
    const $dialog = ui.dialog({
      title: 'Classic dialog',
      body: '<p>Content</p>',
      footer: '<button type="button" class="note-confirm">Save</button>',
    }).render($$('body'));

    let shown = 0;
    let hidden = 0;

    ui.onDialogShown($dialog, () => {
      shown += 1;
    });
    ui.onDialogHidden($dialog, () => {
      hidden += 1;
    });

    ui.showDialog($dialog);
    expect($$.summernote.interface).to.equal('classic');
    expect($dialog.hasClass('show')).to.be.true;
    expect(document.body.classList.contains('note-modal-open')).to.be.true;
    expect(document.querySelector('.note-modal-backdrop')).not.to.equal(null);
    expect(shown).to.equal(1);

    ui.hideDialog($dialog);
    expect($dialog.hasClass('show')).to.be.false;
    expect(document.body.classList.contains('note-modal-open')).to.be.false;
    expect(document.querySelector('.note-modal-backdrop')).to.equal(null);
    expect(hidden).to.equal(1);
  });

  it('positions classic dropdown menus below their toggle button', () => {
    const $note = $$('<div><p>hello</p></div>').appendTo('body');
    const context = new Context($note, $$.extend({}, $$.summernote.options));
    const $toggle = context.layoutInfo.toolbar.find('[data-note-toggle="dropdown"]').first();

    $toggle.trigger('click');

    const $menu = context.layoutInfo.toolbar.find('.note-dropdown-menu.show').first();
    const toggleRect = $toggle[0].getBoundingClientRect();
    const menuRect = $menu[0].getBoundingClientRect();

    expect($menu.length).to.equal(1);
    expect(menuRect.top).to.be.greaterThan(toggleRect.bottom - 1);
    expect(menuRect.left).to.equal(toggleRect.left);
  });

  it('keeps toolbar button icons from intercepting pointer clicks', () => {
    const $note = $$('<div><p>hello</p></div>').appendTo('body');
    const context = new Context($note, $$.extend({}, $$.summernote.options));
    const $pictureButton = context.layoutInfo.toolbar.find('.note-btn[aria-label="Picture"]').first();
    const $pictureIcon = $pictureButton.find('.note-icon-picture').first();

    expect(getComputedStyle($pictureButton[0]).pointerEvents).to.equal('auto');
    expect(getComputedStyle($pictureIcon[0]).pointerEvents).to.equal('none');
  });

  it('keeps classic color palettes side by side in the rebuilt dropdown', () => {
    const $note = $$('<div><p>hello</p></div>').appendTo('body');
    const context = new Context($note, $$.extend({}, $$.summernote.options));
    const $toggle = context.layoutInfo.toolbar.find('.note-btn[aria-label="More Color"]').first();

    $toggle.trigger('click');

    const $menu = context.layoutInfo.toolbar.find('.note-color .note-dropdown-menu.show').first();
    const $palettes = $menu.find('.note-palette');
    const firstPaletteTop = $palettes[0].getBoundingClientRect().top;
    const secondPaletteTop = $palettes[1].getBoundingClientRect().top;

    expect($palettes.length).to.equal(2);
    expect(getComputedStyle($menu[0]).display).to.equal('flex');
    expect(Math.abs(firstPaletteTop - secondPaletteTop)).to.be.lessThan(1);
  });

  it('shrinks the classic paragraph dropdown to its button groups', () => {
    const $note = $$('<div><p>hello</p></div>').appendTo('body');
    const context = new Context($note, $$.extend({}, $$.summernote.options));
    const $toggle = context.layoutInfo.toolbar.find('.note-btn[aria-label="Paragraph"]').first();

    $toggle.trigger('click');

    const $menu = context.layoutInfo.toolbar.find('.note-para .note-dropdown-menu.show').first();
    const menuRect = $menu[0].getBoundingClientRect();
    const groupRects = Array.from($menu[0].children).map((group) => group.getBoundingClientRect());
    const rightmostGroupEdge = Math.max(...groupRects.map((rect) => rect.right));
    const rightGap = menuRect.right - rightmostGroupEdge;
    const menuStyles = getComputedStyle($menu[0]);

    expect(getComputedStyle($menu[0]).display).to.equal('flex');
    expect(rightGap).to.be.greaterThan(1);
    expect(rightGap).to.be.lessThan(8);
    expect(menuStyles.paddingRight).to.equal(menuStyles.paddingLeft);
  });

  it('renders the rebuilt classic help dialog layout', () => {
    const $note = $$('<div><p>hello</p></div>').appendTo('body');
    const context = new Context($note, $$.extend({}, $$.summernote.options));
    const $helpButton = context.layoutInfo.toolbar.find('.note-btn[aria-label="Help"]').first();

    $helpButton.trigger('click');

    const $dialog = $$('.note-help-dialog-modal');
    const $dialogFrame = $dialog.find('.modal-dialog').first();
    const $helpDialog = $dialog.find('.note-help-dialog').first();
    const $helpItem = $dialog.find('.note-help-dialog-item').first();

    expect($dialog.hasClass('show')).to.be.true;
    expect(getComputedStyle($dialogFrame[0]).maxWidth).to.equal('760px');
    expect(getComputedStyle($helpDialog[0]).display).to.equal('flex');
    expect(getComputedStyle($helpItem[0]).display).to.equal('grid');
  });

  it('closes the fallback modal when clicking a dismiss button inside the dialog', () => {
    const ui = $$.summernote.ui_template({});
    const $dialog = ui.dialog({
      title: 'Dismiss test',
      body: '<p>Content</p>',
      footer: '<button type="button" data-bs-dismiss="modal">Close</button>',
    }).render($$('body'));

    ui.showDialog($dialog);
    expect($dialog.hasClass('show')).to.be.true;

    const closeBtn = $dialog.find('[data-bs-dismiss="modal"]')[0];
    closeBtn.dispatchEvent(new Event('click', { bubbles: true }));

    expect($dialog.hasClass('show')).to.be.false;
    expect(document.querySelector('.note-modal-backdrop')).to.equal(null);
  });

  it('closes the fallback modal when clicking the backdrop', () => {
    const ui = $$.summernote.ui_template({});
    const $dialog = ui.dialog({
      title: 'Backdrop test',
      body: '<p>Content</p>',
      footer: '<button type="button" class="note-confirm">OK</button>',
    }).render($$('body'));

    ui.showDialog($dialog);
    expect(document.querySelector('.note-modal-backdrop')).not.to.equal(null);

    const backdrop = document.querySelector('.note-modal-backdrop');
    backdrop.dispatchEvent(new Event('click'));

    expect($dialog.hasClass('show')).to.be.false;
    expect(document.querySelector('.note-modal-backdrop')).to.equal(null);
  });

  it('closes the fallback modal when pressing Escape', () => {
    const ui = $$.summernote.ui_template({});
    const $dialog = ui.dialog({
      title: 'Escape test',
      body: '<p>Content</p>',
      footer: '<button type="button" class="note-confirm">OK</button>',
    }).render($$('body'));

    ui.showDialog($dialog);
    expect($dialog.hasClass('show')).to.be.true;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect($dialog.hasClass('show')).to.be.false;
    expect(document.querySelector('.note-modal-backdrop')).to.equal(null);
  });

  it('ignores repeated show calls when the fallback modal is already visible', () => {
    const ui = $$.summernote.ui_template({});
    const $dialog = ui.dialog({
      title: 'Double show test',
      body: '<p>Content</p>',
      footer: '<button type="button" class="note-confirm">OK</button>',
    }).render($$('body'));

    ui.showDialog($dialog);
    expect(document.querySelectorAll('.note-modal-backdrop').length).to.equal(1);

    ui.showDialog($dialog);
    expect(document.querySelectorAll('.note-modal-backdrop').length).to.equal(1);

    ui.hideDialog($dialog);
  });
});
