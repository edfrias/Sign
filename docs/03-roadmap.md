# 03 · Roadmap

## Phase 0 · Foundations ✅
- [x] Repository, documentation, Vite + React + TS + PWA skeleton.
- [x] Content model and per-language loading (LSE, plus a sample of ASL).

## Phase 1 · Learn
- [x] Unit list and step-by-step lesson view.
- [x] Dictionary with accent-insensitive search and category filter.
- [x] Video player with loop and 0.5× (ready; content still missing).
- [x] Full LSE manual alphabet (30 letters, 5 lessons) with photos from Fundación CNSE's Banco LSE.
- [x] Full Banco LSE vocabulary: 538 signs in 11 units (81 lessons), replacing the unverified greetings.
- [ ] Descriptions for F, K, S, T, H and Y (only the photo for now). They differ in which finger
      touches the thumb, which the photos do not show reliably: needs a check by an LSE signer.
- [ ] DILSE videos for the letters with movement (convert `.mov` → MP4/WebM). **Blocked on
      permission**: DILSE's footer says CC BY-NC-SA 3.0 but its legal notice only allows personal,
      private use and forbids distribution and transformation. Ask Fundación CNSE first
      (see [04-sources.md](04-sources.md)).

## Phase 2 · Practise
- [x] SM-2 algorithm with tests.
- [x] Multiple-choice quiz that feeds the review queue.
- [x] Review of due signs, with a counter on the home screen.
- [ ] Reverse quiz (word → video); makes sense once there are videos.

## Phase 3 · Camera
- [x] Hand detection with MediaPipe and landmark drawing.
- [x] Normalised features + nearest-neighbour classifier, with tests.
- [x] Calibration: save and delete your own templates.
- [x] Built-in references from the photos: practise without calibrating.
- [x] Hands-free practice and calibration (automatic validation, advance and skip; beeps).
- [x] Practice redesign: honest feedback band, full-screen focus mode readable at 1 m, setup tips,
      edge cases (nobody in front, tab switches, disconnected camera, wrong calibrations), one primary
      action, phone/tablet layouts and screen-reader announcements only on events.
- [ ] Test with a real camera and tune `TOLERANCE` (`src/vision/classifier.ts`). So far only tested
      with a virtual camera that streams the reference photos.

## Phase 4 · Polish
- [x] Export/import progress (merges instead of replacing).
- [x] Automated accessibility audit with axe (`pnpm a11y`): 10 screens × light/dark, no issues.
- [ ] Manual testing with keyboard and screen reader (NVDA / VoiceOver).
- [ ] Run `pnpm a11y` in CI (GitHub Actions).
- [x] 192/512 PNG icons, maskable icon and `apple-touch-icon` (`pnpm icons` regenerates them).
- [x] Upgrade to Vite 8, Vitest 5, vite-plugin-pwa 2 and React Router 7 (`pnpm audit`: from 23
      warnings to 3, all in Workbox's build-time dependencies).
- [ ] Upgrade React 18 → 19, TypeScript 5.6 → 7 and MediaPipe 0.10 → 1.x (major versions with
      breaking changes; MediaPipe needs a real-camera check).

## v2 and beyond
- Dynamic signs (sequences + DTW).
- Facial expressions (MediaPipe Face Landmarker).
- Optional sync between devices.
