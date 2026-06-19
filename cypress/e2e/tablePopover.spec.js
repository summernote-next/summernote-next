const FULL = '/summernote-next/full.html';
const EDITOR = '#all-features-editor';

describe('summernote table popover', () => {
  beforeEach(() => {
    cy.visit(FULL);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
    cy.window().then((win) => win.summernote.invoke(EDITOR, 'empty'));
    cy.get('.note-editable').click();
    cy.window().then((win) => win.summernote.invoke(EDITOR, 'insertTable', '2x2'));
  });

  it('renders a bordered table with the requested dimensions', () => {
    cy.get('.note-editable table').should('exist');
    cy.get('.note-editable tr').should('have.length', 2);
    cy.get('.note-editable td').should('have.length', 4);
  });

  it('shows the table popover when a cell is selected', () => {
    cy.get('.note-editable td').first().trigger('mousedown', { which: 1 });
    cy.get('.note-table-popover', { timeout: 5000 }).should('be.visible');
    cy.screenshot('table-popover');
  });

  it('adds a row below via the table popover', () => {
    cy.get('.note-editable td').first().trigger('mousedown', { which: 1 });
    cy.get('.note-table-popover', { timeout: 5000 }).should('be.visible');
    cy.get('.note-table-popover').find('i.note-icon-row-below').parent('button').click();

    cy.get('.note-editable tr').should('have.length', 3);
    cy.get('.note-editable td').should('have.length', 6);
  });

  it('deletes the table via the table popover trash button', () => {
    cy.get('.note-editable td').first().trigger('mousedown', { which: 1 });
    cy.get('.note-table-popover', { timeout: 5000 }).should('be.visible');
    cy.get('.note-table-popover').find('i.note-icon-trash').parent('button').click();

    cy.get('.note-editable table').should('not.exist');
  });
});
