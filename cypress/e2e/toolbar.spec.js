const FULL = '/summernote-next/full.html';

describe('summernote toolbar', () => {
  beforeEach(() => {
    cy.visit(FULL);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
    cy.window().then((win) => win.summernote.invoke('#all-features-editor', 'empty'));
    cy.get('.note-editable').click();
  });

  it('opens and closes a dropdown menu on toggle click', () => {
    cy.get('.note-style [data-note-toggle="dropdown"]').click();
    cy.get('.note-style .note-dropdown-menu').should('have.class', 'show');
    cy.get('.note-style [data-note-toggle="dropdown"]').should('have.attr', 'aria-expanded', 'true');

    cy.get('.note-editable').click('top');
    cy.get('.note-style .note-dropdown-menu').should('not.have.class', 'show');
  });

  it('toggles the bold active state when bold is applied to a selection', () => {
    cy.get('.note-editable').click().type('bold me');

    cy.window().then((win) => {
      const editable = win.document.querySelector('.note-editable');
      const p = editable.querySelector('p');
      const range = win.document.createRange();
      range.selectNodeContents(p);
      const sel = win.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    cy.get('.note-btn-bold').should('not.have.class', 'active');
    cy.get('.note-btn-bold').click();
    cy.get('.note-btn-bold').should('have.class', 'active');
    cy.get('.note-editable strong, .note-editable b').should('exist');
    cy.screenshot('toolbar-bold-active');
  });

  it('disables the toolbar buttons when the editor is disabled', () => {
    cy.window().then((win) => win.summernote.invoke('#all-features-editor', 'disable'));
    cy.get('.note-btn-bold').should('be.disabled');
    cy.window().then((win) => win.summernote.invoke('#all-features-editor', 'enable'));
    cy.get('.note-btn-bold').should('not.be.disabled');
  });
});
