# 03 · Roadmap

## Phase 0 · Foundations ✅
- [x] Repository, documentation, Vite + React + TS + PWA skeleton.
- [x] Content model and per-language loading (LSE, plus a sample of ASL).

## Phase 1 · Learn
- [x] Unit list and step-by-step lesson view.
- [x] Dictionary with accent-insensitive search and category filter.
- [x] Video player with loop and 0.5× (ready; content still missing).
- [x] Full LSE manual alphabet (30 letters, 5 lessons) with photos from Fundación CNSE's Banco LSE.
- [ ] Descriptions for F, K, S, T, H and Y (only the photo for now).
- [ ] Greetings: replace the unverified descriptions with Banco LSE material ("Saludos y cortesía" section).
- [ ] DILSE videos for the letters with movement (convert `.mov` → MP4/WebM).

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
- [ ] Test with a real camera and tune `TOLERANCE` (`src/vision/classifier.ts`). So far only tested
      with a virtual camera that streams the reference photos.

## Phase 4 · Polish
- [ ] Export/import progress.
- [x] Automated accessibility audit with axe (`pnpm a11y`): 10 screens × light/dark, no issues.
- [ ] Manual testing with keyboard and screen reader (NVDA / VoiceOver).
- [ ] Run `pnpm a11y` in CI (GitHub Actions).
- [ ] 192/512 PNG icons for installation on iOS.
- [ ] Upgrade Vite to the current major version (`pnpm audit` warnings in dev dependencies).

## v2 and beyond
- Dynamic signs (sequences + DTW).
- Facial expressions (MediaPipe Face Landmarker).
- Optional sync between devices.
