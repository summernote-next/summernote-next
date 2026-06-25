import { describe, expect, it } from 'vitest';

const showcasePage = import.meta.glob('../../examples/summernote-next/plugins-showcase.html', {
  eager: true,
  query: '?raw',
  import: 'default',
})['../../examples/summernote-next/plugins-showcase.html'];

const indexPage = import.meta.glob('../../examples/summernote-next/index.html', {
  eager: true,
  query: '?raw',
  import: 'default',
})['../../examples/summernote-next/index.html'];

describe('examples plugin showcase', () => {
  it('loads the compiled Summernote assets', () => {
    expect(showcasePage).to.contain('/dist/summernote-next.css');
    expect(showcasePage).to.contain('/dist/summernote-next.js');
  });

  it('loads every plugin stylesheet from the plugins directory', () => {
    const stylesheets = [
      '../plugins/word-counter/css/word-counter.css',
      '../plugins/alignment-buttons/css/alignment-buttons.css',
      '../plugins/special-characters/css/special-characters.css',
      '../plugins/text-styles/css/text-styles.css',
      '../plugins/link-extractor/css/link-extractor.css',
      '../plugins/emoji-picker/css/emoji-picker.css',
    ];

    stylesheets.forEach((href) => {
      expect(showcasePage, `missing stylesheet ${href}`).to.contain(href);
    });
  });

  it('loads every plugin script from the plugins directory', () => {
    const scripts = [
      '../plugins/word-counter/js/word-counter.js',
      '../plugins/alignment-buttons/js/alignment-buttons.js',
      '../plugins/special-characters/js/special-characters.js',
      '../plugins/text-styles/js/text-styles.js',
      '../plugins/link-extractor/js/link-extractor.js',
      '../plugins/emoji-picker/js/emoji-picker.js',
    ];

    scripts.forEach((src) => {
      expect(showcasePage, `missing script ${src}`).to.contain(src);
    });
  });

  it('references every plugin toolbar button', () => {
    const buttons = [
      'alignLeft', 'alignCenter', 'alignRight', 'alignJustify',
      'markText', 'inlineCode', 'kbdText', 'varText', 'sampleText',
      'specialCharacters', 'emojiPicker',
      'wordCounterToggle', 'linkExtractorToggle',
    ];

    buttons.forEach((button) => {
      expect(showcasePage, `toolbar button "${button}" missing`).to.contain(`'${button}'`);
    });
  });

  it('explains the new registerPlugin helper and existing plugin registry', () => {
    expect(showcasePage).to.contain('summernote.registerPlugin');
    expect(showcasePage).to.contain('summernote.summernote.plugins');
  });

  it('exposes the example from the public examples overview', () => {
    expect(indexPage).to.contain('./plugins-showcase.html');
  });
});