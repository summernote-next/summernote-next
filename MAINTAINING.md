# Maintaining Summernote Next

Summernote Next is maintained in <https://github.com/summernote-next/summernote-next> and published as public examples at <https://juergen-schwind.com/summernote-next>. The shared Vanilla JS editor core ships as a Bootstrap 5 integration and as a standalone, UI toolkit-independent Classic UI.

## Working locally

Run project commands in Docker with the existing application container:

```bash
docker exec --user=application -w /app summernote-next-web-1 bash -lc "<command>"
```

Recommended checks:

```bash
docker exec --user=application -w /app summernote-next-web-1 bash -lc "npm run lint"
docker exec --user=application -w /app summernote-next-web-1 bash -lc "npm run test:coverage"
docker exec --user=application -w /app summernote-next-web-1 bash -lc "npm run test:scripts"
docker exec --user=application -w /app summernote-next-web-1 bash -lc "npm run build"
```

## Documentation and metadata

Keep these files aligned whenever project ownership, branding, or public links change:

- `README.md`
- `MAINTAINING.md`
- `LICENSE`
- `package.json`
- `package-lock.json`
- `src/js/module/HelpDialog.js`
- `examples/`

All public links in examples and dialogs should point to the maintained fork, not the upstream Summernote project.

## Copyright and license

Summernote Next remains MIT licensed.

When updating copyright notices:

1. Preserve the original Summernote notice.
2. Add the fork notice for Jürgen Schwind from 2026 onward.
3. Keep the wording MIT-compatible and include the notice anywhere the license requires it.

## Release checklist

1. Update the version in `package.json` and `package-lock.json`.
2. Add the release summary in `docs/rls/`.
3. Run lint, 100% coverage, script tests, and the build in Docker.
4. Review the generated `dist/` files and both UI example variants.
5. Commit the release changes and create the corresponding Git tag.
6. Create a GitHub release in <https://github.com/summernote-next/summernote-next/releases>.

## Support channels

- Issues: <https://github.com/summernote-next/summernote-next/issues>
- Website: <https://juergen-schwind.com>
- Email: <mailto:info@juergen-schwind.de>
