# Sign

Installable web app (PWA) for learning sign languages: lessons, spaced-repetition quizzes and
handshape practice with the camera. Everything runs in the browser; the camera image never
leaves the device.

Repository: <https://github.com/edfrias/Sign> · Issues: <https://github.com/edfrias/Sign/issues>

> The app's interface and learning content are in Spanish; it currently teaches Spanish Sign
> Language (LSE), with American Sign Language (ASL) set up as a second language.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run a11y       # accessibility audit with axe (requires Chrome)
npm run build      # production build in dist/
```

The camera requires `localhost` or HTTPS.

## Accessibility

- `npm run a11y` starts the app, opens every screen in Chrome (light and dark mode) and runs
  [axe-core](https://github.com/dequelabs/axe-core) with the WCAG 2.2 A/AA and best-practice rules.
  It exits with an error if it finds issues and writes the details to `a11y-report/report.json`.
  Options: `-- --only /creditos` for a single route, `A11Y_BROWSER=msedge` to use Edge.
- With `npm run dev`, axe re-checks the page whenever it changes and logs new issues to the
  browser console (`[axe] …`). It is not included in the production build.

axe automatically detects roughly half of all accessibility issues; keyboard and screen-reader
navigation still need to be tested by hand.

## Documentation

- [Analysis and requirements](docs/01-analysis.md)
- [Architecture](docs/02-architecture.md)
- [Roadmap](docs/03-roadmap.md)
- [Content sources and licences](docs/04-sources.md)

## Adding content

Each language is a folder in `content/` with `signs.json` and `units.json`, plus an entry in
`content/languages.json`. Videos and images go in `public/media/<language>/` and are referenced
as `"/media/lse/a.mp4"`.

Only use your own material or material whose licence allows it, and fill in `credit` and `license`.
Set `"verified": true` once a reliable dictionary or a signer has confirmed the sign.

## Camera practice

It works hands-free and without calibration: the photo of each letter is used as the reference.

1. Open **Cámara** (Camera) and press **Empezar práctica** (Start practice) — it is the only click.
2. Sign the letter shown in large type. Hold it correctly for 1 second: a beep plays and the next
   letter appears. If you get stuck, it is skipped automatically after 20 s.
3. Optional: **Calibración guiada** (Guided calibration) goes through the letters and records your
   own hand automatically whenever you hold it still, which improves accuracy.

If validation feels too easy or too hard, change the **Tolerancia** (Tolerance) before starting.

## Licence

The sign content and images in `content/` and `public/media/` include material from Fundación
CNSE and are licensed under CC BY-NC-SA 3.0 — see [content/LICENSE.md](content/LICENSE.md) and the
in-app **Créditos** page.
