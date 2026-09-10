# PR8 — The forwardable report

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`
**Follows:** PR7, merged
**Target file:** the Capacity Check HTML, `#printReport` and its stylesheet, plus `tools/capacity-check/`
**Date:** 9 September 2026
**Reads with:** `claude/capacity-check-change-spec-sep-2026.md`, `claude/capacity-check-pr7-brief-sep-2026.md` §7, `claude/capacity-check-pr7-addendum-sep-2026.md`

PR7 shipped everything in its brief except the print report itself. This is that work. Five items: the restructure, the ask-agnostic rule, the two remaining copy cuts, the epigram reduction, and an audit of a guard class that has now hidden the same defect twice.

**The numeric invariant is absolute this time.** No figure changes, on any shape. This is a restructure and a set of cuts. If a number moves, something has been rebuilt that should have been moved.

**Do not merge.** Push, report, and stop.

---

## 0. Standing constraints

Master §0 applies, including the three additions PR7 made at §0.11, §0.12 and §0.13. One further addition, from the audit's §5.5 and confirmed:

14. **The print report is ask-agnostic.** The sender's reason for forwarding it varies — awareness, a resourcing case, sign-off, or putting a known risk on the record — and a document that presumes one is wrong for the other three. No ask appears in the report body. ProjexaR appears once, on the final page, stating what it does and what it costs. The ask belongs in the covering note, which is PR9.

---

## 1. Before you write anything

Three gates. Report all three before changing anything.

**1.1 The current structure.** Report `#printReport`'s sections in document order, with line numbers, running header text, and which `@media print` rules force a break. This is the thing being rebuilt and nothing in the specification describes its present shape.

**1.2 The name field.** The cover needs the respondent's name. Report: does the email gate collect one, is it required or optional, does it reach the render, and what does the render receive if it is blank. If a name can be absent, §2.1 needs its fallback and a shape.

**1.3 The slice helpers.** Enumerate every assertion helper that operates on a slice of the file rather than the whole of it — `has(report, …)` and any sibling. Report how many assertions use each, and which of the two reports each helper can see. Do not fix anything yet. §5 is the fix.

---

## 2. The print report

Seven sections, in this order. Nothing else is added and nothing is dropped.

### 2.1 Cover

Title, the date, and one line:

> Prepared from estimates provided by [name], [date]. A directional check, not an audit.

Nothing else. No figures, no rating, no ProjexaR claim.

The attribution is doing real work and is the reason the line reads this way: it puts the estimates on the sender rather than on us, which is what makes the document safe for them to forward. **Do not invent an organisation name.** An email domain is not a company name and the tool does not collect one.

If §1.2 finds the name can be blank, the line drops to *"Prepared from estimates provided on [date]. A directional check, not an audit."* Add a shape for each branch.

### 2.2 Provenance, page one

Currently at the back. It moves to the front because the receiving reader's first thought is where the numbers came from, and answering it before they ask is stronger than letting them assume a vendor invented them.

Content: where each figure comes from, in one short passage, attributed to the respondent's own answers. Then one statement of the range posture, which belongs here rather than in the findings:

> Every figure drawn from a banded answer is shown as a range and rated on the less favourable end. Where we could have picked a single flattering number, we did not.

Both sentences are checkable in the suite. Run the pair through the §5 copy check. If the first is already near-verbatim on this page, ship the second alone, as you did in PR7.

### 2.3 Executive summary, one page

Readable standing up in sixty seconds. **Three figures, and these three, in this order:**

1. Full portfolio cost
2. The growth-ceiling gap
3. The internal staff cost carried inside the staff budget

Money first. No capacity ratios on this page — they are the mechanism, and the mechanism is section 2.4's job.

A range is one figure. All three carry their ranges.

**Every figure is computed. None is written as a constant.** Add a shape asserting that different inputs produce a different summary, and a shape asserting each of the three appears here and agrees with its appearance in the findings.

### 2.4 The findings

Unchanged in substance. The bands statement and the Colicev citation appear inline, at the point the threshold is used, not in an appendix. PR7 single-sourced the statement through `bandsStatement()`, so this is a placement change with no text change. Assert the §2.11 prefix assertion still passes after the move.

### 2.5 The four steps

Unchanged. `index.html:1296–1311`. This is the strongest section in the document and the reason it is forwardable at all.

### 2.6 Workings and sources

The full table, every figure, every source. Unchanged in content.

### 2.7 ProjexaR, one page, last

What it does, and what it costs at this organisation's resource count — contractor-inclusive, per PR7's §4.1. One page. It appears here and nowhere else in the report.

No trial CTA, no urgency line, no delegated-authority framing. PR7 §8.2 rejected that and it stays rejected.

### 2.8 Print mechanics

- Five `.p-head` elements exist today and the separator fix from PR7 must survive the restructure. Assert that extracted text from the rendered PDF contains no run-together heading, on the new structure.
- **Render to PDF and rasterise it.** Report the page count and confirm no blank or near-blank page. Seven forced sections is the classic way to produce one.
- Report the page each section starts on, for all fixture shapes you render.

