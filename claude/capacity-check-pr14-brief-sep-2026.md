<!-- PROVENANCE. This is the brief as issued to Claude Code on 11 September 2026,
     committed here verbatim from that copy because claude/ holds the
     authoritative version and this brief had no file. If it was edited in place
     after issue, per this directory's own rule, the maintained version
     supersedes this one and should replace it here. Nothing in the repository
     reads this file. -->

# PR14 — Arithmetic a reader can check

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`
**Follows:** PR13, merged
**Target files:** the Capacity Check HTML, `claude/capacity-check-change-spec-sep-2026.md`
**Date:** 10 September 2026
**Reads with:** master §2.9, §3.5, §11; the §11 entries CC recorded during PR13

Three defects of one class: arithmetic a reader can redo and get a different answer from ours. All three sit in or beside the workings, which is the section that exists so a sceptical reader can check us, and the first place that reader looks.

**This is a small PR on purpose.** It follows one in which every cost figure moved, and its whole value is a diff short enough to read. Nothing here is urgent enough to justify hiding it inside a larger change.

**Numeric invariant.** Two published figures change and they are named in §3. Everything else holds. Predict, then assert.

**Do not merge.** Push, report, and stop.

---

## 1. The inverted labels — the one that matters

The corroboration workings row in `pr-formulas` states its outcomes the wrong way round. On 8.F, a window of 68.1% to 79.0% against a stated 72% is labelled "Above the window". On 8.E, 82% reads "Below the window".

The check itself and its card copy are correct on both branches. Only the two labels in the workings are wrong, which is the worst place for them: a reader who accepts the card and then turns to the workings to see how we got there finds us contradicting ourselves about a figure they can compare in their head.

Correct the labels. **Do not touch the check, its branches, or the card copy** — they are right, and master §2.9's asymmetry is deliberate.

Add an assertion that the label agrees with the comparison it describes, on both branches, derived rather than pinned by string. A pinned string would have passed against the inverted labels for as long as they stayed inverted.

---

## 2. The BAU ratio's printed division

The tile's published ratio divides by the raw effective FTE, so the workings can print `45 ÷ 4.9 = 9.1` where the reader's own division gives 9.2.

This is the same class as the three sums corrected earlier in the release: every printed calculation must be reproducible from the numbers printed beside it.

**The rated figure does not change.** PR13 §5 forbade moving the BAU tile ratio and that still holds — the tile's value is computed from the unrounded quantity and stays exactly as it is. What changes is the workings row, which must show a division the reader can perform. Report which of the two you did:

- Print the divisor at the precision the ratio was computed from, so the shown division reproduces; or
- Print the row as displayed and state, once, that the ratio is computed before rounding.

The first is better if the precision is presentable. The second is honest but adds a caveat, and PR6 §3's test applies to whether it needs to be inline.

**Assert that every printed calculation in the workings reproduces from its own printed operands**, to the displayed precision, across all shapes. That assertion is the point of this section; the one row is the instance that revealed it. Report how many rows it covers and whether any others fail it.

---

## 3. The `roundN` epsilon

`roundN`'s epsilon had no live case: `1095000/1e6` multiplies to exactly 109.5, so 8.A's old figure rendered identically with and without it. Removing the epsilon from the tool left all 46,085 assertions green.

PR13 pinned £1,005,000 as a real case on its own shape, and that mutation now fails. Two things left:

- Confirm the pinned case is the general one rather than one value that happens to work. Report which input produces it and whether a second, structurally different case exists.
- Report whether any other tolerance, epsilon or comparison in `compute()` has the same property: present, load-bearing by intent, and never exercised. **Do not fix what you find.** List it, and if the list is long, say so and stop.

---

## 4. The corpus floor

PR13 found the fuzz pass silently dropping 303 of 400 shapes when a new required input appeared, reporting zero failures throughout. That instance is floored.

Add to master §0 as constraint 18:

> **A generated corpus states and floors its rendered count.** A change to the required input set can shrink a generated corpus without failing anything, so coverage that is generated rather than enumerated must assert its own size.

Then check whether any other generator in the suite counts as generated rather than enumerated, and floor it. Report how many you found.

---

## 5. The specification

The three §11 entries CC recorded during PR13 are closed by this PR. Update them to closed rather than deleting them, with what each cost recorded, in the same commit as the fix.

---

## 6. Acceptance criteria

- [ ] The corroboration labels agree with the comparison they describe, asserted derivationally on both branches.
- [ ] The check, its branches and the card copy are untouched, asserted.
- [ ] Every printed calculation in the workings reproduces from its own printed operands, asserted across all shapes.
- [ ] The BAU tile's rated value is unchanged, asserted.
- [ ] §0.18 added, and every generated corpus floors its count.
- [ ] The three §11 entries closed in the same commit as their fixes.
- [ ] Only the figures named in §3's report change. Everything else asserted unmoved.
- [ ] No em-dashes in output. Every en-dash in a number range survives.
- [ ] Every PR1 to PR13 assertion still passes.

---

## 7. Report back with

1. Which resolution you took in §2, and how many workings rows the reproducibility assertion covers.
2. Any other row that failed it.
3. The unexercised-tolerance list from §3, unfixed.
4. How many generators needed flooring.
5. Anything that moved which you did not predict.

---

## 8. Held

- **What 14 days produces.** Norm's wording, once the MVP scope is fixed.
- **The PR13 question's label and tooltip.** Norm's to overrule; a string change needing no re-derivation.
- **The email re-gate**, and **`pm_load` formatting**. Both decision-gated.
- **The marketing site's broader copy work.** Separate, and not CC's.

---

## Follow-up, 11 September 2026

Issued after the first report and landed in the same PR:

- **Pin `CORROBORATION_TOLERANCE`.** It was listed in §3's report beside `ifloor`'s and `redThreshold`'s epsilons, and it is a different kind of thing: those two are declared defensive and their absence changes nothing a reader sees, while the tolerance sets the width of a published window and raising it from 3 to 4 makes the corroboration check more permissive. Add a shape that fails at 4 as well as at 0 and at 12, so a one-point drift cannot pass. No behaviour change.
- **Fix `claude/INDEX.md` in the same commit.** Two of its entries cite the PR11 and PR12 briefs under the `claude_` filenames that `f8437b9` renamed, so they point at files that no longer exist. Correct those and add entries for the PR13 and PR14 briefs. The index has now fallen behind twice, so either record in master §11 that it is maintained by hand and nothing asserts it, or — if it is cheap — assert that every file in `claude/` appears in the index and every index entry resolves to a file. Report which.
- **Report what a full suite run costs in wall-clock time.** A suite nobody runs before pushing is worth less than a smaller one everybody runs.
