---
name: capture-pattern
description: |-
  Append a one-line tactical learning to docs/LEARNINGS.md when something non-obvious has just been discovered. USE WHEN the user says "/capture-pattern", "capture this", "add to learnings", or describes a gotcha worth remembering. ALSO USE PROACTIVELY (without being asked) when, in the current session, one of these has just happened AND the lesson isn't already in LEARNINGS.md or CLAUDE.md: a subtle bug was fixed whose cause isn't obvious from the diff; a platform/library quirk surfaced during implementation (RN, Expo, Supabase, SQLite, iOS, Android, EAS); a workaround was added that a future reader would undo without knowing why it exists; the user explained "the reason we do X is Y" where Y isn't in code. DO NOT use for routine features, refactors, renames, doc edits, anything the code/test names already make clear, or learnings already captured. Bar is high — better to skip than to clutter LEARNINGS.md with obvious notes.
allowed-tools: Read Edit Grep
---

# /capture-pattern

Append a one-line tactical learning to `docs/LEARNINGS.md`. Two invocation modes:

- **Manual** — user typed `/capture-pattern <text>` or asked to capture. Take the text as the entry.
- **Autonomous** — you identified a non-obvious learning during the session. Compose the one-liner from session context.

## When to invoke proactively (autonomous mode)

Trigger only when **all** of these hold:

1. Something was just learned in this session that isn't visible from the resulting code.
2. A future reader (you or a teammate, weeks later) would lose time rediscovering it or would undo a load-bearing workaround.
3. It isn't already in `docs/LEARNINGS.md` or `CLAUDE.md`. **Always grep first.**

Strong triggers:
- A subtle bug fix where the diff doesn't explain the cause (race condition, off-by-one, platform quirk, ordering assumption).
- An RN / Expo / Supabase / SQLite / iOS / Android / EAS quirk discovered during implementation.
- A workaround added with no inline comment explaining why (or where an inline comment would clutter the code).
- The user said something like "we do X because Y" / "we got burned when…" / "Apple/Google rejected this when…" and Y isn't in the code.

Counter-triggers (skip):
- Routine feature work, refactors, renames, doc edits, dep bumps.
- Anything the code, test names, or commit message already makes obvious.
- Generic best-practice advice not tied to a Provolone-specific incident.
- The lesson is already captured (verify with grep before appending).

When in doubt, skip. LEARNINGS.md is high-signal — better empty than noisy.

## Steps

1. **Read** `docs/LEARNINGS.md` to see the current sections and existing entries.
2. **Duplicate check.** Grep `docs/LEARNINGS.md` for the key noun/verb of the new entry. If a near-duplicate exists, surface it and ask whether to update the existing entry instead of appending a new one. Don't append silently over a duplicate.
3. **Pick a section.** Match against existing headings (today: Database, SetRow / inputs, Animations, Navigation, Fonts, Supabase / social, EAS / TestFlight / build). If none fit, create a new `## <Section>` heading at the bottom — don't force an entry into a wrong section. If the user gave the form `<section>: <text>`, use that section explicitly.
4. **Format the bullet** in the existing style:
   - One bullet, one sentence (or two short ones).
   - Lead with a bold phrase: `- **Short rule.** ` followed by the explanation.
   - Reference filenames where applicable: `` See `db/exercises.ts`. ``
   - No file:line numbers — lines drift, filenames are stable.
5. **Append** via `Edit`: add the bullet at the end of the chosen section, before the next `##` heading (or end-of-file).
6. **Confirm.** Surface a 2-line summary: which section, what was appended. No preamble.

## Autonomous-mode guardrail

When you triggered the skill yourself (not from a slash command), do **not** append silently. First show the user the proposed section + entry and wait for one-tap confirmation. Manual-mode invocations skip this — the user already typed the command.

Phrasing for the autonomous prompt:

> I'd like to capture this in `docs/LEARNINGS.md` under **<Section>**:
>
> > - **<Lead>.** <body>
>
> Append? (y/n / edit)

If the user edits, apply their version. If they decline, drop it.

## Output format

After appending (or after the user confirms in autonomous mode):

```
## /capture-pattern

Appended to `docs/LEARNINGS.md` → ## <Section>:
- **<Lead>.** <body>
```

If no append happened (duplicate, declined, etc.), say so in one line and stop.
