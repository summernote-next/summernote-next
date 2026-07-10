import { describe, expect, it } from 'vitest';

const buttonStylesPage = import.meta.glob('../../examples/summernote-next/plugin-button-styles.html', {
  eager: true,
  query: '?raw',
  import: 'default',
})['../../examples/summernote-next/plugin-button-styles.html'];

const indexPage = import.meta.glob('../../examples/summernote-next/index.html', {
  eager: true,
  query: '?raw',
  import: 'default',
})['../../examples/summernote-next/index.html'];

const helperSource = import.meta.glob('../../examples/assets/plugin-button-helpers.js', {
  eager: true,
  query: '?raw',
  import: 'default',
})['../../examples/assets/plugin-button-helpers.js'];

const stylesSource = import.meta.glob('../../examples/assets/plugin-button-styles.css', {
  eager: true,
  query: '?raw',
  import: 'default',
})['../../examples/assets/plugin-button-styles.css'];

describe('examples plugin button styles', () => {
  it('loads the compiled Summernote assets', () => {
    expect(buttonStylesPage).to.contain('/dist/summernote-next.css');
    expect(buttonStylesPage).to.contain('/dist/summernote-next.js');
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
      expect(buttonStylesPage, `missing stylesheet ${href}`).to.contain(href);
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
      expect(buttonStylesPage, `missing script ${src}`).to.contain(src);
    });
  });

  it('loads the shared plugin button helpers and styles', () => {
    expect(buttonStylesPage).to.contain('../../assets/plugin-button-helpers.js');
    expect(buttonStylesPage).to.contain('../../assets/plugin-button-styles.css');
  });

  it('creates three editors with svg, text, and glyph button styles', () => {
    expect(buttonStylesPage).to.contain("#plugin-button-styles-svg'");
    expect(buttonStylesPage).to.contain("buttonStyle: 'svg'");
    expect(buttonStylesPage).to.contain("#plugin-button-styles-text'");
    expect(buttonStylesPage).to.contain("buttonStyle: 'text'");
    expect(buttonStylesPage).to.contain("#plugin-button-styles-glyph'");
    expect(buttonStylesPage).to.contain("buttonStyle: 'glyph'");
  });

  it('references every plugin toolbar button in both editors', () => {
    const buttons = [
      'alignLeft', 'alignCenter', 'alignRight', 'alignJustify',
      'markText', 'inlineCode', 'kbdText', 'varText', 'sampleText',
      'specialCharacters', 'emojiPicker',
      'wordCounterToggle', 'linkExtractorToggle',
    ];

    buttons.forEach((button) => {
      expect(buttonStylesPage, `toolbar button "${button}" missing`).to.contain(`'${button}'`);
    });
  });

  it('exposes the helper API used by the plugins', () => {
    expect(helperSource).to.contain('buildButton');
    expect(helperSource).to.contain('buildDropdownToggle');
    expect(helperSource).to.contain('isTextStyle');
  });

  it('defines svg, text, and glyph button styling', () => {
    expect(stylesSource).to.contain('sn-plugin-button-svg-mode');
    expect(stylesSource).to.contain('sn-plugin-button-text-mode');
    expect(stylesSource).to.contain('sn-plugin-button-glyph-mode');
  });

  it('exposes the example from the public examples overview', () => {
    expect(indexPage).to.contain('./plugin-button-styles.html');
    expect(indexPage).to.contain('Plugin Button Styles');
  });
});