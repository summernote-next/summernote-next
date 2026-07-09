import { describe, expect, it } from 'vitest';

const examplePages = import.meta.glob('../../examples/summernote-next/modules/*.html', {
  eager: true,
  query: '?raw',
  import: 'default',
});

describe('examples modules examples', () => {
  it('keeps the local index focused on the built-in module topic pages', () => {
    const indexPage = examplePages['../../examples/summernote-next/modules/index.html'];

    expect(indexPage).to.contain('Modules');
    expect(indexPage).to.contain('./status-messages.html');
    expect(indexPage).to.contain('./normal-and-air-mode.html');
    expect(indexPage).to.contain('./built-in-feedback.html');
  });

  it('loads compiled Summernote assets and configuration cards on runnable topic pages', () => {
    Object.entries(examplePages)
      .filter(([path]) => !path.endsWith('/index.html'))
      .forEach(([path, markup]) => {
        expect(markup, `${path} should load the compiled dist stylesheet`).to.contain('/dist/summernote-next.css');
        expect(markup, `${path} should load the compiled dist script`).to.contain('/dist/summernote-next.js');
        expect(markup, `${path} should contain a configuration card`).to.contain('data-example-configuration');
      });
  });

  it('documents the current status output surface and built-in feedback path', () => {
    expect(examplePages['../../examples/summernote-next/modules/status-messages.html']).to.contain('.note-status-output');
    expect(examplePages['../../examples/summernote-next/modules/normal-and-air-mode.html']).to.contain('airMode: true');
    expect(examplePages['../../examples/summernote-next/modules/built-in-feedback.html']).to.contain('editor.fontStyling');
  });
});