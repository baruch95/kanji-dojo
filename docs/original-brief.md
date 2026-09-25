# Project: iPad Kanji Writing Trainer

Build a small, polished web application for practising **kanji writing from memory using an Apple Pencil or compatible stylus on an iPad**.

The long-term goal is a personal kanji-writing companion that can eventually integrate with Anki. Version 0.1 should deliberately remain small and focused.

## Core philosophy

The application tests **writing only**.

The user should NOT have to recall the reading or meaning. Those are cues used to prompt recall of the written kanji.

During a normal review, show:

* English meaning
* Japanese reading in kana, similar to displaying furigana
* A large empty writing area

The user must recall and write the kanji.

The application should evaluate:

* stroke order
* approximate stroke shape
* stroke direction
* overall kanji structure/proportions

Do not turn the project into a general Japanese-learning application.

---

# Version 0.1 scope

Version 0.1 should contain approximately **50 beginner kanji**.

The kanji dataset should be stored separately from application logic so that hundreds or thousands of kanji can easily be added later.

For every kanji, store at minimum:

* character
* English meaning
* kana reading(s)
* stroke data/reference
* number of strokes
* SRS state

Prefer a format that can later be mapped to Anki notes/cards.

---

# Target platform

Primary target:

* iPad
* Safari
* Apple Pencil
* compatible active styluses such as MetaPen

Secondary support:

* finger input where reasonable
* desktop browsers for development/testing

iPhone support is NOT a priority for v0.1, but avoid architectural decisions that would make it difficult later.

The app should use browser-native Pointer Events rather than assuming mouse input.

Prevent accidental scrolling/zooming while the user is actively writing inside the writing canvas.

Normal interface controls should continue to work with touch.

---

# Hosting

The application should be deployable as a **fully static site on GitHub Pages**.

Avoid requiring:

* a backend
* a database server
* server-side rendering
* authentication
* paid APIs

Version 0.1 should be usable entirely client-side.

A suitable default stack is:

* TypeScript
* React
* Vite

You may choose equivalent lightweight technologies if there is a compelling technical reason, but document the reasoning.

---

# Offline support

Offline use is desirable.

Implement the application as a PWA if practical.

After the initial installation/load, the user should ideally be able to:

* launch the application
* practise kanji
* access the kanji dataset
* save progress

without an internet connection.

Persist user progress locally.

IndexedDB is preferred for structured persistent application data, though another robust client-side solution can be chosen if justified.

Design the persistence layer so that cloud/Anki synchronisation can be added later without rewriting the rest of the application.

---

# Kanji stroke source

Investigate using **KanjiVG** or another appropriate open kanji stroke dataset.

The app needs ordered vector stroke paths that can be:

* displayed as SVG
* animated individually
* used as the reference geometry for handwriting validation

Respect and document the licence of any external dataset.

Do not tightly couple the entire application to the raw KanjiVG file format. Create an internal kanji representation/adaptor layer.

---

# Main learning model

There are two fundamentally different states:

1. LEARNING
2. REVIEW

A kanji that the user has never successfully learned begins in LEARNING.

A failed REVIEW sends the kanji back through LEARNING.

---

# Learning phase

The learning sequence should progressively remove assistance.

## Learning step 1 — Guided tracing

Display:

* meaning
* kana reading
* the kanji as a faint SVG underlay

Briefly animate the correct stroke order.

The user then writes directly over the SVG.

The purpose is to learn:

* stroke order
* stroke direction
* shape

The reference SVG should remain visible while writing.

---

## Learning step 2 — Visible kanji

Display:

* meaning
* kana reading
* the complete kanji

Do NOT continuously show stroke-order animation.

The user reproduces the kanji.

The kanji may be displayed as a reference, but the writing should occur in the normal writing area.

---

## Learning step 3 — Recall

Display only:

* meaning
* kana reading

Do NOT show the kanji.

The user writes it entirely from memory.

A successful attempt completes the learning sequence and allows the kanji to enter normal SRS review.

A failed attempt should restart or appropriately repeat the learning sequence.

Keep the behaviour deterministic and understandable.

---

# Review mode

During a normal scheduled review display:

* English meaning
* Japanese kana reading
* blank writing canvas

Do NOT display:

* kanji
* stroke-order diagram
* animation
* hint

The user writes the kanji from memory.

If correct:

* mark the review successful
* update the FSRS state

If incorrect:

* mark the review failed in FSRS
* immediately send the kanji back into the learning workflow

Hints belong to LEARNING, not normal REVIEW.

---

# Spaced repetition

Use **FSRS** if reasonably possible.

Do not invent a proprietary SRS algorithm if a stable open-source FSRS implementation suitable for TypeScript/JavaScript exists.

Abstract the scheduler behind an interface so it can later be replaced or connected to Anki.

Store the relevant FSRS data locally.

The architecture should eventually allow:

Anki card/note ↔ local kanji item ↔ FSRS state

but DO NOT implement Anki synchronisation in v0.1.

Document the intended future integration point.

---

# Session design

Sessions are chosen by the user rather than imposed by the application.

