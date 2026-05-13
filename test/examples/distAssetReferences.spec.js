import { describe, expect, it } from 'vitest';

const examplePages = import.meta.glob('../../examples/{airmode,bootswatch,default,default-vs-card,full,german,mathematical-symbols-greek-letters,summernote-classic,toolbar-colors}.html', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const overviewPages = import.meta.glob('../../examples/index.html', {
  eager: true,
  query: '?raw',
  import: 'default',
});

describe('example asset references', () => {
  it('loads the compiled dist assets without a hard-coded cache-buster', () => {
    Object.entries(examplePages).forEach(([path, markup]) => {
      if (path.includes('summernote-classic.html')) {
        expect(markup, `${path} should load the compiled classic stylesheet`).to.contain('/dist/summernote-classic.css');
        expect(markup, `${path} should load the compiled classic script`).to.contain('/dist/summernote-classic.js');
        expect(markup, `${path} should not pin the classic stylesheet to a stale version`).not.to.match(/\/dist\/summernote-classic\.css\?v=/);
        expect(markup, `${path} should not pin the classic script to a stale version`).not.to.match(/\/dist\/summernote-classic\.js\?v=/);
        return;
      }

      expect(markup, `${path} should load the compiled dist stylesheet`).to.contain('/dist/summernote-next.css');
      expect(markup, `${path} should load the compiled dist script`).to.contain('/dist/summernote-next.js');
      expect(markup, `${path} should not pin the dist stylesheet to a stale version`).not.to.match(/\/dist\/summernote-next\.css\?v=/);
      expect(markup, `${path} should not pin the dist script to a stale version`).not.to.match(/\/dist\/summernote-next\.js\?v=/);
    });
  });

  it('keeps an example configuration block on the default example page', () => {
    expect(examplePages['../../examples/default.html']).to.contain('data-example-configuration');
    expect(examplePages['../../examples/default.html']).to.contain('Example configuration');
    expect(examplePages['../../examples/default.html']).to.contain('summernote.create(\'#editor\');');
  });

  it('keeps an example configuration block on the airmode example page', () => {
    expect(examplePages['../../examples/airmode.html']).to.contain('data-example-configuration');
    expect(examplePages['../../examples/airmode.html']).to.contain('summernote.create(\'#airmode-editor\', {');
  });

  it('keeps an example configuration block on the full example page', () => {
    expect(examplePages['../../examples/full.html']).to.contain('data-example-configuration');
    expect(examplePages['../../examples/full.html']).to.contain('summernote.create(\'#all-features-editor\', {');
  });

  it('loads the German language bundle and configures the editor locale on the German example page', () => {
    const germanPage = examplePages['../../examples/german.html'];

    expect(germanPage).to.contain('/dist/summernote-next.js');
    expect(germanPage).to.contain('/dist/lang/de-de.js');
    expect(germanPage).to.contain('summernote.create(\'#editor\', {');
    expect(germanPage).to.contain('lang: \'de-DE\'');
  });

  it('renders two separate example configuration cards on the toolbar colors page', () => {
    const toolbarColorsPage = examplePages['../../examples/toolbar-colors.html'];
    const cardMatches = toolbarColorsPage.match(/data-example-configuration/g) || [];

    expect(cardMatches).to.have.length(2);
    expect(toolbarColorsPage).to.contain('summernote.create(\'#toolbar-colors-editor\', {');
    expect(toolbarColorsPage).to.contain('summernote.create(\'#toolbar-colors-editor-light\', {');
  });

  it('links the Greek symbols example from the overview and keeps it asset-driven', () => {
    const overviewPage = overviewPages['../../examples/index.html'];
    const greekSymbolsPage = examplePages['../../examples/mathematical-symbols-greek-letters.html'];

    expect(overviewPage).to.contain('./mathematical-symbols-greek-letters.html');
    expect(greekSymbolsPage).to.contain('./assets/symbols_mathematical-symbols_Greek-letters.json');
    expect(greekSymbolsPage).to.contain('buttons: {');
    expect(greekSymbolsPage).to.contain('editor.saveRange');
    expect(greekSymbolsPage).to.contain('specialCharPicker: {');
    expect(greekSymbolsPage).to.contain('insertOnClick: false');
    expect(greekSymbolsPage).to.contain('descriptionText: \'\'');
    expect(greekSymbolsPage).to.contain('greek-symbols-mode-switch');
  });

  it('links the classic example from the overview and keeps it Bootstrap-free', () => {
    const overviewPage = overviewPages['../../examples/index.html'];
    const classicPage = examplePages['../../examples/summernote-classic.html'];

    expect(overviewPage).to.contain('./summernote-classic.html');
    expect(classicPage).to.contain('/dist/summernote-classic.css');
    expect(classicPage).to.contain('/dist/summernote-classic.js');
    expect(classicPage).not.to.contain('bootstrap.min.css');
    expect(classicPage).not.to.contain('bootstrap.bundle.min.js');
    expect(classicPage).to.contain('summernote.create(\'#classic-editor\', {');
    expect(classicPage).to.contain('dialogsInBody: true');
    expect(classicPage).to.contain('class="surface surface-editor"');
  });
});
