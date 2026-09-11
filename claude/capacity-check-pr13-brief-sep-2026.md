# PR13 — The project manager time-share

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`
**Follows:** PR12, merged
**Target files:** the Capacity Check HTML, `claude/capacity-check-change-spec-sep-2026.md`
**Date:** 10 September 2026
**Revision:** 2. Revision 1 added a qualification sentence against the PM rating and framed the input as something that would tell us project managers are part-time. Both were wrong. The rating is headcount-based and needs no qualification; the input tells us the share, whatever it turns out to be. That half is cut.
**Reads with:** master §2.1, §3.1, §3.5, §8; `claude/capacity-check-pr7-brief-sep-2026.md` §9.1

One new question, routed to one quantity. Nothing else in the tool changes shape.

**What this is for.** The tool asks BAU staff what share of their time goes to project work and bands the answer. It asks nothing of project managers and assumes 100%. That is the only input in the tool that is assumed rather than asked, and it sits inside the headline cost figure — on fixture 8.A, project managers are 5 of 11.2 to 13.0 effective FTE.

It also makes a protected claim capable of being false. "The internal figure is a floor, not a total" holds only if every component is understated. Where project managers are part-time, that component is not.

**This is not an accuracy exercise.** The tool is an overview built from banded estimates and it says so on every page. The change closes an undeclared assumption; it does not pursue a level of precision the tool does not claim.

**The invariant inverts, and that is the difficulty.** Every PR since PR7 proved itself with a diff of zero. Here figures must move, so a zero diff proves nothing and so does a diff of everything. **Predict which quantities move before changing anything, then assert individually that the rest did not.**

**Do not merge.** Push, report, and stop.

---

## 1. The question

Mirror the BAU time band exactly: same banding, same control, same help-text register.

> **What share of a project manager's time goes to project management?**

- **Banded.** Master §0.6 applies: figures drawn from it publish as ranges, rated on the less favourable end, never a midpoint.
- **Asked only when `pm_count` is greater than zero.**
- **Required where it is asked**, on the same basis as the BAU band.

**Report the wording and help text before building them.** Master §4.3's help text — "whoever holds a plan together, whether or not that person holds the title" — is what makes the share vary in the first place, so this question's wording has to work for someone who is a project manager by function rather than by title.

---

## 2. Where it routes, and where it must not

**It reaches `internal_project_fte` and nothing else.**

That quantity becomes a product of two bands: the low end from both low ends, the high end from both high ends. Everything downstream inherits the widened range — internal effort cost, full portfolio cost, ProjexaR's share of full cost, the corroboration check, the IT-share calculation.

Three exclusions, each with its reason, because each would look defensible to someone who did not know:

- **Not the PM tile's divisor.** Master §2.1's band comes from a study counting concurrent projects per *person*. Someone carrying nine projects carries nine whether they are at 40% or 100%. Dividing by FTE would replace a sourced ratio with one nothing supports.
- **Not the growth ceiling.** Master §2.6 requires the ceiling's divisor to match the divisor the rated tile publishes, and the PM tile stays headcount-based.
- **Not the licence basis.** That counts people with capacity recorded. A part-time project manager is a person.

---

## 3. Links issued before this question existed

A new input means a new URL parameter, and links without it already exist in printed reports and in Sender records.

A decoded link with no project-manager share is not the same as one answering zero, and treating it as either silently is wrong. Decide and report the behaviour before building it.

**Recommendation: treat it as unanswered and suppress the quantities that depend on it**, following master §1.1's suppression rule as every other suppression does. A reader following an old link should see what the tool can still tell them.

Shapes for the parameter absent, present, and present but empty.

---

## 4. The specification

**§3.1 and §8.** The formula changes and every fixture figure derived from it changes with it. **Re-derive rather than adjust** — recompute each affected figure from the inputs, independently of the code, as the originals were produced. A fixture adjusted to match the code it checks is not a fixture.

**§6's `headroom` bullet.** It says "Blank when nothing is live". It is blank on two conditions: nothing to project from, or no capacity route to project with. Found during PR11 and left because that brief named exactly two facts. Correct it here, §11 updated in the same commit.

**Check the floor claim still holds.** With this input in place, confirm "The internal figure is a floor, not a total" is true on every shape. If any shape can now produce an internal figure above the true one, stop and report rather than rewording a protected epigram.

---

## 5. Fixtures

Every fixture changes, which is expected and is also the risk: a PR in which every number moves is the shape that hid three defects in the original release.

- **At least one fixture must have part-time project managers.** A suite where every fixture answers 100% proves nothing about the feature.
- **Report before and after for every changed figure, by fixture, with its derivation.** A table, not a diff.
- **Assert what did not move**, individually rather than in a blanket comparison: the PM tile ratio and rating, the BAU tile ratio and rating, the growth ceiling, the licence basis, the quote, and the reported spend. A movement in any of those means the input has leaked into a route §2 excludes it from.
- **Assert no posted Sender field changes value.** On this design none should: `effective_fte` and `projects_per_fte` are BAU-derived, `pm_load` and `licence_count` are headcount, `headroom` follows the ceiling. If one moves, stop and report — the field contract is under audit and this PR was scheduled on the understanding it would not disturb it.

---

## 6. Acceptance criteria

- [ ] Question wording and help text reported before implementation.
- [ ] Banded, asked only when project managers are present, ranges carried through every derived figure.
- [ ] Reaches `internal_project_fte` and nothing else, with the PM tile, growth ceiling and licence basis each asserted unmoved.
- [ ] No posted Sender field changes value, asserted.
- [ ] Old links without the parameter behave as §3 decides, with shapes for all three cases.
- [ ] Every fixture re-derived independently, with the derivation reported figure by figure.
- [ ] At least one fixture has part-time project managers.
- [ ] The floor claim confirmed true on every shape.
- [ ] §3.1, §8 and §6's `headroom` bullet corrected, §11 updated in the same commit.
- [ ] No em-dashes in output. Every en-dash in a number range survives.
- [ ] Every PR1 to PR12 assertion still passes, except those whose expected values §4 re-derives.

---

## 7. Report back with

1. The proposed question wording, before you build it.
2. The predicted list of quantities that move, written before the change, and whether the measured list matched it.
3. The figure-by-figure derivation table.
4. What you decided for §3, and why.
5. Whether the floor claim still holds on every shape.
6. Any assertion whose expected value you changed, with the reason. This is the one PR in which "the suite failed so I updated the expectation" is sometimes correct and always needs stating.

---

## 8. Held

- **What 14 days produces.** Norm's wording, once the MVP scope is fixed.
- **The email re-gate**, and **`pm_load` formatting**. Both decision-gated.
- **The marketing site's broader copy work.** Separate, and not CC's.
