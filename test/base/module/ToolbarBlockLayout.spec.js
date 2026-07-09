import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from '/test/util';
import $$ from '@/js/core/dom-query.js';
import Context from '@/js/Context';
import { loadAllIcons } from '@/js/icons-svg.js';
import '@/styles/bs5/summernote-bs5';

async function paintToolbarIcons() {
  
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

  it('renders icon buttons with centred icons sized to font-size', async() => {
    await paintToolbarIcons();
    const $boldButton = $toolbar.find('.note-btn-bold');
    await waitForSvg($boldButton[0]);
    const $icon = $boldButton.find('.note-icon');
    const $svg = $boldButton.find('.note-icon > svg');
    const iconRect = $icon[0].getBoundingClientRect();
    const svgRect = $svg[0].getBoundingClientRect();

    expect(Math.abs(iconRect.width - iconRect.height)).to.be.lessThan(0.5);
    
    expect(Math.abs(svgRect.width - iconRect.width)).to.be.lessThan(1);
    expect(Math.abs(svgRect.height - iconRect.height)).to.be.lessThan(1);
  });

  it('shows the Bootstrap caret on dropdown toggles so the dropdown affordance is visible', async() => {
    await paintToolbarIcons();
    const $paragraphButton = $toolbar.find('.note-para .dropdown-toggle');
    await waitForSvg($paragraphButton[0]);
    const afterDisplay = window.getComputedStyle($paragraphButton[0], '::after').display;

    expect(afterDisplay).not.to.equal('none');
  });

  it('hides the caret on icon-only buttons so it does not bleed past the glyph', () => {
    const $boldButton = $toolbar.find('.note-btn-bold');
    const afterDisplay = window.getComputedStyle($boldButton[0], '::after').display;

    expect(afterDisplay).to.equal('none');
  });

  it('honours the .note-icon-md utility class on the code glyph', async() => {
    await paintToolbarIcons();
    const $codeButton = $toolbar.find('.btn-codeview');
    await waitForSvg($codeButton[0]);
    const $icon = $codeButton.find('.note-icon-code');
    const $svg = $codeButton.find('.note-icon-code > svg');
    expect($icon.hasClass('note-icon-md')).to.equal(true);
    const iconRect = $icon[0].getBoundingClientRect();
    const svgRect = $svg[0].getBoundingClientRect();

    const expectedWidth = iconRect.width * 1.125;
    expect(Math.abs(svgRect.width - expectedWidth)).to.be.lessThan(3);
  });

  it('aligns superscript and subscript glyphs so the X characters share a baseline', async() => {
    await paintToolbarIcons();
    const $sup = $toolbar.find('.note-btn-superscript');
    const $sub = $toolbar.find('.note-btn-subscript');
    if (!$sup.length || !$sub.length) {
      
      return;
    }
    await waitForSvg($sup[0]);
    await waitForSvg($sub[0]);

    const supSvg = $sup.find('.note-icon > svg')[0];
    const subSvg = $sub.find('.note-icon > svg')[0];
    const supTransform = window.getComputedStyle(supSvg).transform;
    const subTransform = window.getComputedStyle(subSvg).transform;
    expect(supTransform).not.to.equal('none');
    expect(subTransform).not.to.equal('none');
    expect(supTransform).not.to.equal(subTransform);
  });
});