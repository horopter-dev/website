import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkBuild } from "#scripts/check-build.ts";

const csp = `<meta http-equiv="content-security-policy" content="script-src 'self'">`;

function page(body: string, head = csp): string {
  return `<!DOCTYPE html><html><head>${head}
<meta name="robots" content="noindex, nofollow">
<link rel="stylesheet" href="/_astro/a.css">
<script src="/theme.js"></script>
</head><body>${body}</body></html>`;
}

const headers = `/*
  Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'
  Content-Security-Policy: object-src 'none'; form-action 'self'
`;

const created: string[] = [];

afterEach(() => {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function buildDir(files: Record<string, string | null>): string {
  const dir = mkdtempSync(join(tmpdir(), "check-build-"));
  created.push(dir);
  for (const [path, content] of Object.entries(files)) {
    if (content !== null) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), content);
    }
  }
  return dir;
}

function goodBuild(overrides: Record<string, string | null> = {}): string {
  return buildDir({
    "index.html": page(`<a href="/">Home</a><a href="https://docs.horopter.dev/">Docs</a>`),
    "404.html": page(`<a href="/">Home</a>`),
    _headers: headers,
    "robots.txt": "User-agent: *\nDisallow: /\n",
    "theme.js": "",
    "_astro/a.css": [
      "@font-face{src:url(/_astro/a.woff2),url(b.woff)}",
      `.a{background:url("data:image/svg+xml,x")}`,
    ].join(""),
    "_astro/a.woff2": "",
    "_astro/b.woff": "",
    ...overrides,
  });
}

