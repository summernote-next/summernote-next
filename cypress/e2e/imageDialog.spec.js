const FULL = '/summernote-next/full.html';
const DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAAC+NMs+AAAAFklEQVQYV2P8z8BQz0BFgHHUCuqGCwBx9QoL/cMk0QAAAABJRU5ErkJggg==';
const EDITOR = '#all-features-editor';

function clickByIcon(icon) {
  return cy.get('.note-toolbar').find(`i.note-icon-${icon}`).parent('button').click();
}

function insertImageNode() {
  cy.window().then((win) => {
    const img = win.document.createElement('img');
    img.src = DATA_URI;
    img.alt = 'dot';
    win.summernote.invoke(EDITOR, 'insertNode', img);
  });
}

describe('summernote image dialog', () => {
  beforeEach(() => {
    cy.visit(FULL);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
    cy.window().then((win) => win.summernote.invoke(EDITOR, 'empty'));
    cy.get('.note-editable').click();
  });

  it('opens the image dialog from the toolbar', () => {
    clickByIcon('picture');
    cy.get('.note-image-dialog-modal', { timeout: 5000 }).should('be.visible');
    cy.get('.note-image-url').should('exist');
    cy.screenshot('image-dialog-open');
  });

  it('keeps the insert button disabled until a url is entered', () => {
    clickByIcon('picture');
    cy.get('.note-image-btn').should('be.disabled');
    cy.get('.note-image-url').type(DATA_URI);
    cy.get('.note-image-btn').should('not.be.disabled');
  });

  it('closes the dialog after submitting a url', () => {
    clickByIcon('picture');
    cy.get('.note-image-url').type(DATA_URI);
    cy.get('.note-image-btn').click();
    cy.get('.note-image-dialog-modal').should('not.be.visible');
  });
});

describe('summernote image handle and image popover', () => {
  beforeEach(() => {
    cy.visit(FULL);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
    cy.window().then((win) => win.summernote.invoke(EDITOR, 'empty'));
    cy.get('.note-editable').click();
  });

  it('shows the sizing handle when an image is selected', () => {
    insertImageNode();
    cy.get('.note-editable img').should('exist');

    cy.get('.note-editable img').click();
    cy.get('.note-handle .note-control-selection', { timeout: 5000 }).should('be.visible');
    cy.get('.note-image-popover', { timeout: 5000 }).should('be.visible');
    cy.screenshot('image-handle-popover');
  });

  it('removes the image via the image popover trash button', () => {
    insertImageNode();
    cy.get('.note-editable img').click();
    cy.get('.note-image-popover', { timeout: 5000 }).should('be.visible');
    cy.get('.note-image-popover').find('i.note-icon-trash').parent('button').click();

    cy.get('.note-editable img').should('not.exist');
  });
});
