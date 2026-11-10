# 01 · Analysis and requirements

## Vision

**Sign** is an installable web app (PWA) for learning sign languages on your own: see how each
sign is made, practise it with exercises and spaced repetition, and check with the camera
whether your handshape is correct.

Personal project. Priorities: learn properly, iterate quickly and not depend on a server.

## Starting decisions

| Topic | Decision | Reason |
|---|---|---|
| Platform | Web PWA (mobile and desktop) | Single codebase, installable, works offline |
| Languages | Multi-language by design; initial content in **LSE** (Spanish Sign Language) | The author is a Spanish speaker; ASL is set up as the second language |
| Interface language | Spanish (ready for i18n) | |
| Backend | None in v1; everything runs in the browser | Privacy (the camera never leaves the device) and zero cost |
| Recognition | MediaPipe Hand Landmarker in the browser | Free, fast, works offline once the model is downloaded |

## Users

- **Beginner**: knows nothing yet; wants to start with the manual alphabet (fingerspelling) and basic vocabulary.
- **Reviewer**: already knows some signs and wants to keep them fresh (spaced repetition).
- **Content author** (the user themself): adds signs and their own videos by editing JSON files.

## Functional requirements (v1)

### FR1 · Languages
- FR1.1 Choose the active sign language (LSE, ASL…). Progress is tracked separately per language.
- FR1.2 Adding a new language = adding a content folder, without touching code.

### FR2 · Lessons and dictionary
- FR2.1 Lessons grouped into units (Alphabet, Greetings, Family, Numbers…).
- FR2.2 Each sign has: gloss, a description of how it is made (handshape, orientation,
  location, movement, non-manual features), a video or image, and a category.
- FR2.3 Play the video on loop and at reduced speed (0.5×).
- FR2.4 Dictionary with word search and category filter.

### FR3 · Exercises and review
- FR3.1 "Which sign is this?" quiz: the video is shown and you choose between 4 words.
- FR3.2 Reverse quiz: the word is shown and you choose between 4 videos.
- FR3.3 Spaced repetition (SM-2 algorithm) with a daily review queue.
- FR3.4 When a lesson is finished, its signs enter the review queue.

### FR4 · Camera practice
- FR4.1 Turn on the camera and see the detected hands overlaid (21 points per hand).
- FR4.2 For static signs (manual alphabet letters, numbers), indicate whether the handshape
  matches the reference, with a score from 0 to 100.
- FR4.3 **Calibration** mode: record your own reference samples for a sign.
  Needed because there are no reliable public templates for every language.
- FR4.4 No video is stored or sent anywhere: only coordinates are processed, in memory.

### FR5 · Progress
- FR5.1 Store completed lessons, the review state of each sign and camera templates
  in the browser (IndexedDB).
- FR5.2 Export and import progress as a JSON file (backup).

## Non-functional requirements

- **Offline**: after the first visit, the app and downloaded content work without a connection.
- **Performance**: hand detection ≥ 20 fps on an average laptop and ≥ 10 fps on an average phone.
- **Accessibility**: keyboard navigable, AA contrast, captions/text for every video.
  Deaf users are a natural part of the audience, even for a personal project.
- **Privacy**: no analytics and no accounts in v1.
- **Maintainability**: strict TypeScript, unit tests for the logic (SRS, classifier).

## Out of scope for v1

- Recognition of **dynamic** signs (with movement) and facial expressions → v2.
- User accounts and sync between devices → v3.
- Translating full sentences: it is an open research problem, not a goal.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Material licences.** Spread the Sign and Sématos are copyrighted; Fundación CNSE's Banco LSE and DILSE are CC BY-NC-SA 3.0 | High | Only use openly licensed material with attribution, or our own material; everything else is only linked. Details in [04-sources.md](04-sources.md) |
| Camera recognition gives false positives or negatives | Medium | Limit it to static handshapes, use templates calibrated by the user, and present it as a helper rather than ground truth |
| Regional variants within the same language | Medium | `variant` field on each sign, shown as a visible note |
| The app teaches a sign incorrectly | Medium | Every sign cites its source; review by a signer whenever possible |

## v1 acceptance criteria

1. The "LSE manual alphabet" unit can be completed by viewing each letter.
2. A 10-question quiz can be taken, and missed signs come back sooner in review.
3. With the camera, after calibrating the letter "A", the app tells it apart from "B" under normal lighting.
4. After reloading the page offline, progress is still there.