The user should be able to start a practice session intentionally.

For v0.1, provide a simple way to choose how many available cards to practise, for example:

* 5
* 10
* 20
* all currently due cards

If there are new kanji available, provide a simple mechanism for choosing whether/how many new kanji to introduce.

Do not create complicated gamification.

---

# Handwriting input

Each pen-down → pen-move → pen-up sequence represents one stroke.

Internally capture a stroke as an ordered list of points.

Where available, it is acceptable to record:

* x
* y
* timestamp
* pressure
* tilt

However, **pressure and tilt must NOT be required for recognition**, because third-party stylus support is important.

Normalize coordinates relative to the writing area so different screen sizes do not affect scoring.

Render strokes smoothly.

---

# Stroke validation

Do NOT attempt general OCR as the primary recognition method.

The app knows which kanji is expected, so compare the user's strokes directly against the known vector strokes.

For every stroke consider at least:

* expected stroke number/order
* starting position
* ending position
* drawing direction
* trajectory/path similarity
* approximate length
* overall position within the kanji
* optionally important hooks/turns where feasible

Normalize both the user's stroke and the reference stroke before comparison.

Reasonable techniques include:

* path resampling
* point-to-path distance
* directional comparison
* shape similarity
* start/end distance

Do not require pixel-perfect tracing.

Natural handwriting must be accepted.

The recognition algorithm should be modular and independently testable.

---

# Accuracy setting

The user should be able to control handwriting strictness.

Expose an understandable setting such as:

**Writing accuracy: 0–100%**

Higher values should require closer geometric similarity.

Lower values should tolerate more variation.

Do NOT imply that this percentage represents a scientifically validated handwriting score. It is simply a user-facing strictness control.

Choose a sensible default and document it.

The threshold should influence shape validation while preserving hard constraints that are pedagogically important, especially grossly incorrect stroke order.

---

# Error behaviour

While writing, validation should provide useful but minimal feedback.

A clearly incorrect stroke should be identifiable.

Avoid overly aggressive rejection for small handwriting differences.

At the end of the kanji, determine whether the attempt is acceptable.

On failure:

1. tell the user the attempt was incorrect
2. visually indicate the problematic stroke(s) if feasible
3. send the kanji back into the learning workflow

Do not penalise the user for irrelevant cosmetic differences.

---

# Canvas controls

Provide at least:

* Undo last stroke
* Clear all

Undo should remove exactly one completed stroke.

Clear All removes the current attempt.

Keep these controls large enough for comfortable iPad touch use.

---

# UI design

Use a minimalist visual style.

Priorities:

* lots of whitespace
* large writing area
* minimal visual distractions
* excellent iPad landscape usability
* clear typography
* subtle animations
* large touch targets

Avoid:

* gamification clutter
* unnecessary dashboards
* gradients/effects merely for decoration
* dense navigation
* excessive settings

The writing canvas should be the visual centre of the application.

A subtle Japanese genkō-yōshi-style square/grid is acceptable if useful.

Support both portrait and landscape where practical, but optimise v0.1 primarily for iPad.

---

# Suggested application screens

Keep navigation minimal.

At minimum:

## Home

Show things such as:

* due reviews
* new kanji available
* Start Session
* Settings

## Session

Show:

* meaning
* kana reading
* writing area
* Undo
* Clear
* progress through session

Learning mode additionally displays the appropriate kanji reference/animation.

## Settings

Initially include:

* handwriting accuracy/strictness
* possibly stylus/finger behaviour
* reset local progress

Avoid adding settings without a concrete use case.

---

# Architecture

Keep the code modular.

Suggested logical modules:

* UI/components
* drawing input
* stroke renderer
* SVG/reference renderer
* stroke matcher
* kanji matcher
* learning state machine
* FSRS scheduler
* session manager
* persistence
* kanji dataset
* settings

The handwriting-matching engine should not depend directly on React components.

The FSRS scheduler should not depend directly on the UI.

Persistence should be behind a small repository/storage abstraction.

This is important for future Anki sync.

---

# Testing

Include meaningful automated tests.

Especially test:

* stroke normalization
* stroke-order checking
* geometric stroke comparison
* strictness thresholds
* learning-state transitions
* review failure → learning transition
* SRS scheduling wrapper
* persistence serialization/deserialization

Where possible, include sample recorded strokes for deterministic matcher tests.

Do not rely only on snapshot tests.

---

# Development workflow

Use Git from the beginning.

Before making large changes:

1. inspect the repository
2. understand the existing structure
3. check current Git status

Work incrementally.

Do NOT destroy or overwrite existing user work.

Do NOT force-reset branches.

Do NOT rewrite Git history.

Do NOT use destructive Git commands unless explicitly requested.

---

# Git commits and GitHub

IMPORTANT:

You may modify files and use Git to inspect diffs/status freely.

**Do NOT create a Git commit without asking the user first.**

When a coherent unit of work is ready:

1. summarise what changed
2. show the important tests/checks performed
3. propose a concise commit message
4. ASK THE USER whether you may commit

