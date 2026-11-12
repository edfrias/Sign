# Sign

Installable web app (PWA) for learning sign languages: lessons, spaced-repetition quizzes and
handshape practice with the camera. Everything runs in the browser; the camera image never
leaves the device.

Repository: <https://github.com/edfrias/Sign> · Issues: <https://github.com/edfrias/Sign/issues>

> The app's interface and learning content are in Spanish; it currently teaches Spanish Sign
> Language (LSE), with American Sign Language (ASL) set up as a second language.

## Getting started

```bash
pnpm install
pnpm dev           # http://localhost:5173
pnpm test          # unit tests
pnpm a11y          # accessibility audit with axe (requires Chrome)
pnpm build         # production build in dist/
pnpm icons         # regenerate the PNG app icons from public/icon.svg
pnpm hand-focus    # locate the hands in every sign photo for the hand zoom (requires Chrome)
```

The project uses [pnpm](https://pnpm.io/) (the version is pinned in `packageManager` in
`package.json`; run `corepack enable` to get it automatically). Do not use npm or yarn: they would
create a second lockfile.

The camera requires `localhost` or HTTPS.

## Accessibility

- `pnpm a11y` starts the app, opens every screen in Chrome (light and dark mode) and runs
  [axe-core](https://github.com/dequelabs/axe-core) with the WCAG 2.2 A/AA and best-practice rules.
  It exits with an error if it finds issues and writes the details to `a11y-report/report.json`.
  Options: `pnpm a11y --only creditos` for a single route, `A11Y_BROWSER=msedge` to use Edge.
- With `pnpm dev`, axe re-checks the page whenever it changes and logs new issues to the
  browser console (`[axe] …`). It is not included in the production build.

axe automatically detects roughly half of all accessibility issues; keyboard and screen-reader
navigation still need to be tested by hand.

## Development tools (optional)

The `.claude/` folder is not tracked: Claude Code tooling is installed locally by each developer.

- **[Impeccable](https://github.com/pbakaus/impeccable)** (design skill for Claude Code):

  ```bash
  pnpm dlx impeccable install --providers=claude --scope=project
  ```

  Restart Claude Code, then run `/impeccable init` once. Its project files (`PRODUCT.md`, `DESIGN.md`
  and the shared parts of `.impeccable/`) are tracked; its runtime files are ignored in `.gitignore`.
- **Dev server for the Claude desktop app's preview pane**: create `.claude/launch.json` with a
  configuration that runs `pnpm dev --port 5173 --strictPort` on port 5173.

## Documentation

- [Analysis and requirements](docs/01-analysis.md)
- [Architecture](docs/02-architecture.md)
- [Roadmap](docs/03-roadmap.md)
- [Content sources and licences](docs/04-sources.md)

## Adding content

Each language is a folder in `content/` with `signs.json` and `units.json`, plus an entry in
`content/languages.json`. Videos and images go in `public/media/<language>/` and are referenced
as `"/media/lse/a.mp4"`.

The LSE content (30 alphabet letters + 538 vocabulary signs) comes from Fundación CNSE's
Banco LSE and can be regenerated with `pnpm import:alphabet` and `pnpm import:vocabulary`.
Files named `*.bancolse.json` are generated: do not edit them by hand. After importing new photos,
run `pnpm hand-focus` to update `hand-focus.json` (where the hands are in each photo, for the
circular hand zoom; photos where MediaPipe finds no hand are shown without zoom).

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
