# PR7 addendum — the two rulings, and four verdicts revised

**For:** Claude Code
**Date:** 9 September 2026
**Reads with:** `claude/capacity-check-pr7-brief-sep-2026.md` revision 2
**Status:** the PR is cleared to run. Nothing below reopens a §2 gate that CC has already answered.

CC answered all seven gates and stopped correctly on both stop conditions. Two of the three §2.1 stop conditions resolve in the tool's favour, one found a real defect, and §2.1c came back decisive. This addendum rules on the two open decisions, corrects one thing CC got wrong, reconciles the §2.7 figures CC could not, and revises four verdicts in the brief's §5 error table.

---

## 1. Ruling on §2.1b — the register clears, and it was stale, not breached

**The sentence stays. The register entry is updated.**

The brief's stop condition was written on the premise that an unverified claim had reached publication. The opposite happened. Commit 80a8cc2 verified Table S10 against the manuscript and used it to **replace a false assertion** — the page previously claimed the paper does not test whether the curve differs for managers, which Table S10 contradicts. A verified claim displaced a false one, and nobody updated the register.

The coefficients support the reading. MPW 37.220 (9.636) and MPW² −3.625 (.710) are the terms that produce the curve. The two interaction terms, −5.786 (12.818) and −.010 (1.225), are each smaller than their own standard errors. "The paper tests it and finds it does not change the benefit" is what those numbers say.

**Removing the sentence would be the worse outcome by a distance.** It reinstates a false absence, and it does so in the one paragraph a sceptical reader is most likely to check against a paper that is one open-access download away.

Three conditions attach.

**1.1 Update the register in this PR.** Move Table S10 to the verified column, naming the commit, the four coefficients, and the artefact. Delete the "UNVERIFIED — one read only" row.

**1.2 Name the artefact, because it is not the one the rest of the statement was verified against.** Everything else in §2.11 was read in the published open-access version at City Research Online. Table S10 was read in the **accepted manuscript**. Supplementary tables are the part of a paper most likely to differ between the accepted manuscript and the version of record. Record which was used. Then check the published version's supplement carries the same table and the same coefficients, and report. If it does not, stop.

**1.3 The second clause of that sentence is an asserted absence and should be scoped.** "The paper never models project management caseload as such" is a claim about the whole paper, not about Table S10 or Table 2. It is very probably true and it **concedes rather than claims** — it narrows our position, which is a different risk profile from the absences that caused trouble in this release. It stays, but the register records it as an absence, with the scope of the search that produced it named. If nobody can name that search, narrow the sentence to what has been read: the tables.

**1.4 New standing rule, and it is the real lesson here.** A register written on 4 September went stale on 4 September, and that staleness cost a stop condition, a halted PR and a round trip. Add to master §11:

> **Any commit that verifies, disproves or changes the status of a register item updates the register in the same commit.** A register that lags the code is worse than no register, because it is trusted.

---

## 2. Ruling on §2.1c — row 2, and the excision is smaller than the brief said

The deck settles it and settles it against us. Slide 9 sets the bands as policy on complexity, phase and dependency grounds, states in its own words that they are proposed management controls not established by research, and slide 4 warns explicitly against reading 5.16 as a project manager limit. Confidence interval: zero occurrences. Turning point: zero. Deliberate, understate, manufacture, conservative: zero each, across all 29 XML parts.

**The deck is positive evidence against the intent, not silence on it.** Row 2 applies to both 5.0 and 7.0.

**Correction to the brief.** Revision 2 prescribed the replacement as *"These bands are ProjexaR's controls. Our red threshold of 7.0 sits above the top of that confidence interval."* Do not use that. The first sentence duplicates the statement's own opening, which already says the bands are ProjexaR's management controls — it would introduce, inside one paragraph, the repetition the audit's §6 spends a page complaining about.

**The correct change is a pure excision. Delete eleven words and nothing else:**

| | Text |
|---|---|
| Now | And our red threshold of 7.0 sits *above* the top of that confidence interval, **deliberately: we would rather understate the problem than manufacture one.** |
| After | And our red threshold of 7.0 sits *above* the top of that confidence interval. |

No new text enters the protected paragraph. 7.0 > 6.19 is a fact, the juxtaposition is left standing, and the reader draws the inference the deleted clause was asserting on their behalf. Assert that exactly this substring is removed and that the paragraph is otherwise byte-identical.

**Do both edits in one pass**, as CC proposed. The numbering fix from §5 item 1 lands in the same paragraph, and touching a protected statement twice is worse than touching it once.

**One thing the deck check has settled in our favour, and it should be recorded as verified:** the statement's opening line — *"These bands are ProjexaR's management controls. They are informed by published research but are not values the research establishes"* — is a faithful paraphrase of slide 9's own closing bullet. That sentence is now verified against a named source. Enter it.

**And one gap to note, not to fix here.** The deck's amber and red bands carry additional triggers the tool does not implement: complexity, three or more high-intensity projects concurrently, sustained utilisation above 85%. The tool implements the count trigger alone. That is a legitimate simplification, but the page must never imply it applies the deck's full policy. Nothing on the page currently does. Keep it that way.

### 2.1 Where the deleted trust line goes instead

The audit called *"we would rather understate the problem than manufacture one"* the strongest trust line on the property and asked for it to be promoted. We are deleting it. That is right, and it leaves a real gap, because the audit was correct about what it was doing.

**The posture is true. Only the claim about the threshold was not.** The release did take the less flattering route repeatedly, on the record, in code: ranges rated on the less favourable endpoint, midpoints barred, the corroboration check made asymmetric so it cannot publish a confident wrong finding, contractors excluded from the cost so the hero figure is not inflated, and the Flexera comparison struck from `compute()` rather than merely caveated.

So state the posture where it is verifiable, in the band and range explanation rather than the bands statement. The audit's own §5.4 supplies the wording, and it needs no intent claim to stand up:

> Every figure drawn from a banded answer is shown as a range and rated on the less favourable end. Where we could have picked a single flattering number, we did not.

Both sentences are checkable in the suite. Run them through the §5 copy check before shipping.

---

## 3. One correction to CC's report — a conflict, to be resolved in the primary text

CC reports: *"The brief says 'the approved statement in master §2.11 has three'. Master §2.11 actually reads 'Two things follow, and we state both.'"*

Three concordant sources say otherwise. In the project copy of the specification, **master §2.11 line 226 reads "Three things follow, and we state all three."** The PR1 brief at line 166 and the PR1 addendum at line 76 both carry the same wording in their reproductions of the statement.

Per the standing rule from master §11: two readings of the same source that disagree are a conflict, resolved in the primary text, not by preferring the newer reading. **Quote master §2.11 from the working copy with its line numbers, and run `git log` on the file.** If the repo copy differs from the project copy, that is a second master and it is a serious finding in its own right. If it does not, the report has an error in it and the report should be corrected before it is filed alongside the others.

This does not change anything downstream. The count is being fixed either way, and CC's substantive point stands: four claims follow the sentence, the suite reads the third as elaboration of the second, and no reader can see that. Number them, or drop the count.

---

## 4. §2.7 reconciled — the auditor collapsed two ranges, and the tool is clean

CC could not reconcile the audit's £1.24m and 0.18% and recorded them as sitting outside the rendered ranges in opposite directions. They reconcile exactly, and the mismatch is a constant, not a defect.

**PR2 pins every fixture at a £65,000 loaded cost, whatever the production ASHE default turns out to be** — a fixture that moves when ONS republishes is not a fixture. So CC rendered the fixture constant, while the auditor used the live page and its ASHE-derived default.

That default is `56,348 + 0.15 × (56,348 − 5,000) + 0.25 × 56,348` = **£78,137**.

| Figure | At the fixture's £65,000 | At the live £78,137 | Auditor quoted |
|---|---|---|---|
| Internal effort cost | £728,000 – £845,000 | £875,000 – £1,016,000 | — |
| Full portfolio cost | £1.10m – £1.21m | **£1.24m** – £1.38m | £1.24m |
| ProjexaR share of full cost | 0.21% – 0.23% | **0.18%** – 0.20% | 0.18% |

Both of the auditor's figures are endpoints of the live ranges, and they took the low end of one and the end derived from the high end of the other. **The tool published ranges; the auditor quoted single values.** §0.6 holds and the §2.7 stop condition is cleared on the merits rather than on absence of evidence.

**Confirm this rather than accepting it.** Render fixture 8.A's inputs against the **production default**, not the fixture constant, and report the two figures. If they are not £1.24m–£1.38m and 0.18%–0.20%, the ASHE default from §3.3 did not ship and that is a live defect ahead of everything else in this PR.

