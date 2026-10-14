# Deploying

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
