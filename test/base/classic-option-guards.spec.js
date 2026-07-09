import { describe, it } from 'vitest';
import $$ from '@/js/core/dom-query.js';
import '@/styles/classic/summernote-next-classic';

describe('summernote-next-classic option guards', () => {
  it('covers the missing options.modules branch', async() => {
    const originalModules = $$.summernote.options.modules;
    delete $$.summernote.options.modules;

    await import( /* @vite-ignore */ `/src/styles/classic/summernote-next-classic.js?guards-modules=${Date.now()}`);

    $$.summernote.options.modules = originalModules;
  });

  it('covers the missing options branch', async() => {
    const originalOptions = $$.summernote.options;
    delete $$.summernote.options;

    await import( /* @vite-ignore */ `/src/styles/classic/summernote-next-classic.js?guards-options=${Date.now()}`);

    $$.summernote.options = originalOptions;
  });
});