There is a lesson for the fixtures here, worth one line in the PR description: a pinned constant makes the suite stable and makes the suite unable to see the page the reader sees. Nothing needs changing, but nobody should reconcile a reader's report against a fixture constant again.

---

## 5. Revised verdicts

Replacing the corresponding rows of the brief's §5 table.

**Item 5 — the two near-identical section names. Was "already fixed". Now: half-fixed, and this is the most consequential finding in CC's report.**

PR5 renamed the web section at `index.html:1046`. The print report's running header at `index.html:1283` still reads "What your answers can show you". Both strings are live at once, and the stale one is in the artefact that gets forwarded to the reader §7 identifies as the sceptical one.

Rename the print running header to match the web section. Then **audit every string PR5 changed for the same fault** — a rename that landed on screen and not in `#printReport` is a class of defect, not an instance, and PR5's three copy strings are the obvious place it recurs. Add a shape asserting that no string differs between the web report and the print report where both name the same section.

**Item 3 — the running-header collision. Was "fix the print stylesheet". Now: add a separator, and the reason is accessibility.**

CC is right and the audit's diagnosis was wrong. There is no visual collision; `.p-head` is a flex row with clear space. The audit's string is what you get when the tags are stripped, because there is no whitespace between the two spans. That is what a screen reader announces and what a copy-paste from the PDF produces — on a document whose whole purpose is to be forwarded and quoted.

Fix all five `.p-head` elements. A separator, or proper markup, not a stylesheet change. Assert that extracted text from the rendered PDF contains no run-together heading.

**Item 8 — the contractor count in share links. Was "accepted, highest priority". Now: not reproduced, with one thing left to check.**

CC round-tripped five shapes through one `permalink()` and one call site. `ct` is present in every link, including as `ct=0`, and `compute()` is byte-identical after decode. That is a clean refutation and the verdict changes.

**Keep the round-trip shape.** It is cheap and it is the assertion nobody has watched fail.

**One thing left.** The auditor said "absent from a generated share link" but the report they were reading was the PDF. Check the print report's input table — "Your figures, as you entered them" — and confirm contractors appear there, including when the count is zero. A respondent with contractors who cannot find them in the table they were told lists their inputs will report exactly what the auditor reported, and would be right to.

**Item 4 — the headings. Was "four, collapse to two". Now: eight, and it needs a mapping rather than a target.**

CC found eight, five of them across two consecutive print spreads, plus "What you told us" used twice for something that is a verdict rather than figures. Implement this:

| Now | After |
|---|---|
| Web `:1083` "Your numbers" | **Your numbers** — unchanged |
| Print `:1172` running header "Your numbers" | **Your numbers** — unchanged |
| Print `:1173` "The figures your position is built from" | **From your answers** — a table caption, not a heading |
| Print `:1177` "Your figures, as you entered them" | **As you entered them** — a table caption, not a heading |
| Print `:1182` running header "How the numbers were worked out" | unchanged |
| Print `:1183` "Every figure is arithmetic on something you supplied" | demoted to the page's lead sentence, not a heading |

Eight becomes three headings and two parallel captions. **Web `:1089` and print `:1160` "What you told us" are out of scope here** — that name is on a verdict, not on figures, and renaming a verdict is a copy decision to raise, not to take inside this PR.

---

## 6. §4.1 — the licence basis

Still Mark's, and the recommendation is unchanged: **include contractors**. A managed resource is a person with capacity recorded in the system, and a contractor on project work has capacity recorded. Quoting 25 to a department that will licence 27, in a report whose thesis is that the reader is undercounting, is the worst available place to undercount.

No figure in fixtures 8.A to 8.F moves, because all of them set contractors to zero. Fixture 8.G in the brief's §10 is the gate.

---

## 7. Order of work

1. The §3 conflict, before anything else. It is one grep and it either finds a second master or an error in the report.
2. The production-default render in §4. If the ASHE default did not ship, stop.
3. The single pass on the protected paragraph: the §2 excision and the §5 item 1 numbering, together.
4. The register updates from §1.1, §1.2, §1.3 and §2, plus the new standing rule in §1.4.
5. Item 5, and the wider audit for web-versus-print string drift it implies.
6. Everything else in the brief, in its own order.

The numeric invariant is unchanged: no number moves, except the licence quote in 8.G if §6 is approved.
