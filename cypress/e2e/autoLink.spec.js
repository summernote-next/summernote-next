const FULL = '/summernote-next/full.html';

describe('summernote auto link', () => {
  beforeEach(() => {
    cy.visit(FULL);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
    cy.window().then((win) => win.summernote.invoke('#all-features-editor', 'empty'));
    cy.get('.note-editable').click();
  });

  it('turns a typed URL into an anchor after pressing space', () => {
    cy.get('.note-editable').type('https://example.com ');

    cy.get('.note-editable a[href*="example.com"]').should('exist');
    cy.get('.note-editable a').should('have.attr', 'target', '_blank');
  });

  it('turns a typed www address into an anchor after pressing space', () => {
    cy.get('.note-editable').type('www.example.org ');

    cy.get('.note-editable a[href*="example.org"]').should('exist');
  });

  it('does not link plain words', () => {
    cy.get('.note-editable').type('hello world ');
    cy.get('.note-editable a').should('not.exist');
  });
});
