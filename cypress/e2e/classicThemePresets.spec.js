describe('summernote classic bootswatch theme presets', () => {
  const PRESET_URL = '/summernote-next-classic/bootswatch.html';

  function readEditorVar(name) {
    return cy.get('.note-editor.note-frame').first().invoke('css', name).then((value) => String(value).trim());
  }

  function readStyle(selector, prop) {
    return cy.get(selector).first().invoke('css', prop).then((value) => String(value).trim());
  }

  function selectTheme(theme) {
    cy.get('#bootswatch-theme-select').select(theme);
  }

  beforeEach(() => {
    cy.visit(PRESET_URL);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
  });

  it('presents neutral product naming and a toolkit-independent Classic UI', () => {
    cy.visit('/summernote-next/index.html');
    cy.title().should('equal', 'Summernote Next - Examples Overview');
    cy.get('title').should('not.contain', 'BS5');

    cy.visit(PRESET_URL);
    cy.title().should('equal', 'Summernote Next Classic - Example Themes');
    cy.get('link[href*="bootstrap"], script[src*="bootstrap"]').should('not.exist');
  });

  it('applies the default light preset to the editor on load', () => {
    cy.get('html').invoke('attr', 'data-example-theme').should('equal', 'brite');
    cy.get('html').invoke('attr', 'data-example-theme-mode').should('equal', 'light');
    readEditorVar('--bs-primary').should('equal', '#6d5efc');
    readEditorVar('color-scheme').should('equal', 'light');
    readStyle('.note-editor.note-frame', 'color').should('equal', 'rgb(33, 37, 41)');
  });

  it('switches the editor chrome to the darkly dark preset', () => {
    selectTheme('darkly');

    cy.get('html').invoke('attr', 'data-example-theme-mode').should('equal', 'dark');
    readStyle('.note-editor.note-frame', 'background-color').should('contain', '15, 23, 42');
    readStyle('.note-editor.note-frame', 'color').should('equal', 'rgb(248, 249, 250)');
    readEditorVar('--bs-primary').should('equal', '#7dd3fc');
    readEditorVar('color-scheme').should('equal', 'dark');
  });

  it('keeps readable dark text on a light preset like minty', () => {
    selectTheme('minty');

    cy.get('html').invoke('attr', 'data-example-theme-mode').should('equal', 'light');
    readStyle('.note-editor.note-frame', 'color').should('equal', 'rgb(33, 37, 41)');
    readEditorVar('--bs-primary').should('equal', '#14b8a6');
    readEditorVar('color-scheme').should('equal', 'light');
  });

  it('updates the editor frame, toolbar and status bar together', () => {
    selectTheme('darkly');

    readStyle('.note-editor.note-frame', 'background-color').should('contain', '15, 23, 42');
    readStyle('.note-editor .note-toolbar', 'background-color').should('contain', '30, 41, 59');
    readStyle('.note-editor .note-statusbar', 'background-color').should('contain', '30, 41, 59');
  });

  it('squares the editor and card corners for sharp themes and rounds them for soft themes', () => {
    selectTheme('cosmo');
    readStyle('.note-editor.note-frame', 'border-radius').should('equal', '0px');
    readStyle('.card', 'border-radius').should('equal', '0px');

    selectTheme('morph');
    readStyle('.note-editor.note-frame', 'border-radius').should('equal', '12px');
    readStyle('.card', 'border-radius').should('equal', '12px');

    selectTheme('brite');
    readStyle('.note-editor.note-frame', 'border-radius').should('equal', '6px');
    readStyle('.card', 'border-radius').should('equal', '6px');
  });
});
