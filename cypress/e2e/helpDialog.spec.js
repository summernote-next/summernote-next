const FULL = '/summernote-next/full.html';

function clickByIcon(icon) {
  return cy.get('.note-toolbar').find(`i.note-icon-${icon}`).parent('button').click();
}

describe('summernote help dialog', () => {
  beforeEach(() => {
    cy.visit(FULL);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
  });

  it('opens the help dialog from the toolbar', () => {
    clickByIcon('question');
    cy.get('.note-help-dialog-modal', { timeout: 5000 }).should('be.visible');
    cy.get('.note-help-dialog').should('exist');
    cy.screenshot('help-dialog-open');
  });

  it('lists keyboard shortcuts rendered as kbd elements', () => {
    clickByIcon('question');
    cy.get('.note-help-dialog-modal', { timeout: 5000 }).should('be.visible');
    cy.get('.note-help-dialog kbd').should('exist');
    cy.get('.note-help-dialog-section').should('exist');
  });

  it('closes the help dialog on escape', () => {
    clickByIcon('question');
    cy.get('.note-help-dialog-modal', { timeout: 5000 }).should('be.visible');
    cy.get('body').type('{esc}');
    cy.get('.note-help-dialog-modal').should('not.be.visible');
  });
});
