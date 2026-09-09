# Capacity Check — handover into the audit-response session

**Written:** 9 September 2026, closing the session that ran PR1 to PR6.
**For:** whoever picks up the independent auditor's report.

Read this first, then the specification. Everything else in the project is reference.

---

## 1. What the thing is

A free, no-sign-up diagnostic at projexar.com/capacity-check. Fifteen questions about an IT department, returning rated tiles, four findings, two checks on the respondent's own answers, a numbers section, a conversion panel, and a print/PDF report carrying the workings. Top of funnel: move an IT director from interest to starting a trial.

Built as a single self-contained HTML file. No dependencies, no build step. Claude Code works in `~/Desktop/ProjexaR/projexar` and pushes to `sinbad0709/projexar`. Cloudflare deploys from `main`. **Mark takes every merge; CC opens the PR and stops.**

---

## 2. Where the state lives

**`claude/capacity-check-change-spec-sep-2026.md` is the master document.** Read it in full before doing anything. Three parts matter most:

- **§0** — the standing constraints. No competitor citations, an approved source list, no ROI or payback framing, no claim the tool tracks actual hours, hedging in inputs only, ranges never collapsed to a midpoint.
- **§10** — decisions taken so they are not reopened. Treat these as closed unless the auditor gives a new reason.
- **§11** — the verification register. What has been checked against a named source and on what date, and what has not. Nothing in the unverified column may be published or acted on without checking first.

The six PR briefs are in the project in order. Read one only when you need the reasoning behind a specific change.

---

## 3. What shipped

PR1 through PR6, 4 to 5 September. PR1 to PR5 are merged and verified on the live page. **Confirm PR6's merge state before starting** — it was pushed with three final changes and may or may not have been merged since.

In summary: new PM bands with the toolset escalation removed; signed headroom rendered as prose; a banded time input with every derived figure carried as a range; contractors; the full-cost hero tile gated to sterling; four findings each capable of returning Healthy, plus a separate checks block; the ticket divisor and its citations rebuilt; a link preview; a render suite of 603 shapes with an independent oracle; and a full copy rewrite.

---

## 4. The four things still open on the report

1. **The workings are print-only and gated.** `pr-derivations` and the whole caveat layer sit inside `#printReport`, which is `display:none` except in `@media print`, reachable only through the email gate. A reader on screen never sees them.
2. **The bands statement is in that block.** So the sourcing for the ratings — the 5.16 turning point, the confidence interval, the admission that applying a study of project workers to PM caseload is our step — is behind the gate. This is the one worth deciding. It is not a caveat on a figure, it is the justification for a rating, and the caveat test in the PR6 brief does not cover that category.
3. **A pointer sentence with nowhere to point.** The ticket check says "Two things qualify the comparison, and the workings page sets both out." The reader has no workings page. Depends on the decision in 2.
4. **A citation gloss that goes stale on 30 September.** The Sources row reads "Microsoft product notices: Project Online retires 30 September 2026". Twenty-one days. The fix is tenseless: "Project Online retirement, 30 September 2026". The finding body was already corrected; only the Sources row is left.

**Have this ready but do not raise it:** if the auditor flags the IT-staff-share percentage as a number with no comparison, that is deliberate. No benchmark exists — Claude Code searched the current file, all 36 commits, the whole repo, the August standalone and the research deck. It is presented as context that sets the scale, and Mark's instruction was that anything more overstates its importance. It is the most examined item in the release.

---

## 5. Running in parallel, not in the report

- **The Sender reconciliation.** Overdue. Claude Code produced an authoritative payload manifest in PR3 read from `src/worker.js`. Two fields carry one endpoint of a range rather than a single figure; `headroom` is signed and must never be a segment filter. The Red/Amber/Green nurture split was calibrated on the old 8–12 bands and needs re-examining now they have moved.
- **`src/worker.js:225`** still describes the toolset escalation PR1 removed. Fold into that pass.
- **projexar.com/start still promises "two projects free forever"** while the Capacity Check now says "Unlimited 14-day trial". PR5 changed the check deliberately as the starting point. A prospect clicking through meets a contradiction. Launch blocker, and outside the check's file.

---

## 6. How this work ran, and why

Five habits did the real work. Keep them.

**Verify against the primary source, never a summary.** Every substantive error in this release came from someone reasoning from a second-hand account. Where two readings of the same source disagree, that is a conflict to resolve in the primary text, not a correction to accept.

**Fixtures must exercise both sides of every conditional.** Three defects shipped invisibly because the fixture set was neutral where they lived — contractors at zero, every fixture in sterling, corroboration always landing Healthy. Enumerate the branches before writing fixtures, not after.

**State the numeric invariant before the change, then measure rather than predict.** "Zero numeric change" for a layout or copy pass is a strong, cheap check. Predicting which numbers will move is not — it was wrong three times running, always because the implementation has more surface than the specification.

**An assertion nobody has watched fail is not known to work.** Mutation testing found a real defect in PR5 that nothing else would have.

**Stop and ask beats deciding.** Every brief carried explicit stop conditions and they were used four times, each time correctly.

---

## 7. The failure modes this release actually found

Not hypothetical. These happened, here, repeatedly.

**Five citations were examined and all five were defective.** An uncited 8–12 convention. A characterisation of Jitbit's population that its source does not support. A 480 figure attributed to Jitbit that Jitbit never published, being a day-to-month conversion presented as sourced. An ASHE table reference pointing at a table that does not carry the grouping it named. A benchmark asserted to exist that never existed. Assume the sixth is out there.

**Provenance is not commensurability.** A number can be correctly sourced, correctly attributed, and still be compared to something it does not measure. The provenance table cannot see this by construction. The separate question is: do these two figures measure the same thing, on a population that includes this reader?

**The confident register is the tell.** The two costliest errors were an unverified fact and an unverified absence, both written in the same tone as things that had been checked, and one of them marked as settled to stop anyone reopening it. An asserted absence needs the same evidence as an asserted presence, and the search that produced it must be named.

**Errors were made by every party.** By me, by the first independent reviewer, by Claude Code. The thing that caught them every time was somebody re-running the code or re-opening the source — never somebody writing more carefully.

---

## 8. What not to do

Do not reopen anything in §10 of the specification without a reason from the auditor. Do not re-derive the fixtures; they are verified and the numbers are load-bearing. Do not reword anything in the PR6 brief's §6 protected list, above all the bands statement, which has been rewritten three times and checked against the paper twice.
