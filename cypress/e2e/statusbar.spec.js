const FULL = '/summernote-next/full.html';

describe('summernote statusbar resize', () => {
  beforeEach(() => {
    cy.visit(FULL);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
  });

  it('renders the resize handle in the statusbar', () => {
    cy.get('.note-statusbar').should('exist');
    cy.get('.note-resizebar').should('exist');
  });

  it('grows the editable height when the resize handle is dragged down', () => {
    cy.get('.note-editable').invoke('outerHeight').then((before) => {
      cy.get('.note-statusbar').then(($bar) => {
        const rect = $bar[0].getBoundingClientRect();
        cy.get('.note-statusbar').trigger('mousedown', { which: 1, clientX: rect.left + 20, clientY: rect.top + 5 });
      });
      cy.document().trigger('mousemove', { clientX: 200, clientY: 760 });
      cy.document().trigger('mouseup');

      cy.get('.note-editable').invoke('outerHeight').should('be.gt', before);
      cy.screenshot('statusbar-resized');
    });
  });
});
