import { describe, expect, it } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { transformClassicExampleMarkup } from '../../scripts/build-classic-examples.js';

const SOURCE_BOOTSWATCH = join('examples', 'summernote-next', 'bootswatch.html');

async function buildClassicBootswatch() {
  const source = await readFile(SOURCE_BOOTSWATCH, 'utf8');
  return transformClassicExampleMarkup(source, 'bootswatch.html');
}

describe('buildClassicExamples: bootswatch theme showcase', () => {
  it('drops the Bootswatch CDN dependency and keeps the classic assets', async() => {
    const markup = await buildClassicBootswatch();

    expect(markup).to.contain('/assets/classic-examples.css');
    expect(markup).to.contain('/assets/classic-examples.js');
    expect(markup).to.contain('/dist/summernote-next-classic.css');
    expect(markup).to.contain('/dist/summernote-next-classic.js');
    expect(markup).not.to.match(/bootswatch@\d/);
    expect(markup).not.to.match(/bootstrap(?:\.bundle)?\.min\.(css|js)/);
  });

  it('publishes kebab-case CSS custom properties from camelCase preset keys', async() => {
    const markup = await buildClassicBootswatch();

    expect(markup).to.contain("const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();");
    expect(markup).to.contain('`--example-theme-${cssKey}`');
    expect(markup).not.to.contain('`--example-theme-${key}`');
  });

  it('records the active preset mode so dark presets switch the editor color-scheme', async() => {
    const markup = await buildClassicBootswatch();

    expect(markup).to.contain("root.dataset.exampleThemeMode = preset.mode || 'light';");
    expect(markup).to.contain("mode: 'dark'");
    expect(markup).to.contain("mode: 'light'");
  });

  it('extends every preset with surface text colors for readable dark themes', async() => {
    const markup = await buildClassicBootswatch();

    expect(markup).to.contain("surfaceColor: '#f8f9fa'");
    expect(markup).to.contain("surfaceColor: '#212529'");
    expect(markup).to.contain("mutedColor: '#adb5bd'");
    expect(markup).to.contain("mutedColor: '#6c757d'");

    const darkPresetMatch = markup.match(/darkly:\s*\{([^}]*)\}/);
    expect(darkPresetMatch, 'expected a darkly preset block').not.to.equal(null);
    expect(darkPresetMatch[1]).to.contain("mode: 'dark'");
    expect(darkPresetMatch[1]).to.contain("surfaceColor: '#f8f9fa'");
  });

  it('marks sharp themes with a square radius and softer themes with a wider radius', async() => {
    const markup = await buildClassicBootswatch();

    ['cosmo', 'journal', 'simplex', 'sketchy'].forEach((theme) => {
      const match = markup.match(new RegExp(`${theme}:\\s*\\{([^}]*)\\}`));
      expect(match, `expected a ${theme} preset block`).not.to.equal(null);
      expect(match[1], `${theme} should be square`).to.contain("radius: '0'");
    });

    ['morph', 'quartz', 'vapor'].forEach((theme) => {
      const match = markup.match(new RegExp(`${theme}:\\s*\\{([^}]*)\\}`));
      expect(match, `expected a ${theme} preset block`).not.to.equal(null);
      expect(match[1], `${theme} should be soft`).to.contain("radius: '0.75rem'");
    });
  });

  it('clears stale inline theme tokens before applying the next preset', async() => {
    const markup = await buildClassicBootswatch();

    expect(markup).to.contain("if (property.startsWith('--example-theme-')) {");
    expect(markup).to.contain('root.style.removeProperty(property);');
  });

  it('rewrites the theme source copy to reference the classic assets', async() => {
    const markup = await buildClassicBootswatch();

    expect(markup).to.contain('The page updates local CSS variables only.');
    expect(markup).to.contain('<code>summernote-next-classic.css</code> and <code>summernote-next-classic.js</code> assets.');
    expect(markup).not.to.contain('The page swaps only the Bootswatch CDN stylesheet.');
    expect(markup).not.to.contain('summernote-bs5.css');
  });

  it('renders the example configuration block with the kebab-case preset mapping', async() => {
    const markup = await buildClassicBootswatch();

    expect(markup).to.contain('Example configuration - Theme presets');
    expect(markup).to.contain("accentContrast: '#ffffff'");
    expect(markup).to.contain('const cssKey = key.replace');
    expect(markup).to.contain("radius: '0'");
    expect(markup).to.contain("radius: '0.375rem'");
  });
});
