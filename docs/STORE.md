# App Store listing package (S6)

Everything below is ready to paste into App Store Connect. Live URLs:

- **Privacy Policy URL:** https://badraldhaibani.github.io/progressive-overload/privacy.html
- **Support URL:** https://badraldhaibani.github.io/progressive-overload/

## App Information

| Field | Value |
|-------|-------|
| App Name | Provolone |
| Subtitle (30 chars max) | Progressive Overload Tracker |
| Primary Category | Health & Fitness |
| Secondary Category | (none) |
| Age Rating | 4+ (answer "No" to everything in the questionnaire) |
| Price | Free |
| Copyright | 2026 Badr Al-Dhaibani |
| Privacy Policy URL | https://badraldhaibani.github.io/progressive-overload/privacy.html |
| Support URL | https://badraldhaibani.github.io/progressive-overload/ |

## Promotional Text (170 chars max — editable without review)

> Log sets, reps, and weight. See exactly what you lifted last time — and beat it. Auto rest timer, progress analytics, and an optional friends leaderboard.

## Description

```
Provolone tracks your gym workouts so you always know what to beat next time.

LOG FAST, LIFT MORE
- Log sets, reps, and weight with a keypad built for mid-workout speed
- See your last performance for every exercise while you train
- Auto-starting rest timer with a notification when it's time to lift
- Plate calculator — know exactly what to load on the bar

TRACK YOUR PROGRESS
- Analytics show your strength trend per exercise over the last 30 days
- Complete workout history and per-exercise progression
- Post-workout summary with progression indicators

BUILT FOR YOUR ROUTINE
- Workout templates for your favorite routines
- Full exercise library organized by muscle group
- Create custom exercises and templates

YOURS, OFFLINE
The core is fully offline — your workout data lives on your device and is
never uploaded. No subscriptions, no ads, no account required.

OPTIONAL: LIFT WITH FRIENDS
Sign in to climb a weekly volume leaderboard, chat 1:1 with gym friends, and
get a nudge when they start training. Completely skippable — the app works
without an account.
```

## Keywords (100 chars max)

```
workout,tracker,gym,progressive,overload,strength,lifting,weightlifting,fitness,log,rest,timer
```
(94 chars. Don't repeat "Provolone" or words already in the name/subtitle.)

## Screenshots

**What App Store Connect requires (2026):** one set for the 6.9" slot (iPhone 16/17 Pro Max class, 1320×2868) — it auto-scales down for smaller phones. A 6.5"/6.7" set also satisfies the requirement if that's what your device produces. iPad shots are not needed (`supportsTablet: false`).

**Practical capture path (no Mac):** take them on your physical iPhone from the TestFlight build (volume-up + side button). If your iPhone is a Pro Max model, the raw screenshots upload directly. If it's a 6.1" phone, run the shots through a framing tool that exports at 6.9" canvas (e.g. AppMockUp, screenshots.pro, Figma device frames) — Apple accepts framed/marketing-style images.

**Shot list (in this order — first two matter most):**
1. **Active workout** — a few sets logged, "last performance" hint visible, rest-timer pill counting down. This is the money shot.
2. **Analytics** — trend rows with sparklines showing upward progress.
3. **Home** — Start Workout button + a couple of recent sessions and templates.
4. **Exercise library** — muscle-group filter chips active.
5. **Friends** — leaderboard with a few users (use the demo accounts), or the workout summary if you'd rather not show the social tier first.

Tips: seed realistic data first (a few weeks of workouts), use dark mode for consistency, capture with a full battery icon and no notification-bar clutter, and take each shot on both light/dark only if you have time — one consistent mode is fine.

## App Privacy declaration (Data Collection questionnaire)

Answer **"Yes, we collect data from this app"**, then declare exactly these:

| Category | Data Type | Purpose | Linked to identity? | Used for tracking? |
|---|---|---|---|---|
| Contact Info | Email Address | App Functionality (authentication) | Yes | No |
| Contact Info | Name (username) | App Functionality | Yes | No |
| User Content | Other User Content (chat messages) | App Functionality (1:1 messaging) | Yes | No |
| Identifiers | User ID (account UUID) | App Functionality | Yes | No |
| Identifiers | Device ID (push notification token) | App Functionality (notifications) | Yes | No |

Everything else: **not collected**. "Used to track you?" is **No** across the board — no ad SDKs, no cross-app data matching. Health & Fitness data is NOT collected (workout data never leaves the device; the uploaded weekly volume total is covered under User ID).

Note the push token row: Expo push tokens are device-scoped identifiers stored server-side, so the honest declaration is Identifiers → Device ID. If you'd rather be conservative and skip it, delete `push_tokens` rows at sign-out (already done) — but declaring it is the safer reviewer-proof route.

## Demo account for App Review

Create a dedicated demo account (don't hand reviewers a personal test account):

1. In the app: Friends tab → sign up with email `provolone.review@gmail.com` (or any inbox you control) + a throwaway password; claim username `applereview`.
2. Tell Claude the email — the demo account gets befriended with a seeded account via SQL so the reviewer sees a populated leaderboard and an existing chat thread.
3. Put the credentials in the review notes below.

## Review Notes (paste into "Notes" in App Review Information)

```
Provolone is an offline-first workout tracker. The core experience (Home,
Analytics, Exercises, Start Workout) requires NO account — you can exercise
the full primary flow by tapping "Start Workout" on the Home tab, adding an
exercise, and logging a few sets.

The Friends tab is optional and account-gated. To review it:
  1. Tap the Friends tab.
  2. Sign in with the demo account:
       email:    [demo email]
       password: [demo password]
  3. Leaderboard shows weekly workout volume across the demo account's
     friends. The Chats segment contains an existing 1:1 conversation.
  4. Push notifications (friend workout alerts, chat messages) are optional
     and can be disabled per-account in the settings modal (gear icon).

Account deletion: available in-app at Friends tab → gear icon → Delete
account (guideline 5.1.1(v)).

Sign in with Apple is also offered alongside email/password sign-in
(guideline 4.8 — both are equally capable).
```

## Submission checklist (S7 gate)

- [ ] Privacy policy + support URLs load in incognito
- [ ] All metadata fields filled, no red warnings
- [ ] Screenshots uploaded (6.9" or 6.7" set)
- [ ] App Privacy questionnaire completed per table above
- [ ] Demo account created, seeded, and credentials in review notes
- [ ] Export compliance: uses standard HTTPS only → `ITSAppUsesNonExemptEncryption=false` already in app.json (no prompt at submission)
