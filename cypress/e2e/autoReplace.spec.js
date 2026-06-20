const FULL = '/summernote-next/full.html';

describe('summernote auto replace', () => {
  beforeEach(() => {
    cy.visit(FULL);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');

    cy.window().then((win) => {
      win.document.body.insertAdjacentHTML('beforeend', '<div id="replace-editor"></div>');
      win.summernote.create('#replace-editor', {
        replace: {
          match(keyword, callback) {
            const map = {
              '(c)': '\u00A9',
              '(r)': '\u00AE',
            };
            callback(map[keyword] || null);
          },
        },
      });
    });
  });

  it('replaces the trigger (c) with the copyright sign on space', () => {
    cy.get('#replace-editor').next('.note-editor').find('.note-editable').click().type('(c) ');
    cy.get('#replace-editor').next('.note-editor').find('.note-editable').should('contain', '\u00A9');
  });

  it('leaves unknown triggers untouched', () => {
    cy.get('#replace-editor').next('.note-editor').find('.note-editable').click().type('hello ');
    cy.get('#replace-editor').next('.note-editor').find('.note-editable').should('contain', 'hello');
    cy.get('#replace-editor').next('.note-editor').find('.note-editable').should('not.contain', '\u00A9');
  });
});
