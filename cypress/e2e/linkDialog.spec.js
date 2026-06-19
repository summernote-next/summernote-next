const FULL = '/summernote-next/full.html';
const EDITOR = '#all-features-editor';

function clickByIcon(icon) {
  return cy.get('.note-toolbar').find(`i.note-icon-${icon}`).parent('button').click();
}

function placeCaretInAnchor(win) {
  const anchor = win.document.querySelector('.note-editable a');
  const range = win.document.createRange();
  range.selectNodeContents(anchor);
  range.collapse(true);
  const sel = win.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  const editable = win.document.querySelector('.note-editable');
  editable.dispatchEvent(new win.KeyboardEvent('keyup', { bubbles: true }));
  editable.dispatchEvent(new win.MouseEvent('mouseup', { bubbles: true }));
}

describe('summernote link dialog and link popover', () => {
  beforeEach(() => {
    cy.visit(FULL);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
    cy.window().then((win) => win.summernote.invoke(EDITOR, 'empty'));
    cy.get('.note-editable').click();
  });

  it('opens the link dialog from the toolbar', () => {
    clickByIcon('link');
    cy.get('.note-link-dialog-modal', { timeout: 5000 }).should('be.visible');
    cy.get('.note-link-text').should('exist');
    cy.get('.note-link-url').should('exist');
    cy.screenshot('link-dialog-open');
  });

  it('keeps the insert button disabled until both fields are filled', () => {
    clickByIcon('link');
    cy.get('.note-link-btn').should('be.disabled');
    cy.get('.note-link-text').type('Example');
    cy.get('.note-link-btn').should('be.disabled');
    cy.get('.note-link-url').clear().type('https://example.com');
    cy.get('.note-link-btn').should('not.be.disabled');
  });

  it('inserts an anchor with the provided url and text', () => {
    clickByIcon('link');
    cy.get('.note-link-text').type('Example');
    cy.get('.note-link-url').clear().type('https://example.com');
    cy.get('.note-link-btn').click();

    cy.get('.note-editable a[href*="example.com"]').should('exist').and('contain', 'Example');
  });

  it('opens the link popover when the caret is placed inside an anchor', () => {
    cy.window().then((win) => {
      win.summernote.invoke(EDITOR, 'createLink', {
        text: 'Example',
        url: 'https://example.com',
        isNewWindow: true,
      });
    });

    cy.window().then(placeCaretInAnchor);
    cy.get('.note-link-popover', { timeout: 5000 }).should('be.visible');
    cy.get('.note-link-popover a[target="_blank"]').should('have.attr', 'href').and('include', 'example.com');
    cy.screenshot('link-popover');
  });

  it('removes the anchor via the unlink popover button', () => {
    cy.window().then((win) => {
      win.summernote.invoke(EDITOR, 'createLink', {
        text: 'Example',
        url: 'https://example.com',
        isNewWindow: true,
      });
    });

    cy.window().then(placeCaretInAnchor);
    cy.get('.note-link-popover', { timeout: 5000 }).should('be.visible');
    cy.get('.note-link-popover').find('i.note-icon-chain-broken').parent('button').click();

    cy.get('.note-editable a').should('not.exist');
    cy.get('.note-editable').should('contain', 'Example');
  });
});
