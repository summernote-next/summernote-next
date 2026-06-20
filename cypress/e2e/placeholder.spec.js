const FULL = '/summernote-next/full.html';

function placeholderEditor() {
  return cy.get('#placeholder-editor').next('.note-editor');
}

describe('summernote placeholder', () => {
  beforeEach(() => {
    cy.visit(FULL);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');

    cy.window().then((win) => {
      win.document.body.insertAdjacentHTML('beforeend', '<div id="placeholder-editor"></div>');
      win.summernote.create('#placeholder-editor', { placeholder: 'Start typing...' });
    });
  });

  it('renders the placeholder element and marks it shown when the editor is empty', () => {
    placeholderEditor().find('.note-placeholder')
      .should('exist')
      .and('contain', 'Start typing...')
      .then(($placeholder) => {
        expect($placeholder[0].style.display).to.not.equal('none');
      });
  });

  it('marks the placeholder as hidden once the user types', () => {
    placeholderEditor().find('.note-editable').click().type('Hello');
    placeholderEditor().find('.note-placeholder').then(($placeholder) => {
      expect($placeholder[0].style.display).to.equal('none');
    });
  });

  it('marks the placeholder as shown again when the content is cleared', () => {
    placeholderEditor().find('.note-editable').click().type('Hello');
    placeholderEditor().find('.note-placeholder').then(($placeholder) => {
      expect($placeholder[0].style.display).to.equal('none');
    });
    cy.window().then((win) => win.summernote.invoke('#placeholder-editor', 'empty'));
    placeholderEditor().find('.note-placeholder').then(($placeholder) => {
      expect($placeholder[0].style.display).to.not.equal('none');
    });
  });
});
