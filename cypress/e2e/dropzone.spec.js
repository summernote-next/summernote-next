const FULL = '/summernote-next/full.html';

describe('summernote dropzone', () => {
  beforeEach(() => {
    cy.visit(FULL);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
    cy.window().then((win) => win.summernote.invoke('#all-features-editor', 'empty'));
  });

  it('renders the dropzone message element', () => {
    cy.get('.note-dropzone').should('exist');
    cy.get('.note-dropzone-message').should('exist');
  });

  it('marks the editor as dragover while a drag is in progress', () => {
    cy.window().then((win) => {
      const dt = new win.DataTransfer();
      const editor = win.document.querySelector('.note-editor');
      editor.dispatchEvent(new win.DragEvent('dragenter', { dataTransfer: dt, bubbles: true }));
      editor.dispatchEvent(new win.DragEvent('dragover', { dataTransfer: dt, bubbles: true }));
    });

    cy.get('.note-editor').should('have.class', 'dragover');
    cy.get('.note-dropzone').should('be.visible');
    cy.screenshot('dropzone-active');
  });

  it('clears the dragover state after the drag leaves the editor', () => {
    cy.window().then((win) => {
      const dt = new win.DataTransfer();
      const editor = win.document.querySelector('.note-editor');
      editor.dispatchEvent(new win.DragEvent('dragenter', { dataTransfer: dt, bubbles: true }));
      editor.dispatchEvent(new win.DragEvent('dragover', { dataTransfer: dt, bubbles: true }));
      editor.dispatchEvent(new win.DragEvent('dragleave', { dataTransfer: dt, bubbles: true }));
    });

    cy.get('.note-editor').should('not.have.class', 'dragover');
  });
});
