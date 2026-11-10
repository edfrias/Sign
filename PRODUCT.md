# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **The author**: a hearing Spanish speaker learning Spanish Sign Language (LSE) from scratch, using
  Sign as their own study tool.
- **Other beginners**: anyone starting LSE on their own (family, friends, colleagues, the general
  public). They arrive with no prior knowledge, no teacher at hand and no account.

Their job: learn to recognise and produce signs (starting with the manual alphabet and everyday
vocabulary), keep them from fading, and check that their own handshape is right.

## Product Purpose

Sign is an installable web app (PWA) for learning sign languages on your own: see how each sign is
made, practise it with quizzes and spaced repetition, and check your handshape with the camera.
It currently teaches LSE; the content model supports more languages (an ASL sample exists).

Success means a beginner can work through the alphabet and everyday vocabulary, keeps coming back
to review, and can confirm with the camera that they are fingerspelling correctly.

## Positioning

Three things together, which a generic dictionary or flashcard app does not combine:

1. **Hands-free camera practice**: the app recognises static handshapes in the browser and
   validates them automatically — hold the sign for a second and it moves on. No keyboard or mouse
   while signing, and no calibration needed (built-in references come from the official photos).
2. **Trustworthy content**: every sign comes from Fundación CNSE's Banco de imágenes y signos LSE,
   with full attribution. The app never invents a sign.
3. **Consistency**: short lessons plus SM-2 spaced repetition, so what you learn is not forgotten.

## Operating Context

- **Laptop with webcam** at a desk, about 1 m from the screen, both hands free for signing. This is
  where camera practice happens; text and feedback must be readable from that distance, and audio
  beeps confirm results without looking.
- **Phone**, in short sessions: lessons, quizzes and review, usually in portrait.
- **Tablet** resting on a table, as an intermediate screen for lessons and practice.
- Used alone, without a teacher; often offline once installed.

## Capabilities and Constraints

**Capabilities (shipped)**
- 568 LSE signs: the 30-letter manual alphabet (including CH, LL, Ñ, RR) and 538 vocabulary signs in
  11 units / 86 lessons, each with the Fundación CNSE photo.
- Lessons, dictionary (search + category filter), multiple-choice quiz, SM-2 daily review.
- Camera practice for the 18 static letters: hands-free validation, automatic advance and skip,
  guided calibration with the user's own hand, adjustable tolerance.
- Credits page, attribution under every image, accessibility audit (`pnpm a11y`).

**Constraints**
- Content is CC BY-NC-SA 3.0 (Fundación CNSE): attribution on every image, **no commercial use**,
  derived content under the same licence.
- No backend, no accounts, no analytics: everything runs in the browser; the camera image never
  leaves the device; progress lives in IndexedDB.
- Must work offline as an installed PWA; installation stays light (~1.2 MB precache).
- Camera recognition only handles **static** handshapes. All vocabulary signs and 12 letters have
  movement and are learnt from photos only.
- Interface language: Spanish.

**Terminology**: *signo* (sign), *glosa* (the word a sign stands for), *estático / dinámico* (without /
with movement), *dactilología* (fingerspelling), *unidad / lección*, *repaso* (spaced review),
*calibración*, *tolerancia*.

**Undecided**
- Camera tolerance has only been tested with a virtual camera, not with real webcams and hands.
- Whether to add videos (DILSE) for signs with movement.
- Whether ASL (currently 3 unverified letters) becomes a real second language.

## Brand Commitments

- Name: **Sign**. Existing app icon: `public/icon.svg`.
- Attribution to Fundación CNSE is binding: image captions, footer and the Credits page must stay.
  Sign must not imply affiliation with or endorsement by Fundación CNSE.

## Evidence on Hand

- Official photos for all 568 signs (`public/media/lse/`), from Fundación CNSE, CC BY-NC-SA 3.0.
- Text descriptions exist only for most alphabet letters, written from those photos; vocabulary
  signs have none (the photo is the reference).
- No videos, no users yet, no testimonials, reviews, statistics or partnerships. Do not fabricate any.

## Product Principles

1. **Hands stay free.** Anything that happens while signing must work without touching the device,
   and be readable and audible from about a metre away.
2. **Never teach a wrong sign.** Only content from reliable sources, always attributed; when unsure,
   show the source instead of inventing a description.
3. **Little and often.** Favour short lessons and daily review over long sessions.
4. **Honest feedback.** The camera is a helper, not a judge: say what it looks like and how close it
   is, and never present a guess as certainty.
5. **One app, three screens.** Laptop for camera practice, phone and tablet for learning and review;
   each must feel complete, not like a shrunken desktop.

## Accessibility & Inclusion

- WCAG 2.2 AA, enforced with axe (`pnpm a11y`) on every screen in light and dark mode.
- Fully keyboard operable outside camera practice; camera practice itself must need no input at all
  after starting.
- Sign-language learners may include Deaf and hard-of-hearing people: audio cues (beeps) are always
  paired with a visual signal.
