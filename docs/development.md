# Development

## Working on it

Tools are pinned in `mise.toml`; `mise install` provides Node, pnpm and prek.

```sh
pnpm install          # lifecycle scripts are off; nothing runs on install
prek install
pnpm dev              # http://localhost:4321
```

Pages are Astro components under `src/pages/`, sharing `src/layouts/Base.astro`. Colours and
fonts are tokens in `src/styles/global.css`.

`public/brand/` holds the Horopter lockup and favicons, light and dark: copies of the brand's
own files, unchanged. Replace them from the source rather than editing them here.

## Checks

`ci.yaml` runs these on every pull request; run them locally the same way:

```sh
pnpm lint && pnpm format:check && pnpm types:check && pnpm test
pnpm build            # static build to dist/, then scripts/check-build.ts
prek run --all-files
```

`pnpm build` fails unless the build has a `404.html` (without one, Cloudflare Pages serves `/`
for every unknown path), `robots.txt` disallows all crawling, every page carries a robots
`noindex` meta tag and the CSP meta tag, `_headers` sets `frame-ancestors` for every path,
every same-origin link, asset and Open Graph image resolves to a file in the build, and no page
holds placeholder text.

oxlint lints `.astro` files, but oxfmt does not format them, so prettier with
`prettier-plugin-astro` formats `.astro` files and nothing else. oxfmt formats everything else.
