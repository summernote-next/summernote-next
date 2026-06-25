const SHOWCASE = '/summernote-next/plugins-showcase.html';

describe('Summernote Next plugin showcase', () => {
  beforeEach(() => {
    cy.visit(SHOWCASE);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
  });

  it('renders the plugin buttons in the toolbar', () => {
    cy.get('.note-btn-word-counter').should('exist');
    cy.get('.note-btn-link-extractor').should('exist');
    cy.get('.sn-plugin-align').should('have.length', 4);
    cy.get('.sn-plugin-text-styles').should('have.length', 5);
    cy.get('.sn-plugin-special-chars').should('exist');
    cy.get('.sn-plugin-emoji-toggle').should('exist');
    cy.screenshot('plugin-showcase-toolbar');
  });

  it('shows the word counter badge in the status bar', () => {
    cy.get('[data-sn-word-counter]').should('exist').invoke('text').then((text) => {
      expect(text).to.match(/\d+ Words · \d+ Characters/);
    });
  });

  it('updates the word counter when content changes', () => {
    cy.get('[data-sn-word-counter]').invoke('attr', 'data-sn-words').then((initial) => {
      cy.get('.note-editable').click().type(' additional words');
      cy.get('[data-sn-word-counter]').invoke('attr', 'data-sn-words').should('not.equal', initial);
    });
  });

  it('toggles the word counter badge with the toolbar button', () => {
    cy.get('.note-btn-word-counter').click();
    cy.get('[data-sn-word-counter]').should('have.class', 'd-none');
    cy.get('.note-btn-word-counter').click();
    cy.get('[data-sn-word-counter]').should('not.have.class', 'd-none');
  });

  it('aligns selected text when an alignment button is clicked', () => {
    cy.get('.note-editable').click().type('center me please');
    cy.window().then((win) => {
      const editable = win.document.querySelector('.note-editable');
      const p = editable.querySelector('p');
      const range = win.document.createRange();
      range.selectNodeContents(p);
      const sel = win.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    cy.get('.note-btn-align-center').click();
    cy.get('.note-editable p').invoke('attr', 'style').should('contain', 'center');
    cy.screenshot('plugin-showcase-align-center');
  });

  it('wraps selected text with the Mark button', () => {
    cy.get('.note-editable').click().type('mark this word');
    cy.window().then((win) => {
      const editable = win.document.querySelector('.note-editable');
      const p = editable.querySelector('p');
      const textNode = p.firstChild;
      const range = win.document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 4);
      const sel = win.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    cy.get('.note-btn-markText').click();
    cy.get('.note-editable mark').should('exist');
    cy.screenshot('plugin-showcase-mark');
  });

  it('opens the special characters dropdown and inserts a character', () => {
    cy.get('.sn-plugin-special-chars-toggle').click();
    cy.get('.sn-plugin-special-chars').should('have.class', 'show');

    cy.get('.note-editable').click();
    cy.get('.sn-plugin-special-chars-toggle').click();
    cy.get('.sn-plugin-special-chars-cell').first().click();
    cy.get('.note-editable').invoke('text').should('match', /\S+/);
  });

  it('shows the link extractor panel and lists anchors', () => {
    cy.get('[data-sn-link-extractor]').should('exist');
    cy.get('[data-sn-link-extractor] .sn-plugin-link-extractor-item').its('length').should('be.greaterThan', 0);
    cy.screenshot('plugin-showcase-link-extractor');
  });

  it('exposes plugin APIs through summernote.invoke', () => {
    cy.window().its('summernote').then((sm) => {
      const stats = sm.invoke('#plugin-showcase-editor', 'wordCounter.stats');
      expect(stats.words).to.be.a('number');
      expect(stats.characters).to.be.a('number');

      const links = sm.invoke('#plugin-showcase-editor', 'linkExtractor.list');
      expect(links).to.be.an('array');
      expect(links.length).to.be.greaterThan(0);

      const plugins = sm.listPlugins();
      expect(plugins).to.include('wordCounter');
      expect(plugins).to.include('alignmentButtons');
      expect(plugins).to.include('specialCharacters');
      expect(plugins).to.include('textStyles');
      expect(plugins).to.include('linkExtractor');
      expect(plugins).to.include('emojiPicker');
    });
  });

  it('exposes plugin metadata via getPluginMeta', () => {
    cy.window().its('summernote').then((sm) => {
      const meta = sm.getPluginMeta('wordCounter');
      expect(meta).to.not.equal(null);
      expect(meta.name).to.equal('wordCounter');
      expect(meta.stylesheets).to.include('./css/word-counter.css');
      expect(meta.buttons.wordCounterToggle).to.be.a('function');
    });
  });
});