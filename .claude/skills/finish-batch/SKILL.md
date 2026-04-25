---
name: finish-batch
description: Wrap up a Provolone batch — generate the test plan, commit message, and PLAN.md status update. Use when the user says "/finish-batch", "wrap this batch", "ready to commit", or asks for a commit message + test plan together. Does NOT run git commit — the user reviews and commits themselves.
disable-model-invocation: true
allowed-tools: Bash(git status*) Bash(git diff*) Bash(git log*) Read
---

# /finish-batch

Wrap up the current batch by producing three artifacts the user can review and use. Mirrors the "After each batch, summarize what changed and what to test" rule from CLAUDE.md.

## Steps

1. Run `git status` and `git diff` (and `git diff --stat main...HEAD` if there are committed changes on the branch). Stop if nothing has changed.
2. Read `docs/PLAN.md` to identify which batch is "In progress" (or the most recently active one). If PLAN.md is the slim format with sections, focus on the **In progress** section. If it's the legacy long format, find the latest non-Done batch.
3. Run `git log -10 --oneline` to mirror the existing commit-message style.
4. Produce the three artifacts below, in order. Output them as a single response — the user picks which to use.
5. **Do not run `git commit`.** Surface the message and let the user run it themselves (per project memory: don't auto-run external commands).

## Artifacts

### A. Test plan

A bulleted device-test checklist. Cover three things:
- **Golden path** — the main thing the batch enables, end-to-end. 1–3 bullets.
- **Important edge case** — the most-likely-to-break scenario. 1 bullet.
- **Regression check** — one feature near the changed code that should still work unchanged. 1 bullet.

For each bullet, write what to do *and* what should happen. Format:
- "Open Friends → Leaderboard. Expect: ranked list, your name highlighted, no flicker on entry."

If the change is config-only or non-UI (migrations, edge functions, db helpers), replace the device test with a more appropriate verification (SQL query, function logs, test command).

### B. Commit message

Follow the repo's existing style — match the prefix convention seen in `git log` (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).

Format:
```
<type>: <subject under 60 chars>

<1–3 sentences on the why, not the what. The diff shows what.>
```

Conventions:
- Subject lowercase except acronyms.
- No trailing period on subject.
- Body wraps at ~72 chars.
- No `Co-Authored-By` or other footers — those are added by the harness on actual commit if applicable.
- If the change touches Supabase migrations or RLS, mention "ran via mcp__supabase__apply_migration" in the body so it's traceable.

### C. PLAN.md update

Show the diff to apply (don't apply it — surface as a code block). Two cases:

**If PLAN.md is the slim/post-cleanup format:**
- Move the current batch from `## In progress` to a one-line entry in `docs/PLAN.archive.md` with format `- <id>: <one-line summary> (commit <will-be-filled>)`.
- Promote the next item from `## Backlog` into `## In progress` (or `## Next up` if not started yet).

**If PLAN.md is still the legacy format (1500+ lines):**
- Just flip the batch's row in the **Progress** table from `In progress` / `Pending` to `Done`.
- Note: "PLAN.md cleanup is queued as Phase B — until then this just updates the status table."

## Output format

```
## /finish-batch

### Test plan
- ...
- ...

### Commit message
\`\`\`
<type>: <subject>

<body>
\`\`\`

### PLAN.md updates
\`\`\`diff
- <old line>
+ <new line>
\`\`\`
```

After the user commits, the actual short SHA can replace `<will-be-filled>` in the archive entry.
