# Japanese Flashcards — Project Summary / Handoff Doc

This file exists so work on this project can continue in a different AI
assistant or a fresh session without losing context. It captures the
current state, architecture, decisions made, and — importantly — the
gotchas that cost real debugging time, so they aren't rediscovered.

## What this project is

A single-page, single-file flashcard web app for learning Japanese
hiragana, katakana, and basic numbers. No build step, no framework —
plain HTML/CSS/JS in one file, with Firebase for auth and cross-device
progress sync.

**Live sites:**
- Primary: https://japanese-flash-cards.web.app (Firebase Hosting)
- Mirror: https://sanjaybp02.github.io/japanese_flashcards.io/ (GitHub Pages)
- Dead/neutralized: https://japanese-flashcards-sync.web.app — Firebase's
  *default* hosting site, tied permanently to the project ID. It **cannot
  be deleted** (Firebase blocks this via the API, confirmed with a 400
  error). It now serves a static "this site has moved" placeholder
  instead of the real app.

**Repo:** https://github.com/sanjaybp02/japanese_flashcards.io (owner: sanjaybp02)
**Firebase project:** `japanese-flashcards-sync`

## File structure

```
index.html          <- the entire app: HTML + <style> + <script type="module">
firebase.json        <- Hosting config (target "main" -> site "japanese-flash-cards")
                        + firestore.rules path + no-cache header on *.html
.firebaserc          <- project + hosting target mapping
firestore.rules      <- per-user Firestore security rules
.github/workflows/static.yml  <- auto-deploys to GitHub Pages on push to main
README.md            <- minimal, 2 lines
SECURITY.md          <- still the unedited GitHub template (never filled in)
.gitignore           <- excludes .firebase/ (CLI's local cache folder)
```

**Deploy commands** (from the project root, after `npx firebase-tools login`
once):
```
npx firebase-tools deploy --only hosting:main      # deploys index.html to Firebase
npx firebase-tools deploy --only firestore:rules   # deploys firestore.rules
```
GitHub Pages deploys automatically on every `git push` to `main` via the
GitHub Actions workflow — no manual step needed there.

## Tech stack

- Vanilla JS, ES modules, no bundler/framework
- Firebase Auth — Google Sign-In (`signInWithPopup`, with `signInWithRedirect`
  fallback for mobile — see gotchas below)
- Cloud Firestore — stores each signed-in user's "known" cards at
  `users/{uid}/progress/known`, synced live via `onSnapshot`
- Firebase Hosting + GitHub Pages (same code, two hosts, kept in sync by
  pushing to `main`)
- Web Speech API (`speechSynthesis`) for pronunciation — no audio files,
  no backend

## Features as of now

- **5 decks**, each its own tab and color theme (light + dark variants):
  - Hiragana (46 chars) — red
  - Katakana (46 chars) — blue
  - Both (92, Hiragana+Katakana concatenated) — purple
  - Numbers (12: ichi–kyuu, juu, hyaku, sen = 1–9, 10, 100, 1000) — orange
  - Kanji (42 foundational JLPT N5 chars with readings & meanings) — emerald green
- **Dark mode**: toggle button (top-left), detects system preference on
  first visit, then remembers explicit choice via `localStorage`
  (`kana-theme` key). Inline pre-body script applies it before first paint
  to avoid a flash of the wrong theme.
- **Card flip** (3D CSS transform), tap or swipe to flip/navigate,
  keyboard support (arrows, space)
- **Known-card tracking**, synced to Firestore per signed-in user.
  **Tracked by the actual character string, not array index** — this
  matters, see gotcha #2 below.
- **Shuffle** / **Reset** (with a themed confirm modal, not the native
  `confirm()`)
- **Pronunciation**: speaker icon on the card **back only** (intentional —
  keeps the front a genuine self-test), uses `speechSynthesis` with
  `lang: "ja-JP"`
- **Numbers deck**: Arabic numeral badge in the top-right corner of the
  back face only (not the front)
- **Account UI**: single avatar/initials button top-right; click opens a
  small dropdown with email + Sign out. Signed-out state shows a generic
  person icon in the same slot.
- All icons are hand-written inline SVG (no emoji) — renders identically
  across platforms and can be colored via `currentColor` to match each
  theme; emoji can't be recolored and render inconsistently per OS.

## Firebase / Google Cloud setup that must not be broken

- **Firestore Security Rules** (deployed, this is the important one):
  ```
  match /users/{userId}/progress/{document=**} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
  ```
  Without this, any signed-in user could read/write any other user's data.
- **Google Cloud Console API key** (the Firebase browser key, auto-created)
  has **HTTP referrer restrictions**. It must include the referrer for
  every domain the app is hosted on, **plus** the Firebase `authDomain`
  itself (`japanese-flashcards-sync.firebaseapp.com`) — Google routes the
  Sign-In popup through that domain internally regardless of which actual
  site the user is on, so it needs to be allow-listed too, not just the
  visible hosting domains. Currently allow-listed:
  - `https://japanese-flashcards-sync.firebaseapp.com/*` (required for auth, always)
  - `https://japanese-flash-cards.web.app/*`
  - `https://sanjaybp02.github.io/*`
  - If you add another hosting domain, add it here too or sign-in breaks
    silently with `auth/requests-from-referer... API_KEY_HTTP_REFERRER_BLOCKED`.

## Bugs found and fixed this session (read before touching related code)

1. **Firestore rules were wide open initially** — fixed, see above.
2. **Known-cards were tracked by deck array index, not character.**
   Index meaning changes with shuffle state and script tab, so synced
   progress landed on the wrong card on other devices/sessions. Now
   tracked by `card.c` (the actual kana/kanji string — hiragana and
   katakana never collide, so no key-collision risk). If you add a new
   deck, don't reintroduce index-based tracking.
