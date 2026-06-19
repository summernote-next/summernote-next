const FULL = '/summernote-next/full.html';

function hintEditor() {
  return cy.get('#hint-editor').next('.note-editor');
}

function hintEditable() {
  return hintEditor().find('.note-editable');
}

describe('summernote hint popover', () => {
  beforeEach(() => {
    cy.visit(FULL);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');

    cy.window().then((win) => {
      win.document.body.insertAdjacentHTML('beforeend', '<div id="hint-editor"></div>');
      win.summernote.create('#hint-editor', {
        hint: [{
          mentions: ['apple', 'banana', 'cherry'],
          match: /@(\w{0,})$/,
          search(keyword, callback) {
            callback(this.mentions.filter((item) => item.indexOf(keyword) === 0));
          },
          template(item) { return item; },
          content(item) { return `@${item}`; },
        }],
      });
    });
  });

  it('shows the hint popover when a matching keyword is typed', () => {
    hintEditable().click().type('@');
    cy.get('.note-hint-popover', { timeout: 5000 }).should('be.visible');
    cy.get('.note-hint-item').should('exist');
    cy.screenshot('hint-popover');
  });

  it('replaces the keyword with the selected hint on enter', () => {
    hintEditable().click().type('@');
    cy.get('.note-hint-popover', { timeout: 5000 }).should('be.visible');
    hintEditable().type('{enter}');

    hintEditable().should('contain', 'apple');
  });

  it('navigates the hint items with the arrow keys', () => {
    hintEditable().click().type('@');
    cy.get('.note-hint-popover', { timeout: 5000 }).should('be.visible');
    cy.get('.note-hint-item').first().should('have.class', 'active');

    hintEditable().type('{downarrow}');
    hintEditable().type('{enter}');
    hintEditable().should('contain', 'banana');
  });
});
