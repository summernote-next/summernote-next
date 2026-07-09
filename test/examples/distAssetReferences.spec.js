import { describe, expect, it } from 'vitest';

const examplePages = import.meta.glob('../../examples/summernote-next/{airmode,bootswatch,default,default-vs-card,full,german,mathematical-symbols-greek-letters,toolbar-colors}.html', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const classicExamplePages = import.meta.glob('../../examples/summernote-next-classic/**/*.html', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const overviewPages = import.meta.glob('../../examples/index.html', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const bs5OverviewPages = import.meta.glob('../../examples/summernote-next/index.html', {
  eager: true,
  query: '?raw',
  import: 'default',
});

describe('example asset references', () => {
  it('loads the compiled dist assets without a hard-coded cache-buster', () => {
    Object.entries(examplePages).forEach(([path, markup]) => {
      expect(markup, `${path} should load the compiled dist stylesheet`).to.contain('/dist/summernote-next.css');
      expect(markup, `${path} should load the compiled dist script`).to.contain('/dist/summernote-next.js');
      expect(markup, `${path} should not pin the dist stylesheet to a stale version`).not.to.match(/\/dist\/summernote-next\.css\?v=/);
      expect(markup, `${path} should not pin the dist script to a stale version`).not.to.match(/\/dist\/summernote-next\.js\?v=/);
    });
  });

  it('loads the compiled classic assets on every generated classic example page', () => {
    Object.entries(classicExamplePages)
      .filter(([path]) => !path.endsWith('/index.html'))
      .forEach(([path, markup]) => {
        expect(markup, `${path} should load the classic example stylesheet`).to.contain('/assets/classic-examples.css');
        expect(markup, `${path} should load the classic example helper script`).to.contain('/assets/classic-examples.js');
        expect(markup, `${path} should load the compiled classic stylesheet`).to.contain('/dist/summernote-next-classic.css');
        expect(markup, `${path} should load the compiled classic script`).to.contain('/dist/summernote-next-classic.js');
        expect(markup, `${path} should not load the Bootstrap 5 Summernote stylesheet`).not.to.contain('/dist/summernote-next.css');
        expect(markup, `${path} should not load the Bootstrap 5 Summernote script`).not.to.contain('/dist/summernote-next.js');
        expect(markup, `${path} should not load Bootstrap CSS or JS`).not.to.match(/bootstrap(\.bundle)?\.min\.(css|js)/);
        expect(markup, `${path} should not depend on Bootstrap modal helpers`).not.to.contain('bootstrap.Modal');
        expect(markup, `${path} should not keep Bootstrap data attributes`).not.to.contain('data-bs-');
      });
  });

  it('keeps an example configuration block on the default example page', () => {
    expect(examplePages['../../examples/summernote-next/default.html']).to.contain('data-example-configuration');
    expect(examplePages['../../examples/summernote-next/default.html']).to.contain('Example configuration');
    expect(examplePages['../../examples/summernote-next/default.html']).to.contain('summernote.create(\'#editor\');');
  });

  it('keeps an example configuration block on the airmode example page', () => {
    expect(examplePages['../../examples/summernote-next/airmode.html']).to.contain('data-example-configuration');
    expect(examplePages['../../examples/summernote-next/airmode.html']).to.contain('summernote.create(\'#airmode-editor\', {');
  });

  it('keeps an example configuration block on the full example page', () => {
    expect(examplePages['../../examples/summernote-next/full.html']).to.contain('data-example-configuration');
    expect(examplePages['../../examples/summernote-next/full.html']).to.contain('summernote.create(\'#all-features-editor\', {');
  });

  it('loads the German language bundle and configures the editor locale on the German example page', () => {
    const germanPage = examplePages['../../examples/summernote-next/german.html'];

    expect(germanPage).to.contain('/dist/summernote-next.js');
    expect(germanPage).to.contain('/dist/lang/de-de.js');
    expect(germanPage).to.contain('summernote.create(\'#editor\', {');
    expect(germanPage).to.contain('lang: \'de-DE\'');
  });

  it('renders two separate example configuration cards on the toolbar colors page', () => {
    const toolbarColorsPage = examplePages['../../examples/summernote-next/toolbar-colors.html'];
    const cardMatches = toolbarColorsPage.match(/data-example-configuration/g) || [];

    expect(cardMatches).to.have.length(2);
    expect(toolbarColorsPage).to.contain('summernote.create(\'#toolbar-colors-editor\', {');
    expect(toolbarColorsPage).to.contain('summernote.create(\'#toolbar-colors-editor-light\', {');
  });

  it('links the Greek symbols example from the BS5 overview and keeps it asset-driven', () => {
    const bs5OverviewPage = bs5OverviewPages['../../examples/summernote-next/index.html'];
    const greekSymbolsPage = examplePages['../../examples/summernote-next/mathematical-symbols-greek-letters.html'];

    expect(bs5OverviewPage).to.contain('./mathematical-symbols-greek-letters.html');
    expect(greekSymbolsPage).to.contain('./assets/symbols_mathematical-symbols_Greek-letters.json');
    expect(greekSymbolsPage).to.contain('buttons: {');
    expect(greekSymbolsPage).to.contain('editor.saveRange');
    expect(greekSymbolsPage).to.contain('specialCharPicker: {');
    expect(greekSymbolsPage).to.contain('insertOnClick: false');
    expect(greekSymbolsPage).to.contain('descriptionText: \'\'');
    expect(greekSymbolsPage).to.contain('greek-symbols-mode-switch');
  });

  it('links the classic example catalog from the overview', () => {
    const overviewPage = overviewPages['../../examples/index.html'];
    const classicOverviewPage = classicExamplePages['../../examples/summernote-next-classic/index.html'];

    expect(overviewPage).to.contain('./summernote-next-classic/');
    expect(classicOverviewPage).to.contain('Summernote Next Classic example pages');
    expect(classicOverviewPage).to.contain('./default.html');
  });

  it('turns the classic theme showcase into a self-styled page', () => {
    const themePage = classicExamplePages['../../examples/summernote-next-classic/bootswatch.html'];

    expect(themePage).to.contain('built-in example themes');
    expect(themePage).to.contain('const themePresets = {');
    expect(themePage).to.contain('--example-theme-');
    expect(themePage).not.to.contain('bootswatch@');
  });
});