---

## 3. The two remaining copy cuts

PR7 made the input-restatement cut. Two left, both named by the audit, both repetition rather than qualification.

**3.1 The AT RISK "no single current view" block.** The audit measured it at roughly 150 words carrying five sequential claims in one paragraph. PR7's §0.11 inference rule has already been applied to it, so it may be shorter now. **Report its current word count before cutting.** Target: three points, not five sentences.

**3.2 The ticket composition block.** Roughly 120 words to say that ticket volume explains only part of the run FTE, so either logging is incomplete or the run work is not ticket-shaped. One sentence.

**No global word target.** PR7's §6.4 ruling holds: cut repetition, not qualification. No caveat placed inline by PR6 §3 moves without re-applying the PR6 §3 test and reporting the result. Report word counts before and after, and anything you wanted to cut and did not.

---

## 4. Epigrams

The closing-aphorism pattern runs to five or six across one reader's path and becomes audible. **Cut two. Never cut one that carries a limitation.**

Protected, both of which do argument rather than decoration:

- "The internal figure is a floor, not a total."
- "That is a question of which ledger it lands in."

Report which two you cut and why those two.

---

## 5. The slice audit — the guard class

This is the item with the longest tail.

PR7 found that the assertion meant to catch the stale section name read `has(report, …)`, where `report` is the web slice. It asserted the old name was gone from the half of the file PR5 edited and was structurally blind to the half PR5 missed. The same shape hid the run-together headers and, arguably, the divergence between the specification and the page.

**A guard scoped to the half of the file the change touched cannot catch a change that failed to touch the other half.**

From §1.3's enumeration:

1. For every assertion using a slice helper, decide whether the claim it makes is about that slice or about the file. Most are about the file.
2. Where the claim is about the file, re-scope it to the whole file, or assert against both slices explicitly. Not one and a comment.
3. **Fail each re-scoped assertion deliberately before trusting it**, as you did with the orphan check and the run-together detector in PR7. Report which ones caught themselves being weak.
4. Report the count: assertions audited, assertions re-scoped, assertions left slice-scoped with the reason.

If this turns out to be large, report the size and stop rather than doing it partially. A half-audited guard class is worse than an un-audited one, because the report will say it was done.

---

## 6. One rename, to confirm

"What you told us" names a verdict, not a set of figures, and it appears twice — web `:1089` and print `:1160`. PR7 left it out of the heading collapse because renaming a verdict is a copy decision rather than an information-architecture one.

Proposed: **"Where you stand"**. Plain, says what the section is, and does not collide with "Your numbers".

Implement it unless Mark says otherwise. Report it separately in the acceptance list so it is easy to revert on its own.

---

## 7. Fixtures and shapes

No fixture value changes. Every figure in 8.A to 8.G reproduces exactly.

New shapes:

- Cover renders with a name; cover renders without one, if §1.2 says that is reachable.
- Executive summary carries exactly three figures, all computed, all agreeing with the findings.
- Different inputs produce a different executive summary.
- Section order matches §2, asserted by position, not by presence.
- Extracted PDF text contains no run-together heading.
- The bands statement renders inside the findings and the §2.11 prefix assertion passes.
- ProjexaR is named on the final page and on no other page of the print report.
- The epigrams protected in §4 are still present.

---

## 8. Acceptance criteria

- [ ] All three §1 gates answered before any change.
- [ ] Zero numeric change, every shape, asserted rather than assumed.
- [ ] The print report follows §2's order, with a rendered and rasterised PDF, page count reported, no blank pages.
- [ ] The cover attributes the estimates to the respondent and invents no organisation name.
- [ ] The executive summary carries three figures, computed, money first, no capacity ratios.
- [ ] ProjexaR appears once, last, with no ask.
- [ ] The two §3 cuts made, word counts reported, no PR6 §3 caveat moved without the test.
- [ ] Two epigrams cut, neither carrying a limitation.
- [ ] The §5 audit complete or its size reported and stopped.
- [ ] No em-dashes in output. Every en-dash in a number range survives.
- [ ] The copy-rule check passes. §0.11 to §0.14 hold on a deliberate read.
- [ ] Every PR1 to PR7 assertion still passes.

---

## 9. Report back with

1. The three §1 gate answers, first and separately.
2. The rendered page count and the page each section starts on.
3. Word counts before and after §3, and anything you wanted to cut and did not.
4. Which two epigrams you cut.
5. The §5 audit counts, and which re-scoped assertions caught themselves being weak.
6. Anything in this brief that could not be done without moving a number.

---

## 10. Not in this PR

Recorded so nobody reaches for them.

- **The covering note and the result link in the email.** They live in `src/worker.js`. PR9, together with the Sender reconciliation and Turnstile on `/api/capacity-report`.
- **The three-note selector and the purpose question.** PR9 at the earliest, and the purpose question only after the Sender audit.
- **The project manager time-share input.** PR10. It moves every number and needs the fixtures re-derived, which is why it comes after the layout work rather than before it.
- **The Sender field audit.** After PR10, against the final payload, so it is not done twice.
