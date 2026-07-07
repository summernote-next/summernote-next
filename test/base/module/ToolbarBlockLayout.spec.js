import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from '/test/util';
import $$ from '@/js/core/dom-query.js';
import Context from '@/js/Context';
import { loadAllIcons } from '@/js/icons-svg.js';
import '@/styles/bs5/summernote-bs5';

async function paintToolbarIcons() {
  // The icon SVGs are fetched lazily by the bs5 ui template. Make sure every
  // icon referenced by the current toolbar is painted before measuring
  // geometry so we observe the rendered glyphs, not the placeholder wrapper.
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

describe('Toolbar block layout', () => {
  let context;
  let $toolbar;

  beforeEach(() => {
    $$('body').empty();
    context = new Context(
      $$('<div><p>hello</p></div>').appendTo('body'),
      $$.extend({}, $$.summernote.options, {
        toolbar: [
          ['style', ['style']],
          ['font', ['bold', 'italic', 'underline', 'strikethrough']],
          ['para', ['ul', 'ol', 'paragraph', 'height']],
          ['insert', ['link', 'picture']],
          ['view', ['fullscreen', 'codeview']],
        ],
      }),
    );
    $toolbar = context.layoutInfo.toolbar;
  });

  afterEach(() => {
    context?.destroy();
    $$('body').empty();
  });

  it('renders icon buttons as 2rem square blocks', async() => {
    await paintToolbarIcons();
    const $boldButton = $toolbar.find('.note-btn-bold');
    await waitForSvg($boldButton[0]);
    const rect = $boldButton[0].getBoundingClientRect();

    expect(rect.width).to.equal(32);
    expect(Math.abs(rect.width - rect.height)).to.be.lessThan(0.5);
  });

  it('centres the inner SVG glyph at 70% of the wrapper', async() => {
    await paintToolbarIcons();
    const $italicButton = $toolbar.find('.note-btn-italic');
    await waitForSvg($italicButton[0]);
    const $icon = $italicButton.find('.note-icon');
    const $svg = $italicButton.find('.note-icon > svg');
    const iconRect = $icon[0].getBoundingClientRect();
    const svgRect = $svg[0].getBoundingClientRect();

    const expected = iconRect.width * 0.7;
    expect(Math.abs(svgRect.width - expected)).to.be.lessThan(1);
    expect(Math.abs(svgRect.height - expected)).to.be.lessThan(1);
  });

  it('overrides the source/code icon to 80% of the wrapper', async() => {
    await paintToolbarIcons();
    const $codeButton = $toolbar.find('.btn-codeview');
    await waitForSvg($codeButton[0]);
    const $icon = $codeButton.find('.note-icon-code');
    const $svg = $codeButton.find('.note-icon-code > svg');
    const iconRect = $icon[0].getBoundingClientRect();
    const svgRect = $svg[0].getBoundingClientRect();

    const expected = iconRect.width * 0.8;
    expect(Math.abs(svgRect.width - expected)).to.be.lessThan(1);
    expect(Math.abs(svgRect.height - expected)).to.be.lessThan(1);
  });

  it('renders dropdown toggles that contain an icon as square blocks too', async() => {
    await paintToolbarIcons();
    const $paragraphButton = $toolbar.find('.note-para .dropdown-toggle');
    await waitForSvg($paragraphButton[0]);
    const rect = $paragraphButton[0].getBoundingClientRect();

    expect(Math.abs(rect.width - rect.height)).to.be.lessThan(0.5);
  });

  it('hides the trailing Bootstrap caret on icon-only buttons', () => {
    const $boldButton = $toolbar.find('.note-btn-bold');
    const afterDisplay = window.getComputedStyle($boldButton[0], '::after').display;

    expect(afterDisplay).to.equal('none');
  });

  it('aligns the icon button block with the rest of the toolbar height', async() => {
    await paintToolbarIcons();
    const $boldButton = $toolbar.find('.note-btn-bold');
    await waitForSvg($boldButton[0]);
    const buttonRect = $boldButton[0].getBoundingClientRect();
    const toolbarRect = $toolbar[0].getBoundingClientRect();

    // The square block fits comfortably within the toolbar without overflowing.
    expect(buttonRect.height).to.be.lessThan(toolbarRect.height);
  });
});