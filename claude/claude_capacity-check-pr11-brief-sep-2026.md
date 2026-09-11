# PR11 — Launch blockers from the Sender audit

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`
**Follows:** PR10, merged
**Target files:** the Capacity Check HTML, `src/worker.js`, `claude/capacity-check-change-spec-sep-2026.md`
**Date:** 10 September 2026
**Reads with:** `claude/capacity-check-sender-audit-sep-2026.md` §5

The Sender audit of 10 September produced six tool-side items. This PR takes the four that block launch and leaves the rest, because two of them wait on a decision Mark and Norm have not yet made.

**The project manager time-share input moves to PR12.** It was queued as PR11 and it is a correctness change, not a launch blocker. These are.

**Numeric invariant: absolute.** No figure changes on any shape. Nothing here touches `compute()`.

**Do not merge.** Push, report, and stop.

---

## 1. Gates

**1.1 The audit read `main` at `91dd79d`, which is PR9 merged and PR10 not.** Every line reference in it predates PR10, and at least one of its findings has since been fixed.

Before doing anything, re-check each item below against current `main` and report which are still live. In particular, the audit's code item 3 reports "Your 1 contractor are counted separately" on report pages 4 and 8. PR10 §5 fixed exactly that string, on screen and in print. Confirm it is gone and close the item, or report that PR10 missed a site.

**1.2 Report whether a tense guard is feasible.** §2 is a copy fix that the copy-rule check cannot see, because it detects words and not tense. Report whether a narrow guard over the ProjexaR section of the printed report is worth having — a short list of present-tense product verbs in that section only — or whether it would be brittle enough to be worse than a review item. Do not build it before reporting.

---

## 2. The present-tense product claim, in our own output

The printed report's final page says:

> ProjexaR works from your actual projects and your actual people, with each person's operational commitment set and owned by their line manager, so when it changes every plan that depends on it changes with it.

That is a description of a product in planning, written as a description of a product that exists. It is the same breach the audit found in the Sender template, and fixing the email alone leaves it in place in the artefact that gets forwarded.

Rewrite to design intent. The audit's replacement for the email version is the right shape:

> ProjexaR is being designed so that each line manager records the BAU commitment of each person in their team, and every project plan that depends on it reads from that record.

Two constraints on the wording. The design of record has the BAU declaration as a time-phased record that line managers maintain, so avoid anything implying it is set once. And this sits on the ProjexaR page, which per PR8 §2.7 states what the product does and what it costs and makes no ask.

Deleting the sentence is the zero-risk alternative and the page stands without it. Report which you did.

---

## 3. The Worker does not enforce consent

`handleCapacityReport` never checks `ack`. The only reference to it records "yes" or "no" and the subscriber is created either way.

Two separate faults, and they compound.

**3.1 Enforce it.** A request without `ack` must be rejected before anything reaches Sender. The page enforces the tick, but the Worker's own comments treat crafted requests as in scope, and every other input on this endpoint is validated Worker-side for exactly that reason. Return the same shape as the other rejections and make no Sender call.

**3.2 The consent record has nowhere to land.** `report_consent` has been posted since 9 August and no Sender custom field of that name exists, so the value is discarded on arrival. Creating the field is Mark's action in Sender, not yours. Your part is to assert that the payload carries it, which the field-set assertion already does, and to report whether anything else the Worker sends has no destination.

Add a shape: a payload with `ack` false or absent produces a rejection and zero Sender calls.

---

## 4. Comments that describe behaviour the code no longer has

None of these changes behaviour. All of them are how the next reader learns something false.

| Location | What it says | What is true |
|---|---|---|
| `worker.js` 284–287 | Segment rules in red, amber and green | The fields carry "Healthy", "Watch" and "At risk". A condition written against RAG codes matches nobody |
| `worker.js` 289–292 | `headroom` clamped, zero meaning two things | Signed and unclamped since PR1. Zero now means one thing, exactly at the limit. Blank means one of two things |
| `worker.js` 312–314 | The cost-blind rule as `'tracked'` | The payload sends the option's full display text; the bare word is never sent. The behaviour is correct, the description is not |
| `index.html` 2502 | Straddle wording order | Describes the opposite order to the code beneath it, which puts the adverse state first |

While in `worker.js`, name `headroom` as an adverse-endpoint field. The payload comment in the tool already implies it and the Worker's does not, which is how a future segment rule gets written against it.

---

## 5. The specification carries two stale facts

Per the INDEX rule, correct these in the repository copy with the §11 register updated in the same commit.

- **§6, line 504** carries the pre-PR1 "zero for two reasons" wording, and a null history for `effective_fte` and `projects_per_fte` that git does not support. The audit establishes it: neither field existed before 19 August; from then until PR1's merge both posted values; between PR1 and PR2 only `effective_fte` posted null, because PR1 renamed the property it read.
- **§2.4** gives the old PM Watch band as 9–12. The pre-PR1 code was `BAND_PM = { amber:8, red:12 }` with a strict comparison, so Watch was above 8 and up to 12.

Both are history rather than behaviour, which is precisely why nobody would notice them being wrong.

---

## 6. Held, pending decisions

Do not implement these. They are recorded so nobody picks them up from the audit.

**6.1 The offer.** The check says "Unlimited 14-day trial" beside two "Start free" links to `/start`. The two-projects offer appears on the home page, `/start`, `/pricing`, `/contact`, the Project Online migration page and the start flow in `site.js`. The 1 September decision — a 14-day sandbox contracting to five managed resources free forever — is stated on no page of the site.

This is a six-page copy change gated on a decision that decision record leaves open: whether the free tier launches with the sandbox or later. Mark and Norm own it. **Do not fix `/start` alone**; a single corrected page beside five wrong ones is worse than six consistent wrong ones, because the reader cannot tell which is current.

**6.2 Skipping the gate for arrivals from the email.** A respondent who follows their own email link is asked for their email again before the PDF, and passing the gate writes to Sender again. That is how a duplicate subscriber was created during the audit.

The obvious fix breaks something else: the same URL is used for the shareable link, and a second reader arriving on a forwarded link is a lead worth gating. Distinguishing the two needs a token carried in the emailed link and not in the on-page shareable one. That is a design decision, not a fix.

**6.3 `pm_load` formatting**, blank-optional behaviour on update, and everything in the audit's Part C. All either decision-gated or nurture, and the nurture is explicitly parked.

---

## 7. Acceptance criteria

- [ ] Both §1 gates answered before any change, with each audit item confirmed live or closed against current `main`.
- [ ] Zero numeric change on all shapes, asserted.
- [ ] No present-tense claim about unshipped product behaviour anywhere in output.
- [ ] A payload without consent is rejected, with no Sender call, asserted.
- [ ] All four comment corrections made, with no behaviour change, asserted.
- [ ] §6 and §2.4 corrected, §11 updated in the same commit.
- [ ] Nothing in §6 implemented.
- [ ] No em-dashes in output. Every en-dash in a number range survives.
- [ ] Every PR1 to PR10 assertion still passes.

---

## 8. Report back with

1. The two §1 gate answers, and which audit items were already fixed by PR10.
2. Which way you resolved §2, and the final wording.
3. Whether anything else the Worker sends has no destination in Sender.
4. Whether a tense guard is worth building.
5. Anything that could not be done without moving a number.
