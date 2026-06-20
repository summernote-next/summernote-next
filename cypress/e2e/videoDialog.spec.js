const FULL = '/summernote-next/full.html';
const EDITOR = '#all-features-editor';
const YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

function clickByIcon(icon) {
  return cy.get('.note-toolbar').find(`i.note-icon-${icon}`).parent('button').click();
}

function insertVideoViaDialog() {
  cy.get('.note-editable').click();
  clickByIcon('video');
  cy.get('.note-video-url', { timeout: 5000 }).should('be.visible').type(YOUTUBE_URL);
  cy.get('.note-video-btn').click();
  cy.get('.note-editable iframe.note-video-clip').should('exist');
}

function selectVideo() {
  cy.window().then((win) => {
    const iframe = win.document.querySelector('.note-editable iframe.note-video-clip');
    iframe.dispatchEvent(new win.MouseEvent('mousedown', { bubbles: true, button: 0 }));
  });
}

describe('summernote video dialog', () => {
  beforeEach(() => {
    cy.visit(FULL);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
    cy.window().then((win) => win.summernote.invoke(EDITOR, 'empty'));
    cy.get('.note-editable').click();
  });

  it('opens the video dialog from the toolbar', () => {
    clickByIcon('video');
    cy.get('.note-video-url', { timeout: 5000 }).should('be.visible');
    cy.get('.note-video-btn').should('exist');
    cy.screenshot('video-dialog-open');
  });

  it('keeps the insert button disabled until a url is entered', () => {
    clickByIcon('video');
    cy.get('.note-video-btn').should('be.disabled');
    cy.get('.note-video-url').type(YOUTUBE_URL);
    cy.get('.note-video-btn').should('not.be.disabled');
  });

  it('embeds a YouTube video as a note-video-clip iframe', () => {
    clickByIcon('video');
    cy.get('.note-video-url').type(YOUTUBE_URL);
    cy.get('.note-video-btn').click();

    cy.get('.note-editable iframe.note-video-clip').should('exist');
    cy.get('.note-editable iframe.note-video-clip').invoke('attr', 'src').should('include', 'youtube.com/embed/dQw4w9WgXcQ');
  });
});

describe('summernote video popover', () => {
  beforeEach(() => {
    cy.visit(FULL);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
    cy.window().then((win) => win.summernote.invoke(EDITOR, 'empty'));
  });

  it('shows the video popover when a video is selected', () => {
    insertVideoViaDialog();
    selectVideo();
    cy.get('.note-video-popover', { timeout: 5000 }).should('be.visible');
    cy.screenshot('video-popover');
  });

  it('removes the video via the video popover trash button', () => {
    insertVideoViaDialog();
    selectVideo();
    cy.get('.note-video-popover', { timeout: 5000 }).should('be.visible');
    cy.get('.note-video-popover').find('i.note-icon-trash').parent('button').click();

    cy.get('.note-editable iframe.note-video-clip').should('not.exist');
  });
});
