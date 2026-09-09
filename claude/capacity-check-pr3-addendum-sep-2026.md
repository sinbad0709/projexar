# PR3 — Addendum: four changes before merge

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`, branch `pr3-duration-itshare-preview`
**Follows:** your PR #14 description
**Date:** 4 September 2026

PR3 is accepted. Four changes go in before it merges, one of which is substantive and came out of the provenance table — though not in the way the table was designed to work.

Do not merge. Push, report, and stop.

---

## 1. The Flexera comparison — stop publishing the difference

**This is the fifth citation problem in the release, and the provenance table could not have caught it.**

The table asks where a number came from. The Flexera figure answers that perfectly: correctly classified as Cited, correctly attributed, sourced to Figure 17. It is still wrong, because provenance is not commensurability, and nothing in the audit asks the second question.

The sentence, from your §9:

> your reported split — 72% BAU, 28% transformation — compares to a 67%/33% cross-industry average (Flexera 2023 Tech Spend Pulse), running about 5 percentage points more BAU-heavy than the cross-industry average

**One problem is already verified, from your own citation line.** The benchmark is *N=506, organisations above 2,000 employees*. Fixture 8.A is a 1,200-person company, and ProjexaR's ICP runs smaller than that. So the tool tells a mid-market respondent how they compare against an average drawn from a population that excludes them.

**One problem needs verifying, and you are the one who can.** *Tech Spend Pulse* is a spend report. If Figure 17 is a split of IT **spend**, the sentence subtracts a spend split from the respondent's **people-time** split and reports the difference in percentage points. **Read Figure 17 and report what it measures.** The tool already carries a spend-versus-effort caveat somewhere, which suggests this was known once — but a caveat stated elsewhere does not repair a subtraction made inline. That is the same structural fault as a rating contradicted by its own workings.

**The change, and it holds under either answer: publish both figures, publish neither, but do not publish the difference.**

Write to whichever case Figure 17 turns out to be. If it is spend, something in this register:

> You reported 72% of your department's time on run work. Flexera reports a 67%/33% run-versus-grow split across 506 organisations, all above 2,000 employees — but that is a split of IT spend rather than of people's time, and of organisations larger than most of the departments this check is built for. We show it because it is the closest published figure we have, and we do not subtract one from the other.

If Figure 17 turns out to be an effort split, the population mismatch still stands on its own and the difference still goes; adjust the middle clause and keep the rest.

**This subsumes the second copy fix.** Removing the subtraction removes "about 5 percentage points" with it. Do not do both independently.

**Expected diff:** the `5` leaves the number multiset. `72`, `28`, `67`, `33` stay if you keep both figures. Nothing else moves, and no rating changes — this is a fact note, not a rated finding. Assert exactly that.

---

## 2. IT staff as a share of company — present it as context

**Decided.** There is no benchmark, your search settled that, and the metric is not going to acquire one. Present the figure as **context that sets the scale for the rest of the report**, rather than as a measure inviting a comparison that does not exist.

It is already close to this — unrated, in the numbers section and workings, with the note `45 of 1,200 people`. The change is framing rather than placement: word and position it so it reads as describing the department the report is about, not as a score awaiting a benchmark.

**Do not add a line explaining that no benchmark exists.** Mark's words: anything more is overstating its importance. No meta-commentary, no apology, no "we have not found a figure we would stand behind". The figure describes the department; that is all it needs to do.

Keep the contractor exclusion and its statement on the workings page.

---

## 3. One copy deletion

> "against 45 live projects and **around** 75 in a typical year"

Delete `around`. 75 is the respondent's own answer, and "in a typical year" already carries whatever softness the question had — the word double-hedges a figure that is not uncertain to us.

**Leave the third one.** *"7 million support tickets across around 1,000 companies"* is Jitbit's own imprecision, and removing it would state their figure more precisely than they do. Your reasoning was right and it is now a rule in the spec: the test is whose uncertainty it is — ours gets cut, theirs gets quoted.

---

## 4. The eighteen numbers no capture reaches

From your §7: *"177 distinct numbers across ten covering shapes, plus 18 more in the static printed copy that no capture reaches."*

Eighteen published numbers sit outside the suite. Edit one and nothing catches it. The whole release rests on the capture being complete, so this is the gap that matters most in the report.

**Extend the capture to reach the static printed copy** so those eighteen enter the multiset and are asserted like the rest. This is the same gap you found in PR2 for the copy rule, still open for numbers.

If it needs more than a modest change to `capture.mjs`, **do not force it** — report what blocks it and what the eighteen are, and it becomes a recorded gap rather than an invisible one. Either outcome is acceptable; leaving it unremarked is not.

---

## 5. Explicitly not changing

- **The hint span.** The definition is read on first encounter, not mid-error. Not worth a subgrid change.
- **The card copy.** "Free, three minutes, no sign-up" attaches to the check, which is genuinely ungated. Only the PDF asks for an email. It holds.
- **The OG image at 574KB.** Inside every platform limit. Leave it.

---

## 6. Not in this PR — recorded so they are not lost

- **`src/worker.js:225`** still describes the escalation PR1 removed. Fold the one-line fix into the Sender reconciliation, since that file is about to be read closely and the comment would mislead.
- **"Project Online retires 30 September 2026"** is twenty-six days from stale, and there is a migration page built on it. It needs a rewrite in early October, not now.

---

## 7. Verification

- Re-run the full suite. **The only number that may leave the multiset is the `5` from §1.** If anything else moves, stop and report.
- All three fixtures reproduce §3 of the brief exactly.
- The copy-rule check passes, and the scoped conservatism guard still fires inside the divisor block and stays silent elsewhere.
- Update the provenance table entry for the Flexera figure to reflect the new treatment.

---

## 8. Report back with

1. **What Figure 17 actually measures**, read in the report rather than inferred, and the final wording of the replacement sentence.
2. Whether the capture now reaches the static printed copy, or what blocks it and what the eighteen numbers are.
3. Confirmation that no number other than the `5` moved.
4. The updated provenance entry.
