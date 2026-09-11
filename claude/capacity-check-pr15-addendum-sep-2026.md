<!-- PROVENANCE. The PR15 addendum as issued to Claude Code on 11 September 2026,
     committed here verbatim from that copy, per this directory's rule that
     claude/ holds the authoritative version. Nothing in the repository reads
     this file. -->

# PR15 addendum — the Panko claim, and six decisions

**For:** Claude Code
**Date:** 11 September 2026
**Reads with:** `claude/capacity-check-pr15-brief-sep-2026.md`
**Branch:** `pr15-review-pass`. The work was pushed to `pr14-arithmetic-a-reader-can-check`, which is merged and deleted. Mark is moving commit `c76441d` onto a new branch at the same SHA. Continue there; do not push to the old name.

---

## 1. The Panko claim is wrong, and the primary text says the opposite

**Verified against the source, not a summary.** Raymond R. Panko, University of Hawaii, *Spreadsheet Errors: What We Know. What We Think We Can Do*, EuSpRIG 2000, Greenwich, 17–18 July 2000. Openly readable at `arxiv.org/pdf/0802.3457`.

**What we publish:** spreadsheets carry a materially higher error rate than purpose-built systems.

**What Panko concludes:** spreadsheet error rates are comparable to error rates in other human cognitive activities, and arise from fundamental limits on human cognition rather than from sloppiness. He puts spreadsheet cell error rates alongside general cognitive error rates of roughly 2% to 5% and treats them as the same phenomenon.

So the paper does not support a higher error *rate*. It is cited in our report for a claim it contradicts, in the one place in the findings carrying an inline attribution, and in the direction that favours our argument. **That is what §11 exists to catch, and it is in neither column of the register.**

### 1.1 What the source does support

All of the following are in the paper and are checkable:

- **Field audits since 1997**: 54 real organisational spreadsheets audited, errors found in 91%. Across all seven audits in his table, 367 spreadsheets, 24% weighted average — but he notes the older audits used methods unlikely to catch most errors.
- **Laboratory experiments**: 998 subjects, 1,170 spreadsheets, 51% contained errors, despite most being only 25 to 50 cells.
- **Experience does not help**: comparing undergraduates, MBAs with little development experience, and MBAs with 250+ hours, no significant difference in error rates.
- **Testing is the real difference**: about a third of software development effort goes into formal testing, and after several stages of it errors remain in roughly 0.1% to 0.3% of lines of code. Spreadsheet testing is rare. Panko cites Grady and Putnam & Myers for the software figures, so attribute them to him citing others, or leave them out.
- **Developers are confident and wrong**: in one experiment the median self-estimated likelihood of having made an error was 10%; 86% had made one.

### 1.2 What to publish

Rewrite the sentence rather than cutting it. Cutting orphans the `pr-sources` row and removes four published numbers, and the honest version is a better argument for the finding than the one it replaces.

Proposed, for Mark's confirmation:

> Spreadsheet error rates are comparable to those in other complex human tasks, and unlike software, spreadsheets are rarely tested. Field audits since 1997 have found errors in the large majority of those examined, and the people who built them generally believed they were correct.

Two claims, both Panko's, neither an inference about the reader's department, so §0.11 is unaffected.

**Do not write** any of these: that spreadsheets are more error-prone than purpose-built systems, that the medium causes the errors, or that errors feed the reader's decisions unnoticed. The first two are contradicted by the source and the third was correctly cut already.

### 1.3 Three things to settle while the source is open

1. **Which paper are we citing?** `pr-sources` carries the numbers 94, 88, 1998 and 10(2), which points at *What We Know About Spreadsheet Errors*, Journal of End User Computing 10(2), 1998. The paper verified above is the EuSpRIG 2000 one. They are different papers. Report which the sources row describes, confirm its page numbers against the actual citation, and make the inline attribution and the row refer to the same work.
2. **Give the inline form a year.** "(Panko, University of Hawaii)" against Colicev's DOI and CC BY licence is the weakest attribution in a document whose credibility rests on sourcing. A screen reader never sees `pr-sources`, which is print-only.
3. **Add the register row**, now that the source has been read. Record the paper, what it supports, and — importantly — that the previous claim was not supported by it. A register that records only successes teaches nothing.

### 1.4 Re-anchor the source

`check.mjs:3145` anchors the `pr-sources` row to `toolset === 'excel'` rather than to the sentence that cites it. That is weak in the §0.17 sense: a cut to the sentence would leave the row passing while supporting nothing. Anchor the row to the citing sentence.

---

## 2. Decisions, all approved

**2.1 §3.1 — one centred column.** Cap the eyebrow and the figure to `--measure` as well, so the whole card shares a single centred column. An 18px offset between a flush-left heading and an indented body reads as a mistake. Cap unchanged at 660px; no per-block exception.

**2.2 §2.4 — your recommendation.** One sentence on the cost card: *"This range comes from both time bands you picked."* At the figure it explains, rather than lengthening the paragraph that already carries the most prose on the page.

**2.3 Finding 2's `mixed` and `none` branches — your proposed wording approved.** Write both. §0.11 is a rule rather than a copy preference, and leaving two branches non-compliant means the report obeys the rule only for readers who answered a particular way.

**2.4 §1.1 — both labels approved as proposed.** Differentiate the hints too, along the lines you suggested.

**2.5 §1.3 — approved as proposed.**

**2.6 §1.2 — approved as proposed.** Also add the by-function framing to the project-manager count's help text, which is the place the reader meets first and the only place it is missing. The file's own comment at line 1019 already records why it matters.

**2.7 The tense guard — your reasoning is accepted in full.** No guard. The record of why, and the note that PR15 reverses PR11 on one string with the reasoning inside the assertion, is exactly right.

---

## 3. One item from your §7.2 worth acting on

Both figures are correct and you proved it. But your own two observations stand: the ranges run in opposite directions, so scanning them left to right pairs the wrong ends, and neither surface says they are complements.

Add one clause to the checks block naming the relationship, so the reader has a handle:

> The staff you named imply 30.0%–37.5% on run work, the other side of the 15.0–16.8 effective FTE on change above.

Report whether that reads correctly at both ends of the range, since the pairing inverts.

---

## 4. Acceptance additions

- [ ] The Panko sentence states only what the source supports, with the source read and recorded in §11.
- [ ] The inline attribution and the `pr-sources` row name the same paper, with the year in both.
- [ ] The `pr-sources` row is anchored to its citing sentence, not to an answer.
- [ ] The navy cards share one centred column, cap unchanged.
- [ ] Both remaining finding-2 branches are §0.11-compliant.
- [ ] Everything in the PR15 brief's acceptance list still holds.

---

## 5. Report back with

1. Which Panko paper the sources row describes, and whether its numbers are right.
2. The final Panko wording.
3. Whether the §3 clause reads correctly at both ends.
4. Anything that could not be done without moving a number.
