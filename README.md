# Summernote Next

[![npm version](https://jbs-newmedia.de/badge/npm/summernote-next/version.svg?v=1.0.3)](https://www.npmjs.com/package/summernote-next)
[![npm downloads](https://jbs-newmedia.de/badge/npm/summernote-next/download.svg?v=1.0.3)](https://www.npmjs.com/package/summernote-next)
[![Composer version](https://jbs-newmedia.de/badge/composer/summernote-next/summernote-next/version.svg?v=1.0.3)](https://packagist.org/packages/summernote-next/summernote-next)
[![Composer downloads](https://jbs-newmedia.de/badge/composer/summernote-next/summernote-next/download.svg?v=1.0.3)](https://packagist.org/packages/summernote-next/summernote-next)
[![jsDelivr](https://jbs-newmedia.de/badge/jsdelivr/summernote-next/hits.svg?v=1.0.3)](https://www.jsdelivr.com/package/npm/summernote-next)
[![License](https://jbs-newmedia.de/badge/npm/summernote-next/license.svg?v=1.0.3)](LICENSE)
[![Tests](https://jbs-newmedia.de/badge/github/summernote-next/summernote-next/tests.svg?v=1.0.3)](https://github.com/summernote-next/summernote-next/actions/workflows/codecov.yml)
[![codecov](https://jbs-newmedia.de/badge/codecov/summernote-next/summernote-next/coverage.svg?v=1.0.3)](https://codecov.io/gh/summernote-next/summernote-next)
[![GitHub stars](https://jbs-newmedia.de/badge/github/summernote-next/summernote-next/stars.svg?v=1.0.3)](https://github.com/summernote-next/summernote-next)

Summernote Next is a maintained MIT-licensed fork of Summernote (https://github.com/summernote/summernote/). It provides one Vanilla JS editor core in two UI variants: `summernote-next` integrates with Bootstrap 5, while `summernote-next-classic` provides a standalone, UI toolkit-independent Classic UI.

| Resource | URL |
| --- | --- |
| Live examples | <https://juergen-schwind.com/summernote-next> |
| GitHub repository | <https://github.com/summernote-next/summernote-next> |
| Original repository | <https://github.com/summernote/summernote/> |
| Maintainer | Jürgen Schwind |
| Contact | <mailto:info@juergen-schwind.de> |
| Website | <https://juergen-schwind.com> |
| License | [MIT](./LICENSE) |

## Highlights

- Shared Vanilla JS editor core with two UI variants
- Bootstrap 5 integration through the `summernote-next` bundle
- Standalone, UI toolkit-independent Classic UI through the `summernote-next-classic` bundle
- Public API: `summernote.create()`, `summernote.invoke()`, `summernote.getInstance()`
- Plugin API: `summernote.registerPlugin()`, `summernote.getPluginMeta()`, `summernote.listPlugins()`
- Compiled assets in `dist/`
- 100% line, statement, function, and branch coverage enforced per source file
- Public example pages aligned with the current fork
- MIT license with preserved upstream copyright notice and added fork copyright

## Quick start

Install dependencies and build the distributable files:

```bash
npm install
npm run build
```

### Bootstrap 5 UI

Include Bootstrap 5 and the compiled `summernote-next` assets in your page:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css">
<link rel="stylesheet" href="dist/summernote-next.css">

<script defer src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>
<script defer src="dist/summernote-next.js"></script>
```

Add an editor element and initialize it with the public API:

```html
<div id="editor">Hello Summernote Next</div>

<script>
  document.addEventListener('DOMContentLoaded', () => {
    summernote.create('#editor');
  });
</script>
```

### Classic UI

For a standalone UI that does not depend on Bootstrap or another UI toolkit, load the `summernote-next-classic` bundle instead:

```html
<link rel="stylesheet" href="dist/summernote-next-classic.css">

<script defer src="dist/summernote-next-classic.js"></script>
```

## Examples

The maintained example catalog for this fork is available at <https://juergen-schwind.com/summernote-next>. The local `examples/` directory mirrors the public structure and demonstrates both `summernote-next` with Bootstrap 5 and the standalone, UI toolkit-independent `summernote-next-classic` variant.

## Development

Useful commands:

```bash
npm run lint
npm run test:coverage
npm run test:scripts
npm run cypress
npm run build
```

## Contributing

Issues and pull requests should be opened in <https://github.com/summernote-next/summernote-next>.

## Maintainer

Summernote Next is maintained by Jürgen Schwind.

- Website: <https://juergen-schwind.com>
- Email: <mailto:info@juergen-schwind.de>

## License

Summernote Next is released under the MIT License. This project is a fork of Summernote (https://github.com/summernote/summernote/). This fork preserves the original Summernote MIT notice and adds the fork maintainer copyright for work from 2026 onward.
