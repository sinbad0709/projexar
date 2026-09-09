# PR4 — Correctness: currency, the ticket-rate comparison, and three caveats

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`
**Follows:** PR3, merged
**Source:** your commensurability audit of 4 September
**Target file:** the Capacity Check HTML, plus `tools/capacity-check/`
**Date:** 4 September 2026

First of three. This one fixes what is wrong. PR5 does layout and structure, PR6 rewrites the copy. Nothing visual moves here beyond the changes below.

Do not merge. Push, report, and stop.

---

## 0. Before you write anything

1. Branch from `main`. Name it `pr4-currency-ticket-rate`.
2. Re-bless the baseline from post-PR3 `main`.
3. **New copy in this PR is written in the plain style PR6 will apply everywhere.** No em-dash asides. One idea per sentence. No rule-of-three lists. Do not explain our process to the reader. It is cheaper to write it this way now than to rewrite it in PR6.

**Stop and ask if:** the currency value is not available to `compute()` at the point the cost block is built, or the six currency options do not include a clean GBP flag.

---

## 1. The currency bug — the reason this PR exists

A respondent selects dollars, types 367,000, and the tool adds that figure to a sterling internal cost, labels the sum £, and prints it as the hero tile. It does not convert and it does not warn. Five of the six currency options do this.

This is the most serious defect found in the release. It is silently wrong on the largest and most forwardable number in the report, for exactly the reader the tile was built for.

**Do not convert.** An exchange rate is a figure that goes stale, needs a source, and would fail this tool's own standards inside a month. That is the wrong fix.

**The real constraint is not currency, it is country.** The loaded cost comes from ONS ASHE, which is UK data. Pricing a US department's effort at UK salaries is wrong whichever currency they type. Your audit noted this as ASHE's residual; it is the same problem, and the currency selector is the only signal we have for it.

### The rule

**Run the cost calculation only when the reported currency is GBP.** For every other currency, suppress the whole cost block:

- no internal effort cost
- no full portfolio cost
- no reported spend as a share of full cost
- **no ProjexaR price as a share of reported spend** — that ratio crosses currencies too, and the existing caveat on it does not repair it. The Flexera lesson was that a caveat stated elsewhere does not fix an arithmetic operation made inline
- hero falls back to the growth ceiling, via the non-summing path §3.1 already has

**Still shown:** their reported spend in their own currency, the effective FTE figures, the ProjexaR price in sterling without a percentage.

State the reason in one plain line where the cost block would have been. Something in this register, adjusted to the currency they chose:

> You reported your project spend in US dollars. Our salary benchmark is UK data, so we do not price your internal effort or add it to your spend. The effort is shown above as full-time equivalents.

**Enumerate the six currency options in your report**, and confirm which one gates the cost block.

---

## 2. Remove the ticket-rate comparison entirely

Your audit found it fails three ways: the benchmark's denominator is seats supported and ours is company headcount; the benchmark is desktop support and our numerator is service desk; and the 0.41–1.38 range is spliced from a 2012 floor and a 2019 ceiling, published by neither edition.

The third is the Jitbit 480 pattern for the fourth time in this release, so treat it the same way. **Remove it rather than restating it.**

Remove **both** the benchmark and our own tickets-per-employee figure. Unlike the IT-share number, this one sets no scale for anything else in the report. It exists only to be compared, and the comparison is going.

- Delete `0.41–1.38` and its citation from the sources.
- Delete the tickets-per-employee computation from `compute()`, not merely from the output, and assert it is undefined on every shape.
- **HDI/MetricNet survives as a source** for the 87–133 desktop support figures in §4 below, so nothing is orphaned. Confirm that in your report.
- Note in the sources or workings, if it reads naturally, that the 2012 article's prose and its own Figure 2 disagree on the sector high. That is a good reason to name table or prose whenever either is cited again.

---

## 3. Corroboration — name the assumption, and use it

The derived side counts every project manager as a full-time equivalent of change work. Where PMs also carry run work, derived change is overstated, derived run is understated, and the check lands in the branch that flags.

Note the irony: we made this check asymmetric to avoid false flags from staff we do not model. This bias runs the other way and walks straight into the branch the asymmetry does not protect.

**Two changes.**

1. **State the assumption** in the workings, beside the derivation: we count each project manager as a full-time equivalent of change work.
2. **When the check returns Watch, name this first.** The most likely explanation for the tool deriving more change effort than the respondent reported is that their PMs also carry run work. Saying so turns a probable false positive into a useful prompt.

Do not widen the tolerance and do not add a question about PM time. The assumption stays; it just stops being silent.

---

## 4. The ticket divisor anchors — say the brackets measure different things

The 170–320 window is bracketed by HDI/MetricNet's 87–133 (desktop support technicians, throughput affected by travel) and Jitbit's 21 a day (mixed internal IT and customer support, remote). Both are quoted correctly. But they measure different functions from each other, and neither matches what we ask the respondent for.

Declaring the window as ProjexaR's control does most of the work already. Add the missing part: **the two anchors do not measure the same thing, and neither is a direct match for service desk tickets in an internal IT department.**

If that cannot be written without making the anchoring look decorative, the fallback is to drop both anchors and declare 170–320 as ProjexaR's judgement alone. Say which you did and why. Anchored judgement is stronger than bare judgement only when the anchors are honest about what they are.

---

## 5. The run-work gap — name the two kinds of uncertainty

`run work FTE − ticket FTE` subtracts a respondent's effort estimate from a figure derived through a ProjexaR control. Both are FTE of the permanent department so the arithmetic holds, but the two carry different kinds of uncertainty and the copy does not say so.

Add one line. Also check the surrounding copy for a denominator inconsistency: run-work FTE is expressed across all IT staff while ticket capacity is expressed as a share of non-PM staff. If the two are described side by side with different denominators, make that explicit or make them consistent.

---

## 6. Fixtures

### 8.D — non-GBP. New.

**Inputs:** fixture 8.A exactly, with the reported currency set to **USD**.

| Figure | Expected |
|---|---|
| Every FTE figure, ratio, threshold, rating, the growth ceiling, the licence count | **Identical to 8.A** |
| Internal effort cost, full portfolio cost, reported share of full cost | **Suppressed**, with the reason stated |
| Hero tile | Growth ceiling |
| ProjexaR price | £2,500 a year, shown **without** a share-of-spend percentage |

Any rated figure differing from 8.A means the gate has caught something it should not.

### 8.A, 8.B, 8.C

Unchanged except for the removals in §2.

**Expected departures from the number multiset:** the tickets-per-employee figure — `0.8` in 8.A and 8.C, `2.3` in 8.B — and `0.41` and `1.38` in all three.

**Expected arrivals: none.** If the new caveat copy in §3, §4 or §5 introduces a number, name it and say why it is needed. I predicted "no arrivals" once before and was wrong because my own draft copy introduced four figures, so check rather than assume.

---

## 7. New shapes

- One per currency option, asserting the cost block is present for GBP and suppressed for the other five, with the reason rendered.
- The ProjexaR share-of-spend percentage absent on every non-GBP shape.
- `tickets_per_employee` undefined on every shape.
- The corroboration Watch branch renders the PM run-work explanation.

Carry every PR1, PR2 and PR3 shape forward.

---

## 8. Acceptance criteria

- [ ] No cost figure and no cross-currency ratio renders for any non-GBP currency, and the reason is stated.
- [ ] Fixture 8.D matches 8.A on every rated figure.
- [ ] The tickets-per-employee figure and the 0.41–1.38 range are gone from output, from `compute()`, and from the sources.
- [ ] No source is orphaned.
- [ ] The corroboration assumption is stated, and the Watch branch names PM run work first.
- [ ] The ticket anchors say they measure different things, or both are dropped with the reason given.
- [ ] Only the numbers named in §6 left the multiset, and any arrival is explained.
- [ ] Every PR1–PR3 assertion still passes.
- [ ] New copy carries no em-dash asides.

---

## 9. Report back with

1. The six currency options and which gates the cost block.
2. Confirmation that HDI/MetricNet survives as a source after the removal.
3. Whether the ticket anchors were caveated or dropped, and why.
4. The exact departures and arrivals from the number multiset.
5. Anything you stopped and asked about.
