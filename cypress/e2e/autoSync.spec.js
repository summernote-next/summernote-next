const FULL = '/summernote-next/full.html';

describe('summernote auto sync', () => {
  beforeEach(() => {
    cy.visit(FULL);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');

    cy.window().then((win) => {
      win.document.body.insertAdjacentHTML('beforeend', '<textarea id="sync-source"></textarea>');
      win.summernote.create('#sync-source');
    });
  });

  it('syncs the editable markup back into the source textarea on change', () => {
    cy.window().then((win) => win.summernote.invoke('#sync-source', 'code', '<p>synced content</p>'));
    cy.get('#sync-source').should('have.value', '<p>synced content</p>');
  });

  it('keeps the textarea in sync while the user edits', () => {
    cy.get('.note-editable').last().click().type('live edit');
    cy.get('#sync-source').invoke('val').should('include', 'live edit');
  });
});
