# PR10 — The measure audit, and where a reopened link lands

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`
**Follows:** PR9, merged
**Target file:** the Capacity Check HTML and its screen stylesheet
**Date:** 10 September 2026
**Revision:** 2. Revision 1 treated the width faults as three separate blocks, and asserted a notation defect from two renders that used different inputs. Both were wrong. This revision treats the width fault as one systemic problem and demotes the notation question to a gate.
**Reads with:** `claude/capacity-check-pr9-brief-sep-2026.md` §4

Two things: a width fault appearing in several places and therefore probably caused by one rule, and the reopened-link landing that PR9 correctly declined to fix inside a Worker PR.

**Numeric invariant: absolute.** No figure changes on any shape. Nothing here touches `compute()`.

**Do not merge.** Push, report, and stop.

---

## 1. Gates

**1.1 The measure audit — do this before changing anything.**

Text in several blocks wraps well short of its container. Confirmed by eye in "How the bands were set", where the column runs to roughly 55% of the card, and inside the two navy cards, the full-cost and growth-ceiling tiles. Mark reports it elsewhere too.

Several occurrences almost certainly means one rule, not several. **Enumerate every block whose text measure is narrower than the box it sits in**, on screen and in print, and report for each: the element, the rule constraining it, and where that rule is inherited from. Render at 1440px, 1024px and 380px, and report whether the set differs by width.

Name the root cause before proposing a fix. If the answer is that some containers carry a reading-measure cap and others do not, the fix is to decide which behaviour is correct and apply it consistently, not to widen whichever blocks look wrong.

**1.2 Is the banded-time paragraph's size intentional?**

> Your BAU staff give X–Y% of their time to project work, so every figure drawn from that answer is a range...

It renders at roughly twice body size, larger than the headings around it. Report whether that is a deliberate lead-in treatment or the same inheritance problem as §1.1 seen from the other side.

For Mark's decision, not yours: this paragraph carries the range posture, which PR8 established as load-bearing for trust, but it is still an instruction on how to read the figures rather than a finding. Making it the loudest thing on the page inverts the hierarchy. If it is deliberate, it stays.

**1.3 The figure notation — a question, not a reported fault.**

The live report renders internal staff cost as `£1.27m–£1.41m`; PR9's worked example rendered the same quantity as `£875,000–£1,016,000`. **Those were different inputs, so this is not evidence of a defect** and revision 1 was wrong to treat it as one.

What remains open: is the switch a magnitude threshold applied by one helper, or do call sites format independently? If one helper, nothing to fix. If several, a value near the threshold could render two ways on a single shape across the web report, the printed report and the covering note.

Report which. Either way add the assertion in §4 — it is cheap and nothing currently watches it.

---

## 2. The fix

From §1.1's root cause. Two constraints on it.

**The bands card is the case that matters most.** PR7 moved that block out from behind the email gate precisely so a reader could see the sourcing behind a rating. It is now the longest block on the page rendered in the narrowest measure on the page, which makes it read as a footnote and run longer than it needs to.

**A reading-measure cap is a legitimate design choice.** If that is what is happening, the answer may be to apply it to the prose blocks that lack it rather than remove it from those that have it. Say which you are doing and why, and show both.

Rasterise before and after at all three widths.

---

## 3. Singular and plural

"Your 1 contractor added to X–Y effective BAU FTE" reads as machine output in the commonest non-zero case. Handle the singular, and report anywhere else the same fault exists. This is never in one place.

---

## 4. One notation per figure

Whatever §1.3 finds, assert that a given quantity renders identically wherever it appears — web report, printed report, covering note — plus a shape sitting close to any threshold §1.3 identifies.

The sender pastes the note into an email and attaches the PDF. A recipient should not meet the same number written two ways.

---

## 5. Where a reopened link lands

From PR9 §4, confirmed in a real browser: the link round-trips every input, does not open on an empty form, but lands at the top of the page with the form fully expanded and the report 2,810px below. The manual submit path scrolls to the report; the prefill path does not.

PR9 put that link in the printed PDF, so it is now the second reader's only route into the tool. Someone following it from a forwarded report meets a long form rather than the figures they were sent.

1. **On the prefill path, land on the results.** The report is already rendered; scroll to it.
2. **Collapse the form above the results, and keep it editable.** Collapsed, not hidden. The reason for issuing a link at all is that a movable number invites engagement where a static one invites argument, and that needs the inputs visibly present.

The manual submit path is unchanged. Shapes for both.

---

## 6. One line, if it is cheap

The bands statement names the paper's leadership-role categories as project leader, chief project engineer and project supervisor. Those came from Table S10 in the accepted manuscript; the Version of Record's supplement returns 403. Every other clause in that statement rests on a source anyone can open.

If the role names are not in the VoR main text, drop the parenthetical. The sentence does not need it. If they are, leave it and record where. Do not spend long on this.

---

## 7. Acceptance criteria

- [ ] All three §1 gates answered before any change, with §1.1's root cause named rather than its symptoms patched.
- [ ] Zero numeric change on all shapes, asserted.
- [ ] Text measure consistent across comparable blocks at 1440px, 1024px and 380px, with before-and-after renders.
- [ ] One notation per figure across all three surfaces, asserted, with a near-threshold shape if one exists.
- [ ] Singular handled wherever the fault exists.
- [ ] A reopened link lands on the results with the form collapsed and editable; manual submit unchanged.
- [ ] No em-dashes in output. Every en-dash in a number range survives.
- [ ] Every PR1 to PR9 assertion still passes.

---

## 8. Report back with

1. The three §1 gate answers, first and separately.
2. The root cause of the measure fault, the full list of affected blocks, and which way you resolved it.
3. Rasterised before and after at all three widths.
4. The notation rule as found.
5. Where else the singular fault existed.
6. A reopened link's landing position, before and after.
7. Anything that could not be done without moving a number.

---

## 9. Not in this PR

- **The Sender audit.** Running in parallel while this is in flight. Nothing in it touches this repository, so there is no conflict. Template copy first, field mapping second: the empty placeholders are visible and mechanical, while a present-tense claim about product behaviour that does not exist is neither, and is the item with real exposure.
- **`projexar.com/start`**, still promising two projects free forever while the check says "Unlimited 14-day trial". The oldest open item, and the first automated email's second call to action lands on it.
- **The project manager time-share input.** PR11, after this, because it moves every number and the fixtures need re-deriving.
