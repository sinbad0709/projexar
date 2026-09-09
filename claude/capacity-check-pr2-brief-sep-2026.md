# PR2 — Full cost, contractors, banded input, findings restructure

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`
**Companion:** `CapacityCheck_ChangeSpec_CC.md` revision 2 §3, plus §1.1, §5, §6, §7, §8, §11
**Follows:** PR1, merged and verified live 4 September (9.0 At risk, 6.1 Watch, −17 overrun, Healthy corroboration all confirmed on the deployed page)
**Target file:** the single self-contained Capacity Check HTML file, plus the suite under `tools/capacity-check/`
**Date:** 4 September 2026

This is the largest of the three PRs and the one where the specification does most of the work. Read spec §3 in full before starting.

Do not merge. Open the PR, post the diff report, and stop.

---

## 0. Before you write anything

1. **Branch from `main`**, which now contains PR1. Name it `pr2-full-cost-contractors-bands`.
2. **Norm Thomas signs off the two new questions before they are final.** PR2 changes the question set — the blended-time input becomes banded, and a contractor field is added. Question wording is Norm's, not yours and not mine. Implement to the wording below, flag both to him, and expect them to change.
3. **Re-bless the baseline from post-PR1 `main`**, not from the pre-PR1 state.
4. **Confirm PR1's endpoint plumbing actually landed.** The PR1 brief asked for every derived quantity to be written as a function taking an endpoint, called once. If that was done, PR2 calls each one twice. If it was not, do that refactor first, as its own commit, and say so — it is much cheaper than threading ranges through call sites one at a time.

**Stop and ask, rather than deciding, if:** the ASHE figure cannot be obtained (§3.3); the existing email gate cannot be positioned so the full-cost tile sits in front of it (§3.1); or any figure in §4 comes out differently from the value stated there.

---

## 1. Scope

**In.** Spec §3.1 full-cost calculation and its gate · §3.2 contractors and six routing rules · §3.3 loaded cost per head · §3.4 hero tile naming and framing · §3.5 banded time input and range output · §3.6 ticket divisor and the run-work check · §3.7 pricing arithmetic · §3.8 findings restructure and the checks block · the full-cost row of the §1.1 suppression table · the §8.A and §8.B fixtures in their banded form.

**Out.** Everything in PR3: typical project duration, the IT-staff-share metric, the project-definition helper text, the OG image. Sender field changes of any kind — see §6.

**Do not touch** the pricing page, `/start/`, or any file outside the Capacity Check HTML and `tools/`.

---

## 2. Two rules that govern everything below

### 2.1 Ranges are computed at both endpoints, never interpolated

Every figure derived from the blended band is computed twice — once at each endpoint — and both are carried to the output. Never a midpoint, never a single value with a ± attached.

**Rate on the less favourable endpoint**, and display both. Where a range straddles a band boundary, say so: "Watch to At risk", never the flattering end alone.

### 2.2 Derived differences are computed from the displayed values

**[NEW — this is the arithmetic version of PR1's rounding rule.]** Where the page shows `A`, shows `B`, and shows `A − B`, the subtraction must use the **rounded, displayed** A and B — so that a reader doing the sum on the page gets the number the page prints.

Worked case from fixture 8.B: run work 13.44 displays as 13.4; ticket FTE 4.375 displays as 4.4. The gap computed from raw values is 9.065 → 9.1. Computed from displayed values it is 9.0. **9.0 is correct**, because 13.4 − 4.4 = 9.0 is what the reader sees. Printing 9.1 beside those two figures is the same class of fault as a rating contradicted by its own workings.

Applies to the run-work gap, the reported-versus-full cost split, and any other published difference.

### 2.3 Use one epsilon-safe rounding helper at every precision

```js
function roundN(x, n){ var p = Math.pow(10, n); return Math.round(x * p + 1e-9) / p; }
```

`round1` from PR1 becomes `roundN(x, 1)`. **This is where the epsilon genuinely earns its keep**, unlike the PR1 threshold case where the justification was wrong: the hero figure £1,095,000 rendered in millions is `1.095`, which in IEEE 754 is `1.09499999…` and rounds to **£1.09m** without the epsilon and **£1.10m** with it. The fixture asserts £1.10m. Do not remove it.

---

## 3. The work, in dependency order

### 3.1 Banded time input (spec §3.5) — do this first, everything depends on it

**Input.** Replace the free-text percentage with 10-point bands: 1–10, 11–20, 21–30, 31–40, 41–50, 51–60, 61–70, 71–80, 81–90, 91–100.

**Output.** Every dependent figure computed at both endpoints and presented as a range: effective BAU FTE, internal project FTE, live projects per effective BAU FTE, the BAU route of the growth ceiling, derived run share, internal effort cost, full portfolio cost, reported share, ProjexaR's share of full cost.

**Not band-dependent, so still single values:** concurrent projects per PM, the PM route of the ceiling, ticket-derived FTE (which gets its own range from the divisor, per §3.5 below), run-work FTE reported.

**Copy.** Add an explanation of why a range is shown. It is an argument, not a disclaimer — an average this soft is precisely why actual commitments are needed. Do not bury it. Update "What this does not account for" so its blended-average paragraph describes the band and range treatment.

**Legacy URLs.** Not a gate. Map a legacy free-text `p` to its containing band; `p ≥ 91` → 91–100; `p ≤ 0` or absent → no answer. A legacy link must render rather than error. A few lines of defensive code, no acceptance criterion, no dedicated shape. If it costs more than that, drop it and say so in the PR description.

### 3.2 Contractors (spec §3.2)

**New field.** *"Contractors and outsourced staff working on projects"* — helper text *"Counted separately from your permanent IT staff."* Integer, default 0. **Norm's wording call.**

Six routing rules, all of them:

| Route | Treatment |
|---|---|
| BAU tile ratio and growth ceiling | **Exclude.** These measure how far the portfolio depends on permanent BAU capacity; contractors do not change BAU capacity. |
| Displayed beside the BAU tile when `contractor_fte > 0` | Show **unrated**: `live ÷ (bau_effective_fte + contractor_fte)`, labelled as delivery capacity including contractors. |
| Full-cost calculation | **Exclude.** Their cost is paid out of budget and in the ordinary case already sits inside reported spend. Marked **[ASSUMPTION]** in spec §11 — state the exclusion on the workings page in terms of what is excluded, not what we assume their budget contains. |
| Run/change derivation | **Exclude.** Not part of the permanent department the stated split describes. |
| IT staff as a share of company | **Exclude**, and say so on the workings page. (The metric itself returns in PR3.) |
| Licence basis and the ProjexaR quote | **Exclude.** Basis stays BAU staff + PMs. |

`internal_project_fte` stays **permanent-only** in every use, exactly as PR1 defined it. Do not reintroduce a contractor term into it.

**Fixture 8.C exists to police this**: it is 8.A with six contractors, and every rated figure must be identical to 8.A's. If any moves, a routing rule has leaked.

### 3.3 Loaded cost per head (spec §3.3)

```
employer_ni = 0.15 × max(0, ashe_median − 5000)
overhead    = 0.25 × ashe_median
loaded_cost_per_head = ashe_median + employer_ni + overhead
```

**The NI figures are verified** for 2026/27 — 15%, Secondary Threshold £96/week, £417/month, **£5,000/year**, from gov.uk's rates-and-thresholds page for 2026 to 2027, checked 4 September. £5,000 is gov.uk's own annual figure, not an annualisation. Cite the page and state the tax year.

**The ASHE figure is yours to fetch, and you are better placed than this brief to do it** — you can download and parse the spreadsheet; I could not. Take the median gross annual pay for full-time employees in SOC 2020 minor group **213, Information technology and telecommunications professionals**, UK, from the latest ASHE release. If ONS publishes only 2-digit or 4-digit granularity for that measure, use the closest published level that covers IT professionals and **state on the page exactly which grouping and which ASHE release**. Do not average across groupings, and do not substitute another source. **Report the figure, the grouping and the release year before hard-coding it.** If you cannot reach it, stop and ask.

ONS data is Open Government Licence — include the required attribution.

**Display all three components and the total.** Label the 25% overhead as ProjexaR's judgement, the NI rate and the salary as sourced.

**One blended figure for PMs and BAU staff alike.** Do not split it by role.

**Editable, with the sourced default pre-filled.** The edited value must flow into the PDF and the shared result URL, and the page must state which value the figures use. A forwarded report showing the finance director different numbers from the ones the respondent saw is worse than having no edit control.

**Copy-rule note.** The control's label and helper text are input furniture, where hedging is permitted; the figures it produces are output, where it is not. Do not let "estimated" reach a computed figure.

### 3.4 Full cost, gated (spec §3.1)

```
internal_effort_cost(e) = internal_project_fte(e) × loaded_cost_per_head
```

Then branch on the existing budgets input:

| Budgets input | Behaviour |
|---|---|
| **Explicitly** out-the-door | `full_portfolio_cost(e) = internal_effort_cost(e) + reported_spend`. Full cost is the hero tile. `reported_share(e) = reported_spend ÷ full_portfolio_cost(e)`. |
| Any other value | **Do not sum.** Show `internal_effort_cost` alone. Growth ceiling stays hero. Finding 4 returns Healthy. |

Only an explicit out-the-door answer takes the summing path. Treating an ambiguous answer as out-the-door bends toward the larger number.

**Gating: the full-cost tile renders before the email gate**, like every other tile. No blur, no partial reveal, no "sign up to see the full figure". It is the most forwardable number the tool produces and that is the whole reason it was promoted.

**Suppression:** where `bau_staff_on_projects = 0` or no band is selected, the full-cost calculation is suppressed along with the BAU tile — spec §1.1.

### 3.5 Hero tile naming and framing (spec §3.4)

Label: **The full cost of your portfolio.** Not "true cost". Do not describe the internal figure as "invisible".

Framing, in substance: the reported figure is what the project budgets record; the people doing the work cost a further £X–£Y, and that sits in the staff budget rather than the project budget. The point is **attribution, not hidden money** — a finance director knows exactly what the payroll costs, and "invisible" invites them to dismiss the tool in one sentence.

Add a plain "what this excludes" line naming contractors and any staff who work on projects with no BAU role.

The growth ceiling drops to a secondary tile.

**No ROI, breakeven or payback framing anywhere near this figure**, and no sentence comparing ProjexaR's price to a saving or a recovered cost. Spec §0 constraint 3 applies with full force here — completing the argument is the temptation this release exists to resist.

### 3.6 Ticket divisor and the run-work check (spec §3.6)

Replace the single 480 with a **range**: `tickets ÷ 320` to `tickets ÷ 170`.

State the anchors on the workings page: HDI/MetricNet (Rumburg, *Metric of the Month: Tickets per Technician per Month*) reports desktop support industry averages of 87–133 per technician per month, range 30–198; Jitbit's 480 is the upper anchor. **The 170–320 window is ProjexaR's control, set between two published figures, and must be described as such.**

**[UNVERIFIED — spec §11]** Do not repeat this document's characterisation of Jitbit's 480 as describing "high-throughput remote tier-1 operation". That was inferred from its magnitude, never checked. Either confirm what population Jitbit's figure describes, or cite the number without characterising it.

**The run-work check.** Frame it as composition, not deficiency — 27–29 FTE of non-ticket run work in a 45-person department is entirely normal, and a finding implying otherwise reads as naive to the audience. Give both readings: either ticket logging is incomplete, or BAU there is not ticket-shaped (infrastructure, incident, vendor, compliance). Close on what matters: it is the same population the projects draw from. Per §2.2, compute the gap from the displayed FTE figures.

### 3.7 Findings restructure (spec §3.8)

**Exactly four findings, each Healthy-capable.**

| # | Finding | Healthy | Watch | At risk |
|---|---|---|---|---|
| 1 | Effective BAU capacity spread across the live portfolio | BAU tile Healthy | BAU tile Watch | BAU tile At risk |
| 2 | No single current view of demand and availability | none of the three adverse conditions | one or two | all three |
| 3 | Line-manager commitments agreed against a lagging picture | who-on-what current | who-on-what stale | — |
| 4 | Project budgets carry out-the-door spend only | budgets carry internal staff time | budgets out-the-door | — |

The three adverse conditions in finding 2 are a non-PPM toolset, a manual view, and a stale who-on-what picture. **This is where the toolset signal lives** after PR1 removed the escalation — as a mechanism inside a finding. Finding 2 absorbs the old fragmented-tooling, manual-reconciliation and stale-picture findings; preserve their nuance as detail inside it.

Finding 1 **takes its state directly from the BAU tile and never recomputes it**. Finding 4 never reaches At risk — it describes a reporting practice, not a capacity state, and the hero tile carries that weight.

**Checks on your answers — a separate block**, placed after the findings and before the numbers section.

| Check | Behaviour |
|---|---|
| Corroboration | Healthy / note / Watch, per PR1's asymmetric rule. **Move it out of its PR1 interim home in the findings list.** |
| Run-work composition | Stated, no state. An observation about composition, not a rating. |

Give the block a heading that says what it is. It is the clearest demonstration in the report that the tool is doing something a spreadsheet cannot; do not bury it as a footnote.

**Source orphan check.** Consolidating seven findings into four may strand Panko or the Microsoft first-party source. Every retained source must still attach to a surviving finding or be removed from the sources page. Name in the PR description any source that moved.

### 3.8 Pricing (spec §3.7)

| | Old | New |
|---|---|---|
| Workings | `(25 × £10 × 12) ÷ 367,000` | `(25 × £10 × 10) ÷ 367,000` |
| Share of reported spend | 0.82% | **0.68%** |

- State the basis: annual plan paid upfront.
- Name the discount on the conversion panel — "annual plan, two months free" — so a reader multiplying £250 by twelve does not find an unexplained gap. The live pricing page already uses that wording, so this matches without further change.
- Express the share against full portfolio cost **as a range**: 0.21%–0.23% in fixture 8.A. Never a midpoint.
- Contractors are not licensed. The basis is BAU staff + PMs.

---

## 4. Fixtures

All fixtures **pin the loaded cost at £65,000**, whatever the production ASHE default turns out to be. A fixture that moves when ONS republishes is not a fixture.

### 8.A — The strained department

**Inputs:** headcount 1,200 · IT staff 45 · PMs 5 · live 45 · annual 75 · spend £367,000 · BAU on projects 20 · band **31–40%** · tickets 960 · run share 72% · contractors 0 · tools mixed · view manual · budgets **out-the-door** · who-on-what stale.

| Figure | Expected |
|---|---|
| `bau_effective_fte` | **6.2 – 8.0** |
| `internal_project_fte` | **11.2 – 13.0** |
| Concurrent projects per PM | **9.0** → At risk |
| Live projects per effective BAU FTE | **5.6 – 7.3**, rated on 7.3 → **Watch** (both endpoints Watch) |
| PM route thresholds | live **36**, annual **59** |
| BAU route thresholds | live **63 / 81**, annual **104 / 134** |
| Sustainable annual pace | **58** at both endpoints; binding route PM |
| Growth ceiling | **−17** → *"You are running 17 projects a year above your sustainable pace."* |
| Derived run share | **71.1% – 75.1%**; stated 72% → corroboration **Healthy** |
| Ticket FTE | **3.0 – 5.6** |
| Run work reported | **32.4 FTE**; gap **26.8 – 29.4** |
| Internal effort cost | **£728,000 – £845,000** |
| Full portfolio cost | **£1.10m – £1.21m** *(the epsilon case — see §2.3)* |
| Reported share of full cost | **30.3% – 33.5%** |
| ProjexaR | **£2,500/yr**, **0.68%** of reported spend, **0.21% – 0.23%** of full cost |
| Findings | 1 Watch · 2 At risk · 3 Watch · 4 Watch |
| Checks | corroboration Healthy · run-work stated |
| Hero | Full cost |

### 8.B — The well-run department

**Inputs:** headcount 600 · IT staff 24 · PMs 4 · live 16 · annual 24 · spend £180,000 · BAU on projects 10 · band **61–70%** · tickets 1,400 · run share 56% · contractors 0 · single PPM tool · view not manual · who-on-what current · budgets **carry internal staff time**.

| Figure | Expected |
|---|---|
| `bau_effective_fte` | **6.1 – 7.0** |
| `internal_project_fte` | **10.1 – 11.0** |
| Concurrent projects per PM | **4.0** → Healthy |
| Live projects per effective BAU FTE | **2.3 – 2.6** → Healthy |
| Sustainable annual pace | **42**; binding route PM |
| Growth ceiling | **+18**, positive headroom in prose |
| Derived run share | **54.2% – 57.9%**; stated 56% → **Healthy** |
| Ticket FTE | **4.4 – 8.2**; run work **13.4**; gap **5.2 – 9.0** *(§2.2 — from displayed values, not 9.1)* |
| Internal effort cost | **£656,000 – £715,000**, shown alone — **not summed** |
| Hero | Growth ceiling |
| Findings | **all four Healthy** |
| Checks | corroboration Healthy |
| ProjexaR | 14 resources → **£1,400/yr** |

**Assertions:** both tiles Healthy · all four findings Healthy · corroboration Healthy · **no At risk anywhere** · the non-summing path taken.

If 8.B cannot return all-Healthy, the third state has not landed and the bands need **re-examining, not softening**.

### 8.C — Contractors must move nothing rated

**Inputs:** 8.A exactly, with **contractors = 6**.

| Figure | Expected |
|---|---|
| Every rated figure, every threshold, every cost figure, the ceiling, the licence count | **Identical to 8.A** |
| New: unrated companion beside the BAU tile | **3.2 – 3.7** projects per delivery FTE including contractors |

Any divergence from 8.A means a routing rule has leaked.

---

## 5. New shapes required

Band straddling a rating boundary, asserting "Watch to At risk" and that the rating uses the less favourable endpoint · budgets carrying internal staff time (non-summing path, hero swap, finding 4 Healthy) · `contractor_fte > 0` per 8.C · an edited loaded cost flowing into both the PDF and the share URL · the full-cost tile rendering before the email gate · the full-cost suppression row from §1.1 · all three corroboration outcomes in their new home · a legacy free-text-percentage URL decoding to a band · the §2.2 displayed-difference rule at a case where raw and displayed arithmetic disagree, using 8.B's 9.0-not-9.1.

Carry forward every PR1 shape, including the boundary ratios and the toolset-invariance assertion.

---

## 6. Sender — no changes

No new fields, no Worker change, no new custom fields. `rag_pm` and `rag_bau` carry Healthy / Watch / At risk as now, computed from the **less favourable endpoint** of their range — so a given respondent's RAG value may differ from what PR1 would have produced, which is expected. `headroom` stays a signed integer, unclamped, never a segment filter. The `Flag Understated Project Costs` group continues to be driven by the same budgets input.

Posting the full-cost figure to Sender is a separate, later change. Do not anticipate it.

---

## 7. Diff report

Same discipline as PR1, which worked.

- **Every numeric output in the fixture set asserted against the expected value in §4**, computed from the formulas here rather than read back from the implementation. A number that differs is a failure, never a category.
- **Only text differences categorised**, into expected copy change and unexpected.
- Keep the oracle independent. Reimplementing the formulas rather than reading them off the page is what makes the suite worth anything, and it is why PR1's three pluralisation bugs were caught.

---

## 8. Acceptance criteria

- [ ] Every band-dependent figure displays as a range; no midpoint appears anywhere.
- [ ] Ratings use the less favourable endpoint, and a straddling range displays both states.
- [ ] Every published difference is computed from displayed values (§2.2); 8.B's gap reads 9.0.
- [ ] Full portfolio cost reads **£1.10m – £1.21m** on 8.A, not £1.09m (§2.3).
- [ ] Full cost is the hero when budgets are explicitly out-the-door; every other answer takes the non-summing path.
- [ ] The full-cost tile renders before the email gate, unobscured.
- [ ] The loaded cost is sourced, decomposed, editable, and flows into the PDF and the share URL; the ASHE grouping and release year are stated on the page.
- [ ] Contractors are routed per all six rules; 8.C is identical to 8.A on every rated figure.
- [ ] Findings number **exactly four**, each returns Healthy on 8.B, and no two imply the same action.
- [ ] The checks block carries corroboration and run-work composition; corroboration has left the findings list.
- [ ] ProjexaR's share reads 0.68% of reported spend and 0.21%–0.23% of full cost.
- [ ] No ROI, breakeven, payback or "pays for itself" framing anywhere.
- [ ] The copy-rule check passes; no hedging word reaches a computed figure.
- [ ] Every PR1 assertion still passes, including the boundary ratios and toolset invariance.
- [ ] No number renders as `NaN`, `Infinity` or an unexplained blank.
- [ ] No PR3 item implemented.

---

## 9. PR description must contain

1. The ASHE figure, the exact SOC grouping used, and the release year — before it is treated as settled.
2. Confirmation that every fixture number matched its independently computed expected value.
3. All three fixtures' actual output, so the figures can be read against §4 without running anything.
4. Any source that moved during the orphan check.
5. Whether the Jitbit characterisation was confirmed or the description dropped.
6. Whether legacy URL decoding was implemented or dropped.
7. The Healthy count across the shape set — reported, not tuned toward.
8. Anything you stopped and asked about, and what was decided.
