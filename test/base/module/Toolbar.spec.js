import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from '/test/util';
import $$ from '@/js/core/dom-query.js';
import Context from '@/js/Context';
import Toolbar from '@/js/module/Toolbar';
import { loadAllIcons } from '@/js/icons-svg.js';
import '@/styles/bs5/summernote-bs5';

async function paintToolbarIcons() {
  // The icon SVGs are fetched lazily by the bs5 ui template. Wait for the
  // fetch promise so every glyph used by the current toolbar is painted
  // before measuring layout, otherwise we would observe placeholder
  // wrappers instead of the rendered icons.
  await loadAllIcons();
  await nextTick();
}

async function waitForSvg(button) {
  for (let i = 0; i < 40; i++) {
    const icons = button.querySelectorAll('.note-icon');
    let ready = icons.length > 0;
    icons.forEach((icon) => {
      if (!icon.querySelector(':scope > svg')) {
        ready = false;
      }
    });
    if (ready) {
      await nextTick();
      return;
    }
    await nextTick();
  }
}

describe('Toolbar', () => {
  let context;
  let toolbar;
  let $toolbar;

  beforeEach(() => {
    $$('body').empty();
    context = new Context(
      $$('<div><p>hello</p></div>').appendTo('body'),
      $$.extend({}, $$.summernote.options, {
        toolbar: [
          ['style', ['style']],
          ['font', ['bold', 'italic', 'underline', 'fontname']],
          ['para', ['ul', 'ol', 'paragraph', 'height']],
          ['view', ['fullscreen', 'codeview', 'help']],
        ],
      }),
    );
    toolbar = context.modules.toolbar;
    $toolbar = context.layoutInfo.toolbar;
  });

  afterEach(() => {
    context?.destroy();
    $$('body').empty();
  });

  it('initializes in air mode to wire dropdown handlers for the air popover', () => {
    const instance = new Toolbar({
      layoutInfo: context.layoutInfo,
      options: { ...context.options, airMode: true },
    });

    expect(instance.shouldInitialize()).to.equal(true);
  });

  it('hides the toolbar when no groups are configured', () => {
    context.destroy();
    context = new Context(
      $$('<div><p>hello</p></div>').appendTo('body'),
      $$.extend({}, $$.summernote.options, {
        toolbar: [],
      }),
    );

    expect(context.layoutInfo.toolbar.css('display')).to.equal('none');
  });

  it('opens and closes dropdown groups through toolbar and document interactions', async() => {
    const $styleButton = $toolbar.find('.dropdown-style').siblings('.dropdown-toggle');
    const group = toolbar.getDropdownGroup($styleButton[0]);
    const incompleteGroup = $$('<div class="note-btn-group"><button data-note-toggle="dropdown"></button></div>')[0];

    expect(toolbar.getDropdownGroup(document.createTextNode('x'))).to.equal(null);
    expect(toolbar.getDropdownGroup(document.createElement('div'))).to.equal(null);
    expect(toolbar.getDropdownGroup(incompleteGroup)).to.equal(null);
    expect(toolbar.getDropdownParts(null)).to.deep.equal({});
    expect(toolbar.isDropdownOpen(incompleteGroup)).to.equal(false);
    toolbar.openDropdown(incompleteGroup);
    toolbar.closeDropdown(incompleteGroup);

    toolbar.openDropdown(group);
    expect(toolbar.isDropdownOpen(group)).to.equal(true);

    toolbar.handleDocumentKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(toolbar.isDropdownOpen(group)).to.equal(false);

    $styleButton[0].click();
    await nextTick();
    expect(toolbar.isDropdownOpen(group)).to.equal(true);

    toolbar.handleToolbarClick({
      target: $styleButton[0],
      preventDefault: vi.fn(),
    });
    expect(toolbar.isDropdownOpen(group)).to.equal(false);

    toolbar.handleDocumentClick(new Event('click'));
    expect(toolbar.isDropdownOpen(group)).to.equal(false);
  });

  it('prevents toolbar mousedown only for actionable elements', () => {
    const preventDefault = vi.fn();
    const invoke = vi.spyOn(context, 'invoke');
    const textInput = document.createElement('input');
    const plainDiv = document.createElement('div');
    const button = $toolbar.find('button')[0];

    toolbar.handleToolbarMouseDown({ target: null, preventDefault });
    toolbar.handleToolbarMouseDown({ target: textInput, preventDefault });
    toolbar.handleToolbarMouseDown({ target: plainDiv, preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();

    toolbar.handleToolbarMouseDown({ target: button, preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith('editor.saveRange');
  });

  it('prevents default on dropdown menu clicks without saving range', () => {
    const preventDefault = vi.fn();
    const invoke = vi.spyOn(context, 'invoke');
    const $dropdownMenu = $toolbar.find('.note-dropdown-menu').first();

    toolbar.handleToolbarMouseDown({ target: $dropdownMenu[0], preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(invoke).not.toHaveBeenCalledWith('editor.saveRange');
  });

  it('ignores non-element toolbar clicks and closes dropdowns for buttons and menus', async() => {
    const $styleButton = $toolbar.find('.dropdown-style').siblings('.dropdown-toggle');
    const $styleMenu = $toolbar.find('.dropdown-style');
    const group = toolbar.getDropdownGroup($styleButton[0]);
    const $fullscreenButton = $toolbar.find('.btn-fullscreen');

    toolbar.handleToolbarClick({ target: null, preventDefault: vi.fn() });

    $styleButton[0].click();
    await nextTick();
    expect(toolbar.isDropdownOpen(group)).to.equal(true);

    toolbar.handleToolbarClick({
      target: $toolbar[0],
      preventDefault: vi.fn(),
    });
    expect(toolbar.isDropdownOpen(group)).to.equal(true);

    toolbar.handleToolbarClick({
      target: $styleMenu.find('a')[0],
      preventDefault: vi.fn(),
    });
    expect(toolbar.isDropdownOpen(group)).to.equal(false);

    $styleButton[0].click();
    await nextTick();
    toolbar.handleToolbarClick({
      target: $fullscreenButton[0],
      preventDefault: vi.fn(),
    });
    expect(toolbar.isDropdownOpen(group)).to.equal(false);
  });

  it('follows scrolling and toggles active buttons for fullscreen and codeview', () => {
    const $otherBar = $$('<div style="height: 10px"></div>').appendTo('body');
    context.options.otherStaticBar = $otherBar;
    context.options.followingToolbar = true;

    const editorNode = context.layoutInfo.editor[0];
    editorNode.getBoundingClientRect = () => ({ top: 0, left: 0, right: 300, bottom: 600, width: 300, height: 600 });
    context.layoutInfo.editingArea[0].getBoundingClientRect = () => ({ top: 0, left: 0, right: 300, bottom: 600, width: 300, height: 600 });
    Object.defineProperty(document.documentElement, 'scrollTop', { configurable: true, value: 0 });
    toolbar.$document.scrollTop = () => 100;
    toolbar.$editor.offset = () => ({ top: 0, left: 0 });
    toolbar.$editor.outerHeight = () => 600;
    toolbar.$editor.width = () => 300;
    toolbar.$toolbar.height = () => 40;
    toolbar.$toolbar.outerHeight = () => 40;
    toolbar.$statusbar.height = () => 20;

    toolbar.followScroll();
    expect(toolbar.isFollowing).to.equal(true);

    toolbar.$document.scrollTop = () => 1000;
    toolbar.followScroll();
    expect(toolbar.isFollowing).to.equal(false);

    toolbar.$editor.addClass('fullscreen');
    expect(toolbar.followScroll()).to.equal(false);
    toolbar.$editor.removeClass('fullscreen');

    toolbar.updateFullscreen(true);
    expect($toolbar.find('.btn-fullscreen').hasClass('active')).to.equal(true);
    expect(toolbar.$editor.children().get(0)).to.equal($toolbar.get(0));

    toolbar.updateCodeview(true);
    expect($toolbar.find('.btn-codeview').hasClass('active')).to.equal(true);
    expect($toolbar.find('button:not(.note-codeview-keep):disabled').length).to.be.greaterThan(0);

    toolbar.updateCodeview(false);
    expect($toolbar.find('.btn-codeview').hasClass('active')).to.equal(false);
  });

  it('moves the toolbar into a custom container and closes dropdowns after editor interaction', async() => {
    context.destroy();
    const $toolbarContainer = $$('<div class="toolbar-host"></div>').appendTo('body');
    context = new Context(
      $$('<div><p>hello</p></div>').appendTo('body'),
      $$.extend({}, $$.summernote.options, {
        toolbar: [['style', ['style']]],
        toolbarContainer: $toolbarContainer,
      }),
    );
    toolbar = context.modules.toolbar;
    $toolbar = context.layoutInfo.toolbar;

    expect($toolbar.parent().hasClass('toolbar-host')).to.equal(true);

    const $styleButton = $toolbar.find('.dropdown-style').siblings('.dropdown-toggle');
    const group = toolbar.getDropdownGroup($styleButton[0]);
    $styleButton[0].click();
    await nextTick();
    expect(toolbar.isDropdownOpen(group)).to.equal(true);

    toolbar.handleEditorInteraction();
    expect(toolbar.isDropdownOpen(group)).to.equal(false);
  });

  it('initializes follow-scroll listeners when enabled and ignores non-escape keydowns', () => {
    const options = $$.extend({}, $$.summernote.options, {
      followingToolbar: true,
    });
    $$.summernote.ui = $$.summernote.ui_template(options);

    const $note = $$('<div></div>').appendTo('body');
    const $editor = $$('<div class="note-editor"></div>').appendTo($note);
    const $toolbarHost = $$('<div class="note-toolbar"></div>').appendTo($editor);
    const $editingArea = $$('<div class="note-editing-area"></div>').appendTo($editor);
    const $editableHost = $$('<div class="note-editable"></div>').appendTo($editingArea);
    const $statusbar = $$('<div class="note-statusbar"></div>').appendTo($editor);
    const manualContext = {
      invoke: vi.fn(),
      options: {
        ...options,
        toolbar: undefined,
      },
      layoutInfo: {
        note: $note,
        editor: $editor,
        toolbar: $toolbarHost,
        editingArea: $editingArea,
        editable: $editableHost,
        statusbar: $statusbar,
      },
    };
    const instance = new Toolbar(manualContext);

    instance.initialize();
    instance.handleDocumentKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(instance.options.toolbar).to.deep.equal([]);
    expect($toolbarHost.css('display')).to.equal('none');

    instance.destroy();
  });

  it('can activate and deactivate codeview-safe buttons explicitly', () => {
    toolbar.activate(true);
    expect($toolbar.find('button:disabled').length).to.equal(0);

    toolbar.deactivate(true);
    expect($toolbar.find('button:disabled').length).to.be.greaterThan(0);
  });

  it('ignores dropdown clicks whose target is not an Element', () => {
    const event = { target: document.createTextNode('text'), preventDefault: vi.fn() };
    toolbar.handleDropdownClick(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('lays out icon-only buttons as square blocks with centred glyphs', async() => {
    await paintToolbarIcons();
    const $boldButton = $toolbar.find('.note-btn-bold');
    await waitForSvg($boldButton[0]);
    const $boldIcon = $boldButton.find('.note-icon');
    const $boldSvg = $boldButton.find('.note-icon > svg');
    const buttonRect = $boldButton[0].getBoundingClientRect();
    const iconRect = $boldIcon[0].getBoundingClientRect();
    const svgRect = $boldSvg[0].getBoundingClientRect();

    expect(buttonRect.width).to.be.greaterThan(0);
    expect(Math.abs(buttonRect.width - buttonRect.height)).to.be.lessThan(0.5);
    expect(Math.abs(iconRect.width - iconRect.height)).to.be.lessThan(0.5);
    // The icon wrapper should fill the button's content area. The Bootstrap
    // border is 1px on each side, so the icon may be up to 4px smaller than
    // the button depending on how the test layout resolves percentages.
    expect(Math.abs(iconRect.width - buttonRect.width)).to.be.lessThan(5);
    expect(Math.abs(iconRect.height - buttonRect.height)).to.be.lessThan(5);

    const expectedSvg = iconRect.width * 0.7;
    expect(Math.abs(svgRect.width - expectedSvg)).to.be.lessThan(1);
    expect(Math.abs(svgRect.height - expectedSvg)).to.be.lessThan(1);
  });

  it('renders dropdown toggles with icons as square blocks too', async() => {
    const $paragraphButton = $toolbar.find('.note-para .dropdown-toggle');
    await waitForSvg($paragraphButton[0]);
    const paragraphNode = $paragraphButton[0];
    const rect = paragraphNode.getBoundingClientRect();
    const directIcons = Array.from(paragraphNode.children).filter(
      (child) => child.classList && child.classList.contains('note-icon'),
    );

    expect(directIcons).to.have.length(1);
    expect(Math.abs(rect.width - rect.height)).to.be.lessThan(0.5);
  });

  it('hides the Bootstrap caret arrow on icon-only buttons so it does not overflow', () => {
    const $boldButton = $toolbar.find('.note-btn-bold');
    const afterDisplay = window.getComputedStyle($boldButton[0], '::after').display;

    expect(afterDisplay).to.equal('none');
  });

  it('sizes the source/code icon at 80% of the icon wrapper', async() => {
    await paintToolbarIcons();
    const $codeButton = $toolbar.find('.btn-codeview');
    await waitForSvg($codeButton[0]);
    const $codeIcon = $codeButton.find('.note-icon-code');
    const $codeSvg = $codeButton.find('.note-icon-code > svg');
    const iconRect = $codeIcon[0].getBoundingClientRect();
    const svgRect = $codeSvg[0].getBoundingClientRect();

    const expectedWidth = iconRect.width * 0.8;
    expect(Math.abs(svgRect.width - expectedWidth)).to.be.lessThan(1);
    expect(Math.abs(svgRect.height - expectedWidth)).to.be.lessThan(1);
  });

  it('keeps text-only dropdown buttons at their natural width instead of forcing a square', () => {
    context.destroy();
    context = new Context(
      $$('<div><p>hello</p></div>').appendTo('body'),
      $$.extend({}, $$.summernote.options, {
        toolbar: [['fontname', ['fontname']]],
      }),
    );
    toolbar = context.modules.toolbar;
    $toolbar = context.layoutInfo.toolbar;

    const $fontNameButton = $toolbar.find('.dropdown-toggle');
    expect($fontNameButton.length).to.be.greaterThan(0);

    const fontNameNode = $fontNameButton[0];
    const rect = fontNameNode.getBoundingClientRect();
    const directIcons = Array.from(fontNameNode.children).filter(
      (child) => child.classList && child.classList.contains('note-icon'),
    );

    expect(directIcons).to.have.length(0);
    expect(rect.width).to.be.greaterThan(rect.height);
  });
});
