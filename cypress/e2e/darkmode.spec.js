describe('summernote classic dark mode', () => {
  const TRIGGERS = [
    { name: 'data-bs-theme="dark"', apply: () => cy.get('html').invoke('attr', 'data-bs-theme', 'dark'), clear: () => cy.get('html').invoke('removeAttr', 'data-bs-theme') },
    { name: 'data-theme="dark"', apply: () => cy.get('html').invoke('attr', 'data-theme', 'dark'), clear: () => cy.get('html').invoke('removeAttr', 'data-theme') },
    { name: 'data-mode="dark"', apply: () => cy.get('html').invoke('attr', 'data-mode', 'dark'), clear: () => cy.get('html').invoke('removeAttr', 'data-mode') },
    { name: 'html.dark class', apply: () => cy.get('html').invoke('addClass', 'dark'), clear: () => cy.get('html').invoke('removeClass', 'dark') },
    { name: 'html.dark-mode class', apply: () => cy.get('html').invoke('addClass', 'dark-mode'), clear: () => cy.get('html').invoke('removeClass', 'dark-mode') },
    { name: 'html.theme-dark class', apply: () => cy.get('html').invoke('addClass', 'theme-dark'), clear: () => cy.get('html').invoke('removeClass', 'theme-dark') },
  ];

  function clearTriggers() {
    cy.get('html').then(($html) => {
      ['data-bs-theme', 'data-theme', 'data-mode', 'data-color-scheme', 'data-bs-color-scheme'].forEach((name) => {
        $html.removeAttr(name);
      });
      ['dark', 'dark-mode', 'theme-dark', 'light', 'light-mode', 'theme-light'].forEach((name) => {
        $html.removeClass(name);
      });
    });
  }

  function readBodyBg() {
    return cy.get('.note-editor').first().invoke('css', '--bs-body-bg').then((value) => {
      return String(value).trim();
    });
  }

  beforeEach(() => {
    clearTriggers();
    cy.visit('/summernote-next-classic/default.html');
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
  });

  TRIGGERS.forEach(({ name, apply, clear }) => {
    it(`applies dark mode to the editor when the page uses ${name}`, () => {
      apply();
      cy.wait(100);
      readBodyBg().should('equal', 'rgb(33, 37, 41)');
      clear();
      cy.wait(100);
      readBodyBg().should('equal', 'rgb(255, 255, 255)');
    });
  });

  it('keeps the editor dark when prefers-color-scheme: dark is set', () => {
    cy.emulateMedia({ colorScheme: 'dark' });
    cy.visit('/summernote-next-classic/default.html');
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
    cy.wait(100);
    readBodyBg().should('equal', 'rgb(33, 37, 41)');
  });

  it('keeps the editor light when prefers-color-scheme: light is set', () => {
    cy.emulateMedia({ colorScheme: 'light' });
    cy.visit('/summernote-next-classic/default.html');
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
    cy.wait(100);
    readBodyBg().should('equal', 'rgb(255, 255, 255)');
  });

  it('forces dark mode when the darkMode option is "on"', () => {
    cy.visit('/summernote-next-classic/default.html', {
      onBeforeLoad(win) {
        win.summernote = win.summernote || {};
      },
    });
    cy.window().then((win) => {
      win.document.body.innerHTML = '<div id="forced-on"><p>forced on</p></div>';
      win.summernote.create('#forced-on', { darkMode: 'on', height: 200, dialogsInBody: true });
    });
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
    cy.wait(100);
    readBodyBg().should('equal', 'rgb(33, 37, 41)');
  });

  it('forces light mode when the darkMode option is "off" and the page is dark', () => {
    cy.get('html').invoke('attr', 'data-bs-theme', 'dark');
    cy.visit('/summernote-next-classic/default.html', {
      onBeforeLoad(win) {
        win.summernote = win.summernote || {};
      },
    });
    cy.window().then((win) => {
      win.document.documentElement.setAttribute('data-bs-theme', 'dark');
      win.document.body.innerHTML = '<div id="forced-off"><p>forced off</p></div>';
      win.summernote.create('#forced-off', { darkMode: 'off', height: 200, dialogsInBody: true });
    });
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
    cy.wait(100);
    readBodyBg().should('equal', 'rgb(255, 255, 255)');
  });
});
