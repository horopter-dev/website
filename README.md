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

## The Grafana panel

`public/panel/light.webp` and `public/panel/dark.webp` are the landing page's Grafana panel,
and `public/social.png`, 1200 by 630, is its Open Graph image. All three are captures of the
Requests per second panel on the Try Horopter dashboard, from the stack in the
[Try Horopter](https://docs.horopter.dev/tutorials/try-horopter/) tutorial. They change only
when someone captures them again; do that when Grafana's look changes.

1. Follow the tutorial as far as "Record a Change", in an empty directory, at the release the
   docs pin.
2. Record a change whose region stands alone, with nothing else in the two minutes either side
   of it, and note when it started and ended: `horo changes --since 1h --format table`.
3. Capture the panel solo, over a range of about two and a half minutes around that change, in
   both themes and for the social image. `FROM` and `TO` are milliseconds since the epoch;
   `hideLogo` drops Grafana's badge.

   ```sh
   chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
   panel="http://localhost:3000/d-solo/try-horopter/x?orgId=1&panelId=1"
   panel="$panel&from=$FROM&to=$TO&hideLogo=true&timezone=utc"
   shot() {
     "$chrome" --headless=new --hide-scrollbars --virtual-time-budget=20000 \
       --window-size="$1" --force-device-scale-factor="$2" \
       --screenshot="$3" "$panel&theme=$4"
   }
   shot 1200,660 2 light.png light
   shot 1200,660 2 dark.png dark
   shot 1200,720 1 social.png light
   ```

4. Grafana leaves empty space below a solo panel. Crop each capture to the panel's bottom
   border, then convert the two themes to WebP, for example with
   `cwebp -q 85 -m 6 -crop 0 0 2400 <height> light.png -o public/panel/light.webp`. Crop the
   social image to exactly 1200 by 630.
5. If the panel's height changed, update the `height` of both images in `src/pages/index.astro`
   to half the cropped height.

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

The only third-party origins allowed are Cloudflare Web Analytics'. Its beacon is included by
hand in `src/layouts/Base.astro`, with the site token that `horopter-dev/infrastructure`
outputs as `web_analytics_site_token`; the token is public, since every page carries it.
`_headers` also keeps `*.pages.dev` out of search with `X-Robots-Tag: noindex`.

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

## Deploying

The site is uploaded to Cloudflare Pages with `wrangler pages deploy`, which is pinned in
`package.json`. A push to `main` runs `deploy.yaml`, which builds the site with the same
toolchain and deploys production. To redeploy `main` without a push, run
`gh workflow run deploy.yaml --ref main`.

A pull request's code never runs beside the deploy token. CI builds the site and uploads
`dist/` as an artifact; once CI passes, `preview.yaml`, which `workflow_run` always runs as it
is on `main`, deploys those files as a preview at `<alias>.<project>.pages.dev`, which
Cloudflare marks `noindex`. It refuses a site holding `_worker.js`, which Pages would run as the
preview's Worker. The alias is the branch name, lowercased, with every character
other than a letter or digit turned into a hyphen, cut to 28 characters. A pull request from a
fork, one Dependabot opens, or one whose branch is named `main` gets no preview, and the job is
skipped. The preview's run is listed under Actions, not among the pull request's checks.

Both workflows read three secrets: `CLOUDFLARE_API_TOKEN`, a token holding only Cloudflare
Pages Edit, plus `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_PAGES_PROJECT`. They are set on the
`production` and `preview` environments, which accept only runs on `main`, and never at
repository level. The environments are declared in
[`yo61/github-repos`](https://github.com/yo61/github-repos); the Pages project, the
`www.horopter.dev` domain and the secrets are managed in
[`horopter-dev/infrastructure`](https://github.com/horopter-dev/infrastructure).

## Licence

Apache-2.0; see `LICENSE`.
