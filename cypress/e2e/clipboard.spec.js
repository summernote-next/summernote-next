const FULL = '/summernote-next/full.html';
const EDITOR = '#all-features-editor';

describe('summernote clipboard paste', () => {
  beforeEach(() => {
    cy.visit(FULL);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
  });

  function dispatchPaste(win, editableSelector, setupDataTransfer) {
    const dt = new win.DataTransfer();
    setupDataTransfer(dt, win);
    const event = new win.ClipboardEvent('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: dt, configurable: true, writable: true });
    win.document.querySelector(editableSelector).dispatchEvent(event);
    return event;
  }

  it('inserts an image pasted from the clipboard as a data url', () => {
    cy.window().then((win) => win.summernote.invoke(EDITOR, 'empty'));
    cy.get('.note-editable').first().click();

    cy.window().then((win) => {
      const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      const binary = win.atob(base64);
      const bytes = new win.Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) { bytes[i] = binary.charCodeAt(i); }
      const file = new win.File([bytes], 'clip.png', { type: 'image/png' });
      dispatchPaste(win, '.note-editable', (dt) => dt.items.add(file));
    });

    cy.get('.note-editable').first().find('img').should('exist');
  });

  it('prevents pasting text that exceeds the maxTextLength limit', () => {
    cy.window().then((win) => {
      win.document.body.insertAdjacentHTML('beforeend', '<div id="clipboard-limited"></div>');
      win.summernote.create('#clipboard-limited', { maxTextLength: 5 });
    });

    cy.window().then((win) => {
      const text = 'this text is far too long';
      const event = dispatchPaste(win, '#clipboard-limited + .note-editor .note-editable', (dt) => dt.setData('text/plain', text));
      expect(event.defaultPrevented, 'paste over the limit should be prevented').to.be.true;
    });
  });

  it('allows pasting text within the maxTextLength limit', () => {
    cy.window().then((win) => {
      win.document.body.insertAdjacentHTML('beforeend', '<div id="clipboard-limited"></div>');
      win.summernote.create('#clipboard-limited', { maxTextLength: 50 });
    });

    cy.window().then((win) => {
      const text = 'short';
      const event = dispatchPaste(win, '#clipboard-limited + .note-editor .note-editable', (dt) => dt.setData('text/plain', text));
      expect(event.defaultPrevented, 'paste under the limit should not be prevented').to.be.false;
    });
  });
});
