# The Grafana panel

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
