# Theme

The toggle offers system, light and dark, and starts on system. `public/theme.js` runs in
`<head>` without `async` or `defer`, so the stored choice applies before first paint. It
behaves as `next-themes` does: the choice is stored under `theme` in `localStorage`, the
resolved theme is a class and `color-scheme` on `<html>`, and it follows the system setting
live and a choice made in another tab. With JavaScript off, the toggle stays hidden and the
page follows the system setting through `prefers-color-scheme`.