describe("checkBuild", () => {
  it("accepts a build that is complete, not indexed and whose links resolve", () => {
    expect(checkBuild(goodBuild())).toEqual([]);
  });

  it("reports a build with no pages", () => {
    expect(checkBuild(buildDir({ _headers: headers }))).toEqual(["the build holds no html pages"]);
  });

  it("reports a missing 404.html", () => {
    expect(checkBuild(goodBuild({ "404.html": null }))).toEqual([
      "404.html is missing, so Cloudflare Pages would serve / for every unknown path",
    ]);
  });

  it("reports a missing robots.txt", () => {
    expect(checkBuild(goodBuild({ "robots.txt": null }))).toEqual(["robots.txt is missing"]);
  });

  it("reports a robots.txt that does not disallow everything", () => {
    expect(checkBuild(goodBuild({ "robots.txt": "User-agent: *\nAllow: /\n" }))).toEqual([
      "robots.txt does not disallow all crawling: User-agent: * / Allow: /",
    ]);
  });

  it("reads robots.txt past comments", () => {
    const robots = "# Until the launch.\nUser-agent: *\n# Everything.\nDisallow: / # all of it\n";
    expect(checkBuild(goodBuild({ "robots.txt": robots }))).toEqual([]);
  });

  it("reports a page without a robots noindex meta tag", () => {
    const html = page("").replace(/<meta name="robots"[^>]*>/, "");
    expect(checkBuild(goodBuild({ "index.html": html }))).toEqual([
      'index.html has no <meta name="robots"> containing noindex',
    ]);
  });

  it("reports a page without the CSP meta tag", () => {
    expect(checkBuild(goodBuild({ "index.html": page("", "") }))).toEqual([
      "index.html has no Content-Security-Policy meta tag",
    ]);
  });

  it("reports a missing _headers file", () => {
    expect(checkBuild(goodBuild({ _headers: null }))).toEqual(["_headers is missing"]);
  });

  it("reports _headers without frame-ancestors in a CSP for every path", () => {
    const other = `/*
  Referrer-Policy: no-referrer
/blog/*
  Content-Security-Policy: frame-ancestors 'none'
`;
    expect(checkBuild(goodBuild({ _headers: other }))).toEqual([
      "_headers sets no Content-Security-Policy with frame-ancestors for /*",
    ]);
  });

  it("reports a root-relative link that does not resolve", () => {
    expect(checkBuild(goodBuild({ "index.html": page(`<a href="/missing/">x</a>`) }))).toEqual([
      "index.html links /missing/, which is not in the build",
    ]);
  });

  it("resolves directory links, query strings and fragments", () => {
    const build = goodBuild({
      "index.html": page(`<a href="/about/?a=b#team">About</a><a href="/about">About</a>`),
      "about/index.html": page(`<a href="#top">Top</a>`),
    });
    expect(checkBuild(build)).toEqual([]);
  });

  it("reports a link to a directory with no index page", () => {
    const build = goodBuild({
      "index.html": page(`<a href="/brand">x</a>`),
      "brand/lockup.svg": "",
    });
    expect(checkBuild(build)).toEqual(["index.html links /brand, which is not in the build"]);
  });

  it("resolves a relative link against its page", () => {
    const build = goodBuild({
      "about/index.html": page(`<img src="lockup.svg"><a href="../">Home</a><a href="gone">x</a>`),
      "about/lockup.svg": "",
    });
    expect(checkBuild(build)).toEqual(["about/index.html links gone, which is not in the build"]);
  });

  it("ignores links to other origins, mail and data", () => {
    const body = [
      `<a href="mailto:a@b.c">m</a>`,
      `<img src="data:image/png;base64,AA==">`,
      `<a href="//x.org/">x</a>`,
    ].join("");
    expect(checkBuild(goodBuild({ "index.html": page(body) }))).toEqual([]);
  });

  it("checks links to the site's own origin", () => {
    const body = [
      `<link rel="canonical" href="https://www.horopter.dev/">`,
      `<a href="https://www.horopter.dev/gone">x</a>`,
    ].join("");
    expect(checkBuild(goodBuild({ "index.html": page(body) }))).toEqual([
      "index.html links https://www.horopter.dev/gone, which is not in the build",
    ]);
  });

  it("checks the Open Graph image, and no other meta content", () => {
    const head = [
      csp,
      `<meta name="description" content="Not a link">`,
      `<meta property="og:image" content="https://www.horopter.dev/og.png">`,
    ].join("");
    expect(checkBuild(goodBuild({ "index.html": page("", head) }))).toEqual([
      "index.html links https://www.horopter.dev/og.png, which is not in the build",
    ]);
    expect(checkBuild(goodBuild({ "index.html": page("", head), "og.png": "" }))).toEqual([]);
  });

  it("reports a malformed link instead of failing", () => {
    expect(checkBuild(goodBuild({ "index.html": page(`<a href="/100%">x</a>`) }))).toEqual([
      "index.html links /100%, which is not a valid URL",
    ]);
  });

  it("reports a stylesheet url() that does not resolve", () => {
    const css = `@font-face{src:url(/_astro/gone.woff2)}.a{background:url("img.svg")}`;
    expect(checkBuild(goodBuild({ "_astro/a.css": css }))).toEqual([
      "_astro/a.css links /_astro/gone.woff2, which is not in the build",
      "_astro/a.css links img.svg, which is not in the build",
    ]);
  });

  it("reports text a template failed to render", () => {
    const body =
      "<h1>{headline}</h1><p>TODO: say what it does</p><p>undefined</p><p>[object Object]</p>";
    expect(checkBuild(goodBuild({ "index.html": page(body) }))).toEqual([
      "index.html holds an unrendered placeholder: {headline}",
      "index.html holds an unrendered placeholder: TODO",
      "index.html holds an unrendered placeholder: undefined",
      "index.html holds an unrendered placeholder: [object Object]",
    ]);
  });

  it("allows placeholder-like text in prose and code", () => {
    const body =
      "<p>Keep a todo list.</p><pre><code>{name} TODO undefined</code></pre><code>{x}</code>";
    expect(checkBuild(goodBuild({ "index.html": page(body) }))).toEqual([]);
  });
});
