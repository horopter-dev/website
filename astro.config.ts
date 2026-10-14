import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// Cloudflare Web Analytics: the beacon script, and the origin it reports to.
const analyticsScript = "https://static.cloudflareinsights.com";
const analyticsReport = "https://cloudflareinsights.com";

export default defineConfig({
  site: "https://www.horopter.dev",
  security: {
    // The resource directives, as a <meta> tag on every page with a hash of each script and style
    // Astro bundles. The directives a meta tag cannot carry are in public/_headers.
    csp: {
      algorithm: "SHA-256",
      directives: [
        "default-src 'none'",
        "img-src 'self'",
        "font-src 'self'",
        `connect-src 'self' ${analyticsReport}`,
      ],
      scriptDirective: { resources: ["'self'", analyticsScript] },
      styleDirective: { resources: ["'self'"] },
    },
  },
  // Shiki highlights with inline styles, which the CSP refuses; the site has no Markdown yet.
  markdown: { syntaxHighlight: false },
  vite: {
    plugins: [tailwindcss()],
  },
});