3. **Mobile tap-to-flip did nothing.** `touchend` and `click` handlers on
   the card both toggled flip; mobile browsers fire a synthetic `click`
   right after `touchend` for a tap, so it flipped then immediately
   flipped back. Fixed with a `touchHandled` flag + `preventDefault()` on
   the handled `touchend`.
4. **`signInWithPopup` alone is unreliable on mobile** (blocked outright,
   or the popup's storage gets partitioned from the opener so the session
   never persists). Added automatic fallback to `signInWithRedirect` +
   `getRedirectResult()` on load.
5. **Checkmark badge wasn't centered.** CSS had `display:flex` to center
   it, but the JS toggling visibility set `style.display = "block"`
   (inline style, always wins over a CSS class) — silently canceled the
   flex centering. Fixed by setting `"flex"` instead of `"block"`.
6. **Sync-status dot got clipped.** It was a child of `.account-btn`,
   which has `overflow:hidden` (needed to clip the avatar photo into a
   circle) — that also clipped the dot since it pokes past the button's
   edge. Fixed by making the dot a sibling in the wrapper, not a child of
   the button.
7. **Numeral badge "mirroring" — a false lead, worth knowing about.**
   When first positioning the numeral badge on the card *back* with
   `right: 16px`, an in-session automated test (via the agent's sandboxed
   browser pane) measured it landing near the left edge, suggesting
   `.card-back`'s `rotateY(180deg)` mirrors absolutely-positioned
   children. That "fix" (swapping to `left: 16px`) was shipped — and was
   **wrong**: the user's real screenshot showed it on the left,
   overlapping the speaker button. Reverted to plain `right: 16px`, which
   is correct. **Root cause of the confusion:** `getBoundingClientRect()`
   (and `getComputedStyle()`) gave unreliable results in the agent's
   browser pane specifically when it wasn't actively displayed/composited
   — this happened repeatedly this session (also affected screenshots,
   which failed outright with "pane is not displayed, so the page is not
   compositing frames"). **Lesson: don't trust automated layout
   measurements of transformed/3D elements from a non-visible headless
   pane — verify against the raw served HTML/CSS (`curl`) for logic
   correctness, and get a real screenshot from the user for actual visual
   confirmation, especially for anything involving CSS transforms.**
8. **Character position shifted on flip.** Front face's bottom content
   (small hint text) and back face's bottom content (bigger romaji pill)
   had different heights, so the flex-centered group's midpoint — and
   therefore the character's position — differed between faces even
   after font-sizes were matched. Fixed with a shared `.sub-content`
   wrapper class with an identical fixed height on both faces, so the
   layout math is guaranteed to match regardless of what's inside.
9. **Romaji pill text wasn't truly vertically centered** — relied on
   default block text-flow (`line-height: normal`), which is subtly
   off-center depending on font metrics; only became visible once the
   pill was shrunk down. Fixed with real flex centering
   (`display:inline-flex; align-items:center; justify-content:center`)
   instead of relying on padding/line-height.

## Design decisions worth preserving

- **Dark theme uses near-black bases with a hue *undertone*** per script
  (not a fully saturated dark gradient) — reads as a premium dark UI
  rather than "murky". Bright *accent* colors (separate from the page
  background) carry the color identity on badges/pills/nav icons, chosen
  to stay legible against the dark card surface.
- **Numbers deck color is orange** — deliberately not green/teal, since
  green is already used throughout the app for "known"/success states.
- **Speaker button and numeral badge are back-face-only**, by design —
  keeps the front a genuine "guess before you peek" prompt.
- **Mark Known button styling was explicitly reverted** to solid green
  (`#2ecc71`) after an attempt to soften it to translucent glass — the
  user wanted the checkmark *badge* centered instead, not this button
  changed. Don't re-attempt a translucent mark-btn.known without being
  asked again.
- Emoji were deliberately replaced with hand-written inline SVGs
  throughout (nav arrows, shuffle, reset, checkmark, lock, moon/sun,
  speaker) for cross-platform rendering consistency and so they can be
  colored via `currentColor`. Kept as-is: the kana tab labels (ひ/カ/両/数
  — they're literally teaching the alphabet, not generic icons) and the
  footer's ❤️ (personal signature).
- Theme toggle button intentionally shows the **destination** theme, not
  the current one (dark button + moon icon while in light mode, bright
  button + sun icon while in dark mode).

## Open / not done

- Repo visibility (public vs. private) — discussed early on, no decision
  made, never changed from public.
- Kanji deck — built (42 foundational JLPT N5 Kanji cards added with readings, meanings, speech audio, and emerald theme).
- Spaced repetition (SRS) — not built.
- PWA/offline support — not built (there's a `manifest.json`/service-worker
  gap; the meta tags for "add to home screen" exist but no actual PWA
  manifest file).
- Custom domain — discussed (would cost money), not pursued; current
  domains are the free `.web.app` and `.github.io` ones.
- `SECURITY.md` is still the unedited GitHub placeholder text.
- `README.md` is still minimal (2 lines).

## Environment notes for whoever continues this

- Firebase CLI is invoked via `npx firebase-tools` (not globally
  installed). Already logged in as `sanjaybp02@gmail.com` on this
  machine's CLI session as of this writing.
- Working directory: `F:\Codex\Japanese flash cards` (Windows).
- Git remote: `https://github.com/sanjaybp02/japanese_flashcards.io.git`,
  branch `main`, pushes trigger the GitHub Pages Action automatically.
