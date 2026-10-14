# website

The Horopter project site: Astro and Tailwind, built as a static site and deployed to
Cloudflare Pages at <https://www.horopter.dev/>. The site is not indexed yet. The
documentation is a separate site, [`horopter-docs`](https://github.com/horopter-dev/horopter-docs).

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

## Theme

The toggle offers system, light and dark, and starts on system. `public/theme.js` runs in
`<head>` without `async` or `defer`, so the stored choice applies before first paint. It
behaves as `next-themes` does: the choice is stored under `theme` in `localStorage`, the
resolved theme is a class and `color-scheme` on `<html>`, and it follows the system setting
live and a choice made in another tab. With JavaScript off, the toggle stays hidden and the
page follows the system setting through `prefers-color-scheme`.

## Security headers

The Content Security Policy comes in two halves:

- Astro's `security.csp` (`astro.config.ts`) writes the resource directives into a `<meta>` tag
  on every page, with a hash of every script and style it bundles. Astro places the tag at the
  end of `<head>`, so it does not govern `/theme.js` above it, which loads nothing.
- `public/_headers` carries what a meta tag cannot: `frame-ancestors`, `base-uri`,
  `object-src` and `form-action`, beside `Referrer-Policy` and `X-Content-Type-Options`.

The only third-party origins allowed are Cloudflare Web Analytics'. `_headers` also keeps
`*.pages.dev` out of search with `X-Robots-Tag: noindex`.

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
every same-origin link and asset resolves to a file in the build, and no page holds
placeholder text.

oxlint lints `.astro` files, but oxfmt does not format them, so prettier with
`prettier-plugin-astro` formats `.astro` files and nothing else. oxfmt formats everything else.

## Licence

Apache-2.0; see `LICENSE`.
