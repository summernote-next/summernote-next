import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import $$ from '@/js/core/dom-query.js';
import Context from '@/js/Context';
import Fullscreen from '@/js/module/Fullscreen';
import range from '@/js/core/range';
import '@/styles/bs5/summernote-bs5';

describe('Fullscreen', () => {
  let fullscreen;
  let context;

  beforeEach(() => {
    $$('body').empty();
    const options = $$.extend({}, $$.summernote.options);
    context = new Context($$('<div><p>hello</p></div>').appendTo('body'), options);
    fullscreen = new Fullscreen(context);
  });

  afterEach(() => {
    fullscreen?.destroy();
    context?.destroy();
    $$('body').empty();
  });

  it('toggles fullscreen mode', () => {
    const originalParent = context.layoutInfo.editor.parent()[0];
    const expectsPlaceholder = originalParent !== document.body;

    expect(fullscreen.isFullscreen()).to.be.false;
    fullscreen.toggle();
    expect(fullscreen.isFullscreen()).to.be.true;
    expect(context.layoutInfo.editor.hasClass('fullscreen')).to.be.true;
    expect($$('html').hasClass('note-fullscreen-body')).to.be.true;
    expect(context.layoutInfo.editor.parent().is('body')).to.be.true;
    expect(document.querySelector('[data-note-fullscreen-placeholder="true"]') !== null).to.equal(expectsPlaceholder);
    fullscreen.toggle();
    expect(fullscreen.isFullscreen()).to.be.false;
    expect($$('html').hasClass('note-fullscreen-body')).to.be.false;
    expect(context.layoutInfo.editor.parent()[0]).to.equal(originalParent);
    expect(document.querySelector('[data-note-fullscreen-placeholder="true"]')).to.equal(null);
  });

  it('hides the air popover when toggling fullscreen in air mode', () => {
    context?.destroy();
    const options = $$.extend(true, {}, $$.summernote.options, {
      airMode: true,
    });
    context = new Context($$('<div><p>hello</p></div>').appendTo('body'), options);
    fullscreen = new Fullscreen(context);
    const hideSpy = vi.spyOn(context.modules.airPopover, 'hide');

    fullscreen.toggle();

    expect(fullscreen.isFullscreen()).to.be.true;
    expect(hideSpy).toHaveBeenCalled();
  });

  it('switches between air mode and toolbar fullscreen when configured', () => {
    context?.destroy();
    const $note = $$('<div><p>functional programming</p></div>').appendTo('body');
    const options = $$.extend(true, {}, $$.summernote.options, {
      airMode: true,
      airModeFullscreen: true,
    });

    context = new Context($note, options);
    const textNode = context.layoutInfo.editable.find('p')[0].firstChild;
    const selectedRange = range.create(textNode, 0, textNode, textNode.textContent.length);
    selectedRange.select();
    context.invoke('editor.setLastRange', selectedRange);
    context.modules.airPopover.pageX = 10;
    context.modules.airPopover.pageY = 10;
    context.modules.airPopover.update(true);

    context.invoke('fullscreen.toggle');
    context = $note.data('summernote');

    expect(context.options.airMode).to.be.false;
    expect(context.layoutInfo.toolbar.length).to.equal(1);
    expect(context.layoutInfo.editor.hasClass('fullscreen')).to.be.true;
    expect($$('html').hasClass('note-fullscreen-body')).to.be.true;

    context.invoke('fullscreen.toggle');
    context = $note.data('summernote');

    expect(context.options.airMode).to.be.true;
    expect(context.layoutInfo.toolbar.length).to.equal(0);
    expect(context.layoutInfo.editor.hasClass('note-airframe')).to.be.true;
    expect(context.modules.airPopover.$popover.css('display')).to.equal('block');
  });

  it('resizes codemirror editors and guards air-mode restoration steps', () => {
    const setsize = vi.fn();
    fullscreen.$codable.data('cmeditor', { setsize });

    fullscreen.resizeTo({ h: 123 });
    expect(fullscreen.$editable.css('height')).to.equal('123px');
    expect(fullscreen.$codable.css('height')).to.equal('123px');
    expect(setsize).toHaveBeenCalledWith(null, 123);

    const restoredRange = {
      select: vi.fn(),
      getClientRects: vi.fn(() => []),
    };
    const bookmark = { s: { path: [0], offset: 0 }, e: { path: [0], offset: 1 } };
    const createFromBookmarkSpy = vi.spyOn(range, 'createFromBookmark').mockReturnValue(restoredRange);
    const restoreContext = {
      layoutInfo: {
        editable: context.layoutInfo.editable,
      },
      invoke: vi.fn(),
      modules: {
        airPopover: {
          update: vi.fn(),
        },
      },
    };

    fullscreen.restoreAirModeState(restoreContext, null);
    fullscreen.restoreAirModeState(restoreContext, {
      bookmark,
      shouldRestorePopover: false,
    });
    fullscreen.restoreAirModeState(restoreContext, {
      bookmark,
      shouldRestorePopover: true,
    });

    expect(createFromBookmarkSpy).toHaveBeenCalledTimes(2);
    expect(restoreContext.invoke).toHaveBeenCalledWith('editor.setLastRange', restoredRange);
    expect(restoreContext.modules.airPopover.update).not.toHaveBeenCalled();

    const originalInvoke = context.invoke.bind(context);
    vi.spyOn(context, 'invoke').mockImplementation((command, ...args) => {
      if (command === 'editor.getLastRange') {
        return null;
      }

      return originalInvoke(command, ...args);
    });
    expect(fullscreen.captureAirModeState().bookmark).to.equal(null);
  });

  it('covers the viewport even inside a filtered wrapper', () => {
    context?.destroy();
    $$('body').empty();

    const $wrapper = $$('<div style="backdrop-filter: blur(12px); position: relative;"></div>').appendTo('body');
    const $note = $$('<div><p>hello</p></div>').appendTo($wrapper);
    context = new Context($note, $$.extend({}, $$.summernote.options));
    fullscreen = new Fullscreen(context);

    fullscreen.toggle();

    const rect = context.layoutInfo.editor[0].getBoundingClientRect();

    expect(Math.abs(rect.top)).to.be.lessThan(1);
    expect(Math.abs(rect.left)).to.be.lessThan(1);
    expect(Math.abs(rect.width - window.innerWidth)).to.be.lessThan(1);
    expect(context.layoutInfo.editor.parent().is('body')).to.be.true;
  });
});