Only commit after explicit approval.

Similarly:

**NEVER push to GitHub without explicit user approval.**

If the user approves a commit but does not explicitly approve a push, create the local commit only.

Before pushing, show:

* branch
* commits that will be pushed
* destination remote

and ask for explicit approval.

Never automatically merge a pull request or deploy without permission.

---

# Required repository documentation

Create and maintain these files from the start:

## README.md

Include:

* what the application does
* project goals
* current status
* screenshots later if available
* installation
* local development
* testing
* build process
* GitHub Pages deployment instructions
* architecture overview
* kanji dataset/licensing information
* browser support
* offline/PWA behaviour
* limitations
* future Anki integration concept

Keep the README useful for somebody opening the repository for the first time.

---

## TODO.md

This should be the active project roadmap.

Use checkboxes.

Divide tasks approximately into:

* v0.1 required
* bugs
* improvements
* future versions

Update TODO.md while working rather than leaving it stale.

Do not place completed historical information indefinitely in TODO; completed milestones belong in CHANGELOG.

---

## CHANGELOG.md

Use a conventional changelog structure.

At minimum:

# Changelog

## Unreleased

Track meaningful user-facing or architectural changes during development.

When versions are created, move changes into sections such as:

## 0.1.0

Do not fill it with trivial formatting changes.

---

## AGENTS.md

Create instructions for future coding agents working in this repository.

Include:

* project purpose
* architecture
* key directories
* coding conventions
* testing commands
* build commands
* important product requirements
* FSRS behaviour
* learning/review state machine
* handwriting-validation philosophy
* documentation expectations
* Git rules
* requirement to ask before committing
* requirement to ask separately before pushing

AGENTS.md should allow another coding agent to enter the project later without needing this original prompt.

---

# Versioning

Use semantic versioning.

Initial development can remain under:

0.1.0

until the v0.1 requirements are complete.

Do not bump versions unnecessarily.

---

# GitHub Pages

Configure the project so that it can eventually deploy to GitHub Pages.

Account for the possibility that the app is hosted under:

https://username.github.io/repository-name/

rather than `/`.

Ensure:

* asset URLs work with a repository base path
* PWA/service-worker configuration works with that base path
* client-side routing does not break on refresh

Prefer an architecture that does not require complicated routing.

You may prepare a GitHub Actions Pages deployment workflow, but do not push or enable deployment without user approval.

---

# Out of scope for v0.1

Do NOT implement unless needed for fundamental architecture:

* Anki synchronisation
* user accounts
* cloud sync
* backend APIs
* social features
* leaderboards
* handwriting OCR for arbitrary kanji
* reading quizzes
* vocabulary quizzes
* sentence study
* iPhone-specific UI optimisation
* Android-specific optimisation
* thousands of kanji
* complex statistics
* AI features

Keep v0.1 small and polished.

---

# Future considerations

Design without implementing them.

Likely future features include:

* Anki deck integration
* importing kanji from Anki notes/cards
* synchronising review information
* larger kanji dataset
* iPhone layout
* multiple decks/lists
* custom kanji lists
* statistics
* troublesome-kanji views
* cloud/device sync

Avoid architectural decisions that make these unnecessarily difficult.

---

# Definition of Done for v0.1

Version 0.1 is successful when:

* the app runs correctly in iPad Safari
* it can be hosted as a static GitHub Pages site
* approximately 50 kanji are available
* meaning and kana reading are displayed as recall prompts
* new kanji use the three-stage learning process
* stroke-order animation works during guided learning
* the user can write naturally with Apple Pencil
* strokes are captured separately
* stroke order and approximate geometry are validated
* handwriting strictness is configurable
* Undo works
* Clear All works
* a failed review returns the kanji to learning
* successful reviews are scheduled using FSRS
* progress survives page reloads
* basic offline usage works
* automated tests cover important non-UI logic
* README.md exists and is useful
* TODO.md exists and is current
* CHANGELOG.md exists and is current
* AGENTS.md exists and accurately describes the project
* the codebase is clean enough to extend later

---

# How to work

Start by inspecting the repository and environment.

Then:

1. Create/update README.md, TODO.md, CHANGELOG.md and AGENTS.md.
2. Write a concise technical architecture for v0.1.
3. Break implementation into small milestones in TODO.md.
4. Implement the smallest vertical slice first:

   * one kanji
   * SVG rendering
   * Pencil input
   * individual stroke capture
   * basic stroke comparison
5. Verify that interaction on iPad-style pointer input is sound.
6. Add the learning state machine.
7. Add FSRS/persistence.
8. Expand the dataset to 50 kanji.
9. Add offline/PWA functionality.
10. Polish the iPad interface.
11. Test the production build and GitHub Pages base-path behaviour.
12. Update all documentation.

Prefer a working, comprehensible implementation over premature abstraction.

If a design decision is reversible and low risk, make a sensible choice and document it rather than repeatedly asking questions.

Ask the user when a decision materially changes the product requirements.

Most importantly: **do not commit or push until explicitly authorised by the user.**
