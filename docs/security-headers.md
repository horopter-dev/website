# Security headers

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
