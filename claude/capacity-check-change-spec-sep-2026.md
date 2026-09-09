# Capacity Check — Change Specification for Claude Code

**Status: FINAL — revision 2, 4 September 2026. No open decisions.**

Revision 2 answers an independent review of revision 1. Nine items were raised; all nine are actioned. Two reversed earlier instructions: §2.3/§2.5 (the rounding rule reintroduced the contradiction it was written to remove) and §4.2 (the IT-share metric is retained, not removed — the earlier premise was wrong). §2.11 has been rewritten against the published paper. §11 is new and records what has been verified and what has not.

**Repo:** `sinbad0709/projexar` · working copy `~/Desktop/ProjexaR/projexar`
**Target:** the single self-contained Capacity Check HTML file
**Date:** 4 September 2026
**Supersedes:** *Capacity Check — Remediation Brief for the Methodology Session* (3 Sep 2026). Where this document and the brief differ, this document wins. Every difference is marked **[CHANGED FROM BRIEF]** or **[DECIDED]** with the reason.

Ship as **three sequenced PRs**. Each is internally consistent and mergeable on its own. Do not begin a PR before the previous one is merged.

Every open item from the brief has been settled — see §10. **Do not reopen a decision in §10, and do not substitute your own judgement for a figure marked [DECIDED].** Where this document tells you to stop and ask, stop and ask.

---

## 0. Standing constraints — do not break any of these

1. No competitor citations, ever. Runn and Resource Guru specifically.
2. No aggregator or content-marketing sources. Approved: Panko (Hawaii), Microsoft first-party, Flexera 2023 Tech Spend Pulse, Jitbit, HDI/MetricNet, ProjexaR's own July 2026 analysis, plus the two additions in §6.
3. No ROI, breakeven or payback calculation, and no "pays for itself" framing anywhere. Spend expresses cost as a share of budget and nothing else. This applies with full force to the new cost figures in PR2 — the temptation to complete the argument is exactly what must be resisted.
4. No claim that the product tracks actual hours. It holds planned commitment.
5. Hedging language appears in **inputs only** ("estimated", "your best estimate"). Never in outputs. See §5.
6. Where a banded answer is used, both endpoints are carried through to the output. Never a midpoint. This includes percentages derived from banded figures.
7. `headroom` is never a segmentation filter.
8. **The PM-tile toolset escalation is removed in this release.** See §2.4. The constraint it used to carry — that it must not affect the growth ceiling or the `rag_pm` value sent to Sender — is satisfied by removal. No toolset input may influence any rating anywhere after PR1.
9. Single self-contained HTML file. No dependencies, no build step. All styling via CSS custom properties in one `:root` block.
10. Text output stays byte-identical unless the change is deliberately to copy. This release changes copy extensively — see §7 for how to report that.

---

## 1. Named quantities — single source of truth

Three defects in the brief came from one quantity carrying two meanings. Define these once, near the top of the calculation block, and use them by name everywhere. Do not introduce a fourth FTE quantity.

| Name | Definition | Used by |
|---|---|---|
| `bau_effective_fte_lo` / `_hi` | `bau_staff_on_projects × band_lo` / `× band_hi` | BAU tile, growth ceiling |
| `internal_project_fte_lo` / `_hi` | `pm_count + bau_effective_fte_*` — **permanent staff only, contractors excluded** | Corroboration check, full-cost calculation |
| `contractor_fte` | the new contractor input, integer ≥ 0 | Displayed figures and exclusions only — see §3.2 |

**[CHANGED FROM BRIEF]** §2.3 of the brief put contractors inside `internal project FTE` while §2.9 required them excluded from the run/change derivation, which §2.4 builds on that same quantity. The fixture sets contractors to 0, so the contradiction passes the test suite and fails in production. `internal_project_fte` is permanent-only in all uses.

### 1.1 Suppression and divide-by-zero rules

**[NEW]** The brief specified no behaviour for empty or zero inputs, and several new formulas divide by a respondent-supplied figure. Nothing may render as `NaN`, `Infinity`, `£NaN`, `0.0` standing in for "not computed", or a blank tile with no explanation. Where a figure cannot be computed, suppress it and say on the workings page that it was not computed and why.

| Condition | Behaviour |
|---|---|
| `pm_count = 0` | Suppress the PM tile and the PM route of the growth ceiling. The BAU route binds alone. |
| `bau_staff_on_projects = 0`, or no band selected | Suppress the BAU tile, the BAU route, `bau_effective_fte`, the full-cost calculation and the corroboration check. `internal_project_fte = pm_count`. |
| `live_projects = 0` | `headroom` blank, as now. Typical project duration not computed. |
| `annual_projects = 0` | `turnover` undefined. Suppress the annual-pace thresholds and the growth ceiling. |
| `it_staff = 0` | Suppress the corroboration check. |
| Both ceiling routes suppressed | No growth ceiling. The hero tile falls back to full cost where §3.1 allows it; otherwise the report runs without a hero tile. |

Add one render-suite shape per row.

---

## 2. PR1 — Bands, thresholds, negative headroom, copy, sources

The whole of PR1 ships together. Splitting it reintroduces the contradiction the release exists to fix.

### 2.1 Concurrent projects per PM — new bands

`pm_concurrent = live_projects ÷ pm_count`

| State | Condition |
|---|---|
| Healthy | `r ≤ 5.0` |
| Watch | `r > 5.0 and r ≤ 7.0` |
| At risk | `r > 7.0` |

Retires the uncited 8–12 convention everywhere it appears.

### 2.2 Live projects per effective BAU FTE — close the band gap

**[CHANGED FROM BRIEF]** The brief specified explicit operators for the PM tile only. The BAU tile keeps the same defect: under "green ≤5, amber 6–10" the fixture's own 5.6 endpoint is unrated. Apply the same treatment.

| State | Condition |
|---|---|
| Healthy | `r ≤ 5.0` |
| Watch | `r > 5.0 and r ≤ 10.0` |
| At risk | `r > 10.0` |

No existing integer rating changes.

### 2.3 Rounding rule — one rounded quantity, and every published figure derived from it

**[REVISED — the first version of this rule reintroduced the fault it was written to remove.]** Compute the rating from the **rounded, displayed** figure, not the raw float. A raw 5.04 displayed as 5.0 and rated Watch against a published "Healthy ≤ 5.0" band is exactly the fault this release exists to correct. Round to 1 dp, display, then band. Apply to both tiles and to both endpoints of every range.

**The trap.** Rating on the rounded value while deriving the published red *threshold* from the raw multiplication makes the two disagree at the boundary. Worked case: 25 PMs, 176 live projects. The ratio is 7.04, displays as 7.0, rates Watch. A threshold published as `7 × 25 + 1` = 176 says the respondent is already red. Tile and workings contradict each other on the same page — §9.1.

**The fix.** Derive the threshold from the same rounded quantity. The red threshold is the first live-project count whose *rounded* ratio exceeds the cap:

```
round1(x)            = Math.round(x * 10 + 1e-9) / 10        // x ≥ 0
red_threshold(cap,d) = Math.ceil((cap + 0.05) * d − 1e-9)
```

`d` is the divisor — `pm_count` for the PM route, `bau_effective_fte(endpoint)` for the BAU route. The `+0.05` is what makes it agree with `round1`: a ratio rounds up to the next tenth at exactly `cap + 0.05`.

Checks, all of which must hold: 25 PMs → threshold **177**, and 176 → 7.0 Watch, 177 → 7.1 At risk. 5 PMs → **36**. `bau_effective_fte` 6.2 → **63**; 8.0 → **81**.

**On the epsilons. [CORRECTED 4 Sep — the original justification was fabricated and did not survive testing.]** This document claimed `Math.round(7.05 * 10)` returns 70. It does not: in V8, `7.05 * 10` is exactly `70.5` and rounds to 71, and the epsilon changes no result at any of the boundary ratios in the fixture set. The claim was asserted without being run.

Keep both epsilons anyway, for the reason that is actually true: `(cap + 0.05) * d` can land a hair above an integer for divisors not in the fixture set, and a bare `Math.ceil` would then publish a threshold one too high. They are cheap defensive code guarding a case we have not enumerated — not a fix for a demonstrated bug. Do not substitute `toFixed` for `round1` in the rating path.

**Required boundary shapes.** Add render-suite shapes at ratios of exactly 5.04, 5.05, 7.04, 7.05, 10.04 and 10.05 — on both tiles, and at both endpoints of a range — asserting that the displayed figure, the rating, and the published threshold agree in every case.

**A figure drawn as a position or a length is a published figure. [ADDED 5 Sep, from PR5.]** The band track's marker is the ratio rendered geometrically, so it obeys this rule exactly as the printed number does: **compute the geometry from the displayed value, never the raw float.** A marker placed at 42.08% beside a figure printed as 5.1, which belongs at 42.5%, is a rating contradicted by its own workings in visual form. CC found this by mutation-testing its own assertions rather than by being told, and it is the reason mutation testing earns its place — an assertion nobody has seen fail is not yet known to work.

**When a new element may be stripped from a like-for-like diff. [ADDED 5 Sep.]** PR5's band track put four threshold labels on screen, which made every shape read as a numeric change and destroyed the empty-diff invariant the PR was verified against. Stripping the new subtree and comparing the remainder is the correct method — but only under one condition, which must hold every time this technique is used: **the stripped subtree is independently pinned by value, assertion by assertion.** Otherwise "strip the new thing and the diff is empty" becomes a way of verifying nothing at all.

### 2.4 Toolset escalation — remove it

**[DECIDED — this reverses a rule previously treated as fixed.]** The PM tile currently escalates Watch → At risk on a non-PPM toolset. Remove the escalation entirely.

The rule was designed when the Watch band meant 9–12 concurrent projects per PM — a genuinely unusual caseload. Under §2.1 the Watch band is 5.0–7.0, which is an ordinary caseload, so the rule would fire across a far larger and more normal population. And its trigger is that the respondent does not run a PPM tool, which is what ProjexaR sells. That is the scoring layer bending toward a desired outcome, which is the one principle this release exists to enforce.

Required behaviour after removal:

- `rag_pm` is the band value from §2.1 and nothing else. No adjustment, anywhere.
- **No toolset input may influence any rating.** Add a render-suite shape that varies the toolset input across all its values with every other input held constant, and asserts that both tile ratings, the growth ceiling, every published figure and both Sender RAG values are identical across the set.
- Nothing is lost between PRs. The toolset signal already drives one of the seven existing findings, which continues to fire until PR2 merges it into finding 2 per §3.8.
- Remove any tile or workings copy that described or hinted at the escalation.

### 2.5 Dependent threshold recalculations

**[REVISED per §2.3.]** The thresholds are no longer a raw multiplication. Every published threshold comes from `red_threshold(cap, d)`.

```
pm_red_live       = red_threshold(7.0,  pm_count)
bau_red_live(e)   = red_threshold(10.0, bau_effective_fte(e))

pm_red_annual     = floor((pm_red_live  − 1) × turnover) + 1
bau_red_annual(e) = floor((bau_red_live(e) − 1) × turnover) + 1
```

| Figure | Old | New |
|---|---|---|
| Red threshold, live projects (PM route) | `12 × PMs, +1` | `red_threshold(7.0, PMs)` |
| Red threshold, annual pace (PM route) | `12 × PMs × turnover, floor, +1` | as above, via the rounded live threshold |

`turnover = annual_projects ÷ live_projects`, retained internally. It is no longer displayed — see §4.1.

Every figure in the §8 fixture is unchanged by this revision. If any of them moves, the implementation is wrong.

### 2.6 Growth ceiling — endpoint rule and binding route

**[NEW]** The brief did not say what happens when the binding route differs between band endpoints. Specify it:

```
sustainable_annual(e) = min( pm_red_annual − 1, bau_red_annual(e) − 1 )     // per §2.5
headroom(e)           = sustainable_annual(e) − annual_projects
```

Compute at both endpoints. If both endpoints yield the same value, display a single number. If they differ, display the range. Name the binding route; if it differs between endpoints, say so in prose rather than naming one.

The BAU route uses `bau_effective_fte`, the same divisor as the rated tile. It must never use a contractor-inclusive figure — a ceiling derived from a divisor other than the one the tile publishes is a self-contradiction.

### 2.7 Negative headroom — the highest-risk path in this release

`headroom` may now be negative. Required behaviour:

- **Negative:** render in prose only — `"You are running 17 projects a year above your sustainable pace."` No minus sign, no negative number, never zero.
- **Singular and plural.** `"You are running 1 projects a year"` must not be possible. This applies **anywhere a computed integer is rendered into prose**, not only here: projects, project managers, contractors, months. Write one pluralisation helper and route every such string through it; add a render-suite shape for each site at a value of exactly 1.
- **Zero:** you are exactly at the limit. This is now the *only* meaning of zero.
- **Blank:** nothing live. Unchanged.
- **Do not clamp at zero.** Clamping destroys the disambiguation this path buys and silently restores the old ambiguity.

### 2.8 Findings engine — use the vocabulary that already exists

**[CHANGED FROM BRIEF]** The brief proposed a new state called GOOD. Do not invent one. The tool already carries a three-word vocabulary in the tiles and in the Sender `rag_pm` / `rag_bau` fields: **Healthy / Watch / At risk**. The findings engine uses only two of them. Add **Healthy** and use the same word, same casing, same styling token as the tiles.

Explicitly rejected: widening tolerances so borderline cases fall into a gentler category. That produces more Watch, not more Healthy, and is the same fault as tightening thresholds to create alarm.

### 2.9 Corroboration check — asymmetric, and here is why

```
derived_change_share(endpoint) = internal_project_fte(endpoint) ÷ it_staff
derived_run_share(endpoint)    = 1 − derived_change_share(endpoint)
```

Compare `stated_run_share` against the derived **range**, tolerance **±3 percentage points on the endpoints**.

**[CHANGED FROM BRIEF — read this before implementing.]** The derivation counts only PMs and BAU-staff-on-projects as change effort. Any department with delivery staff who hold no BAU role is invisible to it, so `derived_change_share` is systematically understated for exactly those departments. A symmetric divergence test would publish a confident wrong finding — the fault class this release exists to remove. The check is therefore asymmetric:

| Condition | Result |
|---|---|
| `stated_run` within `[derived_run_lo − 3, derived_run_hi + 3]` | **Healthy.** Two independently supplied answers corroborate. |
| `stated_run > derived_run_hi + 3` | **Note, not a fault.** The tool derives less change effort than stated. Expected where projects are delivered by staff with no BAU role, whom the tool does not count. Say so plainly; do not rate it. |
| `stated_run < derived_run_lo − 3` | **Watch.** The tool derives more change effort than stated. Name which input to revisit and which figures depend on it. |

Do not add an input for project-dedicated staff in this release. Decided.

**Where this check lives in PR1. [REVISED]** §3.8 creates the checks block, and that is PR2 work — but this check ships in PR1, and §9.2 requires PR1 to produce a Healthy rating. Give it an interim home: in PR1 the corroboration check is added as an additional finding in the existing findings list, Healthy-capable, using the §2.8 vocabulary. PR2 then moves it out of the list and into the checks block. Without the interim home PR1 has no Healthy rating available anywhere and cannot pass its own acceptance criteria.

### 2.10 Copy and methodology rewrites

1. Retire the 8–12 convention everywhere — tile body, findings, methodology, sources, PDF.
2. Rewrite the concurrent-projects tile body. It currently explains that the caseload sits *inside* an acceptable ceiling while showing a red badge. Rating and explanation now agree; rewrite to say so rather than patching.
3. Rewrite the growth-ceiling tile for both the positive and negative cases.
4. Update "What this does not account for": the blended-average paragraph is rewritten in PR2, so leave a clean seam.
5. New methodology statement on the bands — see §2.11. Reproduce it verbatim in substance.

### 2.11 The bands statement — verified against the paper

**[REWRITTEN 4 Sep against the published open-access version.]** Every figure below has been read in the paper itself, not in an abstract or a summary: Colicev, Hakkarainen & Pedersen (2023), CC-BY, published version at `https://openaccess.city.ac.uk/id/eprint/31695/`. What the paper says, verbatim where it matters:

- Turning point and interval: *"the turning point (5.16) falls within the data range for MPW [1,12] with Fieller's (1954) confidence interval [3.57; 6.19]"* — **confirmed**. The closing sentence of the statement below stands.
- Setting: a *"world-leading hydraulic pump manufacturer with around 20,000 employees in more than 50 countries"*; *"20 months of data on NPD projects (January 2015 to August 2016)"*; 42 projects, 580 employees, 9,649 observations — **all confirmed**. "A single manufacturer" and "over twenty months" are accurate, and are not in tension with the company also being multinational.
- Sample composition: **this section has now been wrong twice, in opposite directions.** Revision 1 claimed the sample was "a mixed population that includes project managers". Revision 2 reversed that, claiming the paper does not identify project managers within its sample. Revision 2 was the wrong correction. Section 4.2 says: *"From the detailed job-description file, we observed whether each employee had a senior role (e.g., senior product developer), managerial responsibilities (e.g., project manager), or belonged to the project's leadership (e.g., project leader)."* Managerial responsibility is a coded variable in the sample. Revision 1 was closer.
- **And then this document got the manager result wrong too. [CORRECTED 4 Sep, verified twice.]** An earlier draft read *"we do not find this pattern for managers (−.507, p = .324)"* as meaning the inverted-U fails among managers. It does not. That coefficient sits in §4.2 under *Preliminary Empirical Considerations*, in a regression whose **dependent variable is MPW, not performance** (Table S2), in a passage checking how the company allocated people to projects. *"This pattern"* refers back to MPW being lower for more senior employees. The finding is that **managers were not allocated a significantly different number of concurrent projects** — nothing about the shape of the performance curve.
- **Table 2, the main performance model, carries no managerial-responsibility term at all.** Its three moderators are specialized experience, project similarity and employee familiarity.
- **[UNVERIFIED — CC to confirm in the paper]** Table S10 appears to test employee age and leadership role as additional moderators of MPW's benefit, reporting *"none of these factors seem to matter as additional moderators."* If that holds, the page may say the paper looked and found no difference — which is *better* for ProjexaR than silence. Until it is confirmed, **do not assert that the paper does not test it**: that is an asserted absence, the exact failure this document has now committed three times.

Use this statement:

> These bands are ProjexaR's management controls. They are informed by published research but are not values the research establishes.
>
> The evidence comes from a longitudinal study of 9,649 project-month-employee observations across 42 projects and 580 employees at a single manufacturer, over twenty months. It finds an inverted-U relationship between the number of concurrent projects a person carries and how well those projects perform, with a point estimate of 5.16 concurrent projects and a confidence interval of 3.57 to 6.19.
>
> Three things follow, and we state all three. The study covers new-product-development engineering, and a portfolio of IT change projects is a different setting. Managerial responsibility appears in it only as a check on how people were allocated to projects — it plays no part in the model that produces the inverted-U — so applying this number to project management caseload is our step, not the paper's. And our red threshold of 7.0 sits *above* the top of that confidence interval, deliberately: we would rather understate the problem than manufacture one.

All three closing sentences are load-bearing and none may be trimmed for length. The second is the one that was missing until 4 September and it is the most important of the three: it is the honest limit of the evidence, and a reader who checks the paper will find it. Better we state it than they discover it.

"A point estimate of 5.16" rather than "an estimated turning point" — the earlier wording would have failed the §5 copy check on `estimated`. See §5 for how that rule interacts with the methodology page.

**Do not publish anything else about this paper without reading it first.** It is open access and one download away, which removes any excuse for characterising it from a summary — which is how the previous version of this section went wrong.

### 2.12 Sources page

**Remove:** the informal 8–12 concurrent-projects convention.

**Add:**

- Colicev, A., Hakkarainen, T. & Pedersen, T. (2023). Multi-project work and project performance: Friends or foes? *Strategic Management Journal*, 44(2), 610–636. DOI 10.1002/smj.3443. **Verified against the published open-access version.** Note for anyone reconciling this against the internal research deck: the deck's initials (J. Hakkarainen, C. Pedersen) are wrong. Use these.
- Zika-Viktorsson, A., Sundström, P. & Engwall, M. (2006). Project overload: An exploratory study of work and management in multi-project settings. *International Journal of Project Management*, 24(5), 385–394.
  Three cautions. The first author's surname appears as both *Zika-Viktorsson* (publisher record) and *Zika-Wiktorsson* (the co-author's own institutional list) — use the publisher spelling. **The volume, issue and page numbers above come from a co-author's institutional publication list, not the publisher record — confirm them before publishing.** And the sample details asserted in the brief (392 project workers, nine Swedish companies, approximately one third experiencing overload) are **not confirmed**. Cite this paper as supporting context for the overload mechanism only. Do not publish any figure from it unless you have verified that figure against the paper itself.

**Retain:** Flexera 2023 Tech Spend Pulse with its existing caveats intact.

**Do not cite:** Bendoly, Swink & Simpson (2014) and Delisle (2026). The research deck describes both by subject matter only, without titles or publication details, and the second carries a current-year date. The two studies above carry the argument on their own.

**Check for orphans.** §3.8 consolidates seven findings into four plus a checks block. Panko and the Microsoft first-party source are attached to findings that may be among those merged. After consolidation, every retained source must still be attached to a surviving finding, or be removed from the sources page. Report which sources moved.

---

## 3. PR2 — Full cost, contractors, pricing

### 3.1 The full-cost calculation — gated

**[CHANGED FROM BRIEF — this is the most important correction in the document.]** The brief sums internal cost onto reported project spend unconditionally. The tool already asks whether project budgets are out-the-door or carry internal staff time — it is the input that populates the `Flag Understated Project Costs` Sender group. Summing regardless double-counts for every respondent whose budgets already carry internal time, and puts a wrong number in the hero tile.

```
internal_effort_cost(endpoint) = internal_project_fte(endpoint) × loaded_cost_per_head
```

Then branch on the budgets input:

| Budgets input | Behaviour |
|---|---|
| Explicitly out-the-door | `full_portfolio_cost = internal_effort_cost + reported_spend`. Full cost becomes the hero tile. `reported_share = reported_spend ÷ full_portfolio_cost`. |
| Any other value | **Do not sum.** Show `internal_effort_cost` as its own figure. Growth ceiling remains the hero tile. Finding 4 changes state accordingly. |

Only an explicit out-the-door answer takes the summing path. Treating an ambiguous answer as out-the-door bends toward the larger number.

**Gating. [DECIDED]** The full-cost tile renders **before the email gate**, like every other tile. The gate stays where it is, on the longer report. This is the most forwardable number the tool produces and the reason the brief promoted it to hero; putting it behind a form defeats the promotion, and a figure that reaches a finance director brings a second, warmer visitor back. Do not add a gate, a blur, a partial reveal or a "sign up to see the full figure" treatment to this tile or to any figure inside it.

### 3.2 Contractors — new input, and a narrowed routing rule

**New field.** *"Contractors and outsourced staff working on projects"* — helper text *"Counted separately from your permanent IT staff."* Integer, default 0.

| Route | Treatment |
|---|---|
| BAU tile ratio and growth ceiling | **Exclude.** These measure how far the portfolio depends on permanent BAU capacity. Contractors do not change BAU capacity. |
| Displayed alongside the BAU tile, where `contractor_fte > 0` | Show unrated: `live_projects ÷ (bau_effective_fte + contractor_fte)`, labelled as delivery capacity including contractors. |
| Full-cost calculation (§3.1) | **Exclude.** Contractor cost is paid out of budget and in the ordinary case is already inside the reported spend figure, so including it double-counts. **[ASSUMPTION, not a verified fact about respondents]** — it is the conservative treatment either way, since the alternative inflates the hero figure. State the exclusion on the workings page in terms of what we exclude, not in terms of what we assume their budget contains. |
| Run/change derivation (§2.9) | **Exclude.** Contractors are not part of the permanent department the stated split describes. |
| IT staff as a share of company | **Exclude**, and say so on the workings page. |
| Licence basis and the ProjexaR quote | **Exclude.** The basis stays BAU staff + PMs. |

**[CHANGED FROM BRIEF]** The brief's "include at 100% in effective project capacity" is narrowed to a displayed, unrated figure, and its "include at contractor day rate if collected" in the cost calculation is replaced by a flat exclusion. No contractor day-rate question is added. The routing table gains a sixth row the brief omitted: the licence basis.

### 3.3 Loaded cost per head — sourced, decomposed, editable

```
employer_ni = 0.15 × max(0, ashe_median − 5000)      // 2026/27 secondary rate and threshold — verified, see below
overhead    = 0.25 × ashe_median                      // ProjexaR control, declared as such
loaded_cost_per_head = ashe_median + employer_ni + overhead
```

- `ashe_median`: **£56,348** — ONS Annual Survey of Hours and Earnings, SOC 2020 minor group 213 *Information Technology Professionals*, UK, full-time, median gross annual pay, ASHE 2025 provisional (released 23 October 2025). CV 1.5% on 875,000 jobs. **[CORRECTED 4 Sep]** This entry previously named **Table 2**, which was wrong: Table 2 stops at two-digit sub-major group 21 (£52,297), which sweeps in every science and engineering profession. The three-digit minor groups sit in **Table 14**. CC found this and used the grouping the spec asked for, from the table that actually publishes it — the right call, correctly reported.
- **[OUTSTANDING]** Confirm the exact worksheet within Table 14.7a that the figure was read from. The page labels it *full-time*; ASHE publishes all-employees and full-time series side by side, and the all-employees median is depressed by part-time jobs. If the sheet read was all-employees, the figure is understated and, more importantly, the label is wrong.
- Display the year on the page and state that it is the provisional release. ONS data is Open Government Licence — include the attribution.
- **National Insurance — checked 4 Sep 2026 and correct as written.** `https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027` gives, for the 2026 to 2027 tax year, an employer secondary rate of **15%** and a Secondary Threshold of **"£96 per week"**, **"£417 per month"**, **"£5,000 per year"**. The £5,000 is gov.uk's own annual figure, not an annualisation of the weekly rate. Cite the page and state the tax year on the workings page. Re-check at each Budget; if the page no longer shows these figures, stop and ask rather than carrying these forward.
- **[DECIDED]** The overhead uplift is **25%**, covering workspace, equipment, licences, training and management overhead.
- **[DECIDED]** One blended loaded cost applies to PMs and BAU staff alike. Do not split it by role. The band range already carries far more uncertainty than a PM/technical salary split would resolve, and a second rate doubles the explaining the tile has to do.
- Display all three components and the total. Label the 25% overhead uplift explicitly as ProjexaR's judgement, not a sourced figure. Label the NI rate as sourced.
- **Editable by the respondent**, with the sourced default pre-filled.
- The edited value must flow into the PDF and the shared result URL, and the page must state which value the figures use. A forwarded report that shows the finance director different numbers from the ones the respondent saw is worse than no edit control.

### 3.4 The hero tile — naming and framing

**[CHANGED FROM BRIEF]** Do not call it "true cost", and do not call the internal figure "invisible". The figure deliberately excludes contractors and any project-dedicated staff, so "true" over-claims; and a finance director knows exactly what the payroll costs, so "invisible" invites an easy dismissal of the whole tool. The point is **attribution**, not hidden money.

Label: **The full cost of your portfolio.**

Framing, in substance: the reported figure is what the project budgets record; the people doing the work cost a further £X–£Y, and that sits in the staff budget rather than the project budget. Add a plain "what this excludes" line naming contractors and any staff working on projects with no BAU role.

The growth ceiling drops to a secondary tile.

### 3.5 Blended time percentage — band input, range output

**Input.** Replace the free-text percentage with 10-point bands: 1–10, 11–20, 21–30, 31–40, 41–50, 51–60, 61–70, 71–80, 81–90, 91–100.

**Output.** Compute every dependent figure at both endpoints and present a range. Never a midpoint.

**Rating.** Where a range straddles a band boundary, rate on the less favourable endpoint and display both — "Watch to At risk", never the flattering end alone.

**Legacy URLs.** **[REVISED 4 Sep — the reason changed, and with it the weight.]** This was written to protect result links already in prospects' hands. There are none: the product is pre-MVP and pre-launch, and no one outside the team has completed the tool. The only legacy links that can exist are the team's own, from internal runs like the 25 August worked example.

Keep the decode, drop the ceremony. On decode, map value `p` to the band containing it; `p ≥ 91` maps to 91–100; `p ≤ 0` or absent is treated as no answer. A legacy link must render rather than error. It is a few lines of defensive code, not a back-compat feature: **no acceptance criterion, no dedicated render shape.** If it turns out to cost more than that, drop it and say so — an internal link that errors is a shrug, not an incident.

**Copy.** Add an explanation of why a range is shown. It is an argument, not a disclaimer: an average this soft is precisely why actual commitments are needed. Do not bury it. Update "What this does not account for" so the blended-average paragraph references the band and range treatment.

### 3.6 Service desk FTE — two anchors, a declared control, and a range

**[CHANGED FROM BRIEF]** The brief proposed declaring the divisor as bare ProjexaR judgement. That is unnecessary — HDI/MetricNet is already on the approved source list and publishes the figure.

- **Lower anchor, cited:** HDI/MetricNet (Rumburg, *Metric of the Month: Tickets per Technician per Month*) reports desktop support industry averages of 87–133 tickets per technician per month, full range 30–198.
- **Upper anchor. [CORRECTED 4 Sep — and this one was wrong before the remediation started.]** Jitbit publishes **21 tickets per technician per day**, describing roughly 1,000 businesses of every industry on its hosted helpdesk, with no separation of internal IT from customer support and no tier named. Two things follow. The characterisation as "high-throughput remote tier-1" is unsupported and is dropped. And **the 440–525 band with its 480 mid-point that the tool attributed to Jitbit was never published by Jitbit** — it is a day-to-month conversion, presented as a sourced figure. Quote the daily figure as given; attribute the monthly conversion to ProjexaR.
- **[RESOLVED 4 Sep]** The control is stated in both units wherever it is named — 170 to 320 a month, 8.1 to 15.2 a day on a stated 21-working-day month. Each published anchor is quoted only in the unit its own source uses; ProjexaR's control is the only figure appearing in two, because it is the only conversion.
- **And the 480 is gone entirely, not restated.** Chasing the basis showed it cannot survive one: 21 × 21 = 441 and 21 × 23 = 483, so reconstructing 480 needs a 22.9-day month, which is not a basis anyone would state. Printing it beside a stated basis would hand the reader the arithmetic gap the change exists to close. The suite now fails if 480 appears anywhere in output.

**Third standing rule — provenance is not commensurability, and the provenance table cannot tell you the difference.**

The table asks where a number came from. Every number can answer that, including numbers that are being compared to things they may not legitimately be compared to. The Flexera run/grow figure is correctly classified as Cited, correctly attributed, correctly sourced to Figure 17 — and the sentence that publishes it subtracts it from the respondent's own figure and reports the difference in percentage points.

**So a second question must be asked of every published comparison, and the provenance table will not ask it for you:** does this figure measure the same quantity, on a population that includes the reader? Flexera's split is drawn from organisations above 2,000 employees, and it appears in a report about *spend*, while the respondent's figure is a share of people's time in a department that may be a tenth that size. Caveats stated elsewhere on the page do not repair a subtraction made inline — that is the same structural fault as a rating contradicted by its own workings.

Where two figures are not commensurable, publish both and say why they are not, or publish neither. Do not publish the difference.

**Confirmed 4 Sep, from Flexera's own PDF.** Contents, page 25: *"Percentage of budget allocated to running the business vs. growth"*. It is a budget split, and the tool was subtracting it from a people-time split on screen and again in the PDF. Page 9 puts the population at organisations above 2,000 employees, *"with nearly half (46%) exceeding 10,000"* — a sharper mismatch with this tool's audience than the page was stating. The difference is struck from `compute()`, not merely unpublished.

Note what the defect did: on fixture 8.A it published an alarming 5-point gap, on 8.B a flattering 11-point one. It was not biased, it was baseless — which is worse, because a biased number can at least be corrected in a direction.

**The closing audit, and it is a different question from §5.1.** For every published comparison: name both quantities, and show they measure the same thing on a population that includes the reader. The provenance table cannot ask this — every number in it answers "where did you come from" correctly, including the ones being compared to things they should not be. Run it once across the whole tool before the release is called done.

First candidate: **tickets per employee per month**, computed by the tool and shown beside HDI/MetricNet's 0.41–1.38. Confirm both denominators are company employees. If ours divides by IT staff and theirs by total headcount, it is the same defect with the same shape.

**Standing rule arising from this — a unit conversion is authorship.** Wherever a figure is republished in a unit its source did not use, the conversion belongs to us and must be attributed to us, with its basis stated. Quote each source in the unit that source publishes. This is what turned up both Jitbit errors: not the numbers, but the fact that nobody had asked who did the arithmetic.

**Second standing rule — a display-only assumption still gets an invariance shape.** The 21-working-day month changes nothing the report computes, and was documented as "the conservative end", which was both false in direction and impossible for a display-only constant. The claim was caught by asking; it should have been caught by a test.

So: **every stated assumption that is display-only carries a shape asserting exactly that.** Vary the constant across several values and assert the whole compute object, the whole Sender payload and every rendered node that does not name the assumption are identical — *and* that the nodes which do name it still state the basis, so a constant that renders nowhere cannot pass by being invisible. This is the same shape as the toolset-invariance test in §2.4, and the pattern generalises: an assumption nobody asserts is inert can be wired into a computation later by an edit that looks harmless.

Guards written against one bad claim are worth scoping. The suite now fails on `conservative` reaching output, which is right for this release — but the word has a legitimate true use in the §2.11 bands statement, where the red threshold *is* deliberately conservative. If that copy is ever wanted, scope the assertion to the ticket-divisor block rather than widening the copy-rule list; a check that fails on true copy is a check that gets switched off.
- **ProjexaR's control:** a mixed internal queue runs **170–320 tickets per agent per month**. State plainly that this window is ProjexaR's judgement, set between two published figures, and name both.

Express ticket FTE as a **range**: `tickets ÷ 320` to `tickets ÷ 170`. A point estimate from a chosen divisor is exactly the false precision §3.5 exists to remove.

**New finding — the run-work composition.** Surface the difference between reported run-work FTE and ticket-derived FTE. Frame it as composition, not deficiency — 30 FTE of non-ticket run work in a 45-person IT department is entirely normal, and a finding that implies otherwise reads as naive to the audience this tool is written for. Both readings are useful and both should be given: either ticket logging is incomplete, or BAU in that organisation is not ticket-shaped — infrastructure, incident, vendor, compliance. Close on the point that matters: it is the same population the projects draw from.

### 3.7 Pricing arithmetic

Commercial model: £10 per managed resource per month; annual plan paid upfront at twelve months for the price of ten (£100 per resource per year).

The published prices were correct. Only the workings row was wrong.

| | Old | New |
|---|---|---|
| Workings | `(25 × £10 × 12) ÷ 367,000` | `(25 × £10 × 10) ÷ 367,000` |
| Share of reported spend | 0.82% | **0.68%** |

- State the basis explicitly: annual plan paid upfront.
- Name the discount on the conversion panel — "annual plan, two months free" — so a reader multiplying £250 by twelve does not find an unexplained gap.
- Also express the share against full portfolio cost, **as a range** (0.21%–0.23% in the fixture). **[CHANGED FROM BRIEF]** The brief gave a single 0.21%, which breaches the never-a-midpoint rule.

### 3.8 Findings consolidation — four findings, plus a separate checks block

**[CHANGED FROM BRIEF]** The brief proposed six findings: four capacity findings plus corroboration and run-work composition. Those last two are checks on the respondent's own answers, not capacity mechanisms, and listing them alongside the other four mixes two different kinds of thing — which is a quieter version of the padding complaint the consolidation exists to answer. Split them.

Test to apply to the findings list: each finding must name a **distinct mechanism** *and* imply a **distinct action**. Two findings leading to the same action are one finding.

**Findings — exactly four, each Healthy-capable.** This is where the structural third state earns its place. A findings list that can never say anything is fine reads as a sales instrument; these four all have the data to say it.

| # | Finding | Healthy | Watch | At risk |
|---|---|---|---|---|
| 1 | Effective BAU capacity spread across the live portfolio | BAU tile Healthy | BAU tile Watch | BAU tile At risk |
| 2 | No single current view of demand and availability | none of the three adverse conditions | one or two of them | all three |
| 3 | Line-manager commitments agreed against a lagging picture | who-on-what current | who-on-what stale | — |
| 4 | Project budgets carry out-the-door spend only | budgets carry internal staff time | budgets out-the-door | — |

The three adverse conditions in finding 2 are: a non-PPM toolset, a manual view, and a stale who-on-what picture. This is where the toolset signal lives after §2.4 removes the escalation — as a mechanism inside a finding, which is what it always was. Finding 2 also absorbs the fragmented-tooling, manual-reconciliation and stale-picture findings; preserve their nuance as detail inside it, do not lose it.

Finding 1 must take its state directly from the BAU tile, never recompute it. Finding 4 never reaches At risk — it describes a reporting practice, not a capacity state, and the hero tile carries that weight.

**Checks on your answers — a separate short block.** Same three-word vocabulary where a check has a state.

| Check | Behaviour |
|---|---|
| Corroboration (§2.9) | Healthy / note / Watch, per the asymmetric rule |
| Run-work composition (§3.6) | Stated, no state. It is an observation about how run work is made up, not a rating. |

Place the block after the findings and before the numbers section. It is the clearest demonstration in the report that the tool is doing something a spreadsheet cannot, so give it a heading that says so rather than burying it as a footnote.

---

## 4. PR3 — Independent items

### 4.1 Annual portfolio turnover → typical project duration

Replace the displayed 1.7× with `typical_duration_months = (live_projects ÷ annual_projects) × 12`. Retain turnover internally where the growth-ceiling maths needs it.

### 4.2 IT staff as a share of company — presented as context, not as a measure

**[SETTLED 4 Sep, after the benchmark was verified not to exist.]** Claude Code searched the current tool, all 36 commits touching it, the repo, the August standalone HTML, the research deck and the specification documents. **There is no benchmark.** The metric has rendered uninterpreted since the first commit, and the review response's claim that one "already exists and is already used in the tool" was itself an unverified assertion — made, as it happens, in the paragraph diagnosing that failure mode. That makes four for four on citations examined in this release.

**Decision: present the figure as context rather than as a metric inviting comparison.** "45 IT staff in a 1,200-person company" sets the scale for everything else in the report and needs no benchmark to do that job. Reframed this way the absence stops mattering, which is a better outcome than either deleting the figure or admitting on the page that we cannot compare it. One copy change; no arithmetic moves.

The history below is retained because the item was decided wrongly twice.

---

#### Superseded — retain, displayed against its benchmark

**[REVERSED 4 Sep. The previous version of this section instructed removal, and its premise was wrong.]** It asserted that no benchmark existed. What was actually checked was the *project's* document set; the tool's own repo was never searched, and a cited benchmark for average IT headcount per employee **already exists and is already used in the tool**. The instruction not to look for a substitute source would have prevented anyone catching that. It is corrected here in full.

- **Total company headcount stays an input**, whatever is displayed. It is wanted as captured data.
- **The metric is retained for display** — tiles, numbers section, workings page and PDF — **shown against the benchmark already cited in the tool**, so a respondent can see whether their department sits above or below it. The comparison is the point; never display the percentage uninterpreted.
- **Locate the existing benchmark in the repo and report what it is and where it is cited** in the PR description. Do not substitute a different source, and do not add one. If you cannot find it, **stop and ask** — do not remove the metric and do not go looking for a replacement.
- Contractors remain excluded from this calculation per §3.2, and that exclusion is stated on the workings page.

### 4.3 Project definition

Add beneath the "Live projects right now" input:

> **A project is work that requires project management oversight** — someone with responsibility for holding the plan together, whether or not that person holds the title.

Rejected: "exclude minor works" — too subjective to apply consistently. An optional sharper boundary using concrete criteria (running beyond four weeks, or requiring more than one person) is **Norm's call on wording, not yours.** Implement the sentence above and flag the option to Norm.

### 4.4 Link preview

One static branded OG image plus proper `og:title` and `og:description`. No per-result generation. Document generation stays out of scope.

---

## 5. Copy rules — enforce mechanically

Add a check to the render suite that fails on any of these words appearing in **output** text (tiles, findings, numbers section, workings, PDF):

`approximately` · `roughly` · `estimated` · `very likely` · `significantly higher`

**[REVISED]** `about` and `around` were on this list and have been removed. A mechanical check cannot tell "around 17 projects" from "questions around your team", and a check that fails on legitimate copy gets switched off within a fortnight. Those two words are caught by review, not by the suite. Do not add a regex or a whitelist to rescue them — the simpler list is the one that survives.

**How this interacts with the methodology page. [ADDED 4 Sep]** The rule bars hedging in figures the tool asserts *about the respondent*. Where the text describes what a cited study found, `estimated` is a statistical term rather than a hedge — but do not rely on that distinction, because a mechanical check cannot make it. Write around it instead: "a point estimate of 5.16", not "an estimated turning point". The §2.11 statement as originally drafted would have failed this check, which is how the interaction was found.

**Hedging that belongs to the source is quoted, not stripped. [ADDED 4 Sep]** Where a source states its own imprecision — Jitbit's *"around 1,000 companies"* — reproducing it is accuracy. Removing the word would state the source's figure more precisely than the source does, which is the opposite of the fault this rule exists to catch. The test is whose uncertainty it is: ours gets cut, theirs gets quoted.

Three cases settled 4 Sep, as worked examples. **Cut:** *"around 75 in a typical year"* — 75 is the respondent's own answer, and "in a typical year" already carries whatever softness the question had. **Cut:** *"about 5 percentage points"* — 72 − 67 = 5 exactly, both operands are integers on the page, and a reader doing the subtraction gets 5. **Keep:** *"around 1,000 companies"* — Jitbit's imprecision, quoted.

Hedging belongs in input labels and helper text only. **The range is the hedge.** The brief's own suggested copy in its §2.5 and §3.1 breached this three times — write "You are running 17 projects a year above your sustainable pace", not "approximately 17"; "Ticket work accounts for 3.0–5.6 FTE", not "approximately X FTE".

Also forbidden in output: any sentence that compares ProjexaR's price to a saving, a recovered cost, or a payback period.

---

## 6. Sender payload

No new fields. The Worker and the Sender custom-field set stay as they are. Specifically:

- `rag_pm` and `rag_bau` carry the display words **Healthy / Watch / At risk**, computed from the new bands in §2.1 and §2.2.
- `rag_pm` is the band value from §2.1 and nothing else. The toolset escalation is removed in PR1 per §2.4, so there is no adjustment left to exclude.
- `headroom` becomes a **signed** integer. Negative values are sent as-is. Do not clamp. Blank when nothing is live. It remains unusable as a segment filter and is for copy only.
- The `Flag Understated Project Costs` group continues to be driven by the same budgets input, unchanged.
- **[FOUND IN PR2] `effective_fte` and `projects_per_fte` were posting `null`** — they read property names that were not on the compute object, so `JSON.stringify` dropped them, and had done since before PR1. Fixed in PR2 with no field added or removed. **Both now carry the adverse endpoint of their range**, matching how the tiles are rated. Document that: a field that looks like "the" number but is one end of a range is the same trap as `headroom` reading 0 for two different reasons. Do not segment on either without accounting for it.
- **[DECIDED]** Contractor count, loaded cost and full cost are **not** posted to Sender in this release. Three PRs land back to back; leaving the Worker and the custom-field set untouched means any integration failure during the release is definitely not from this. Posting the full-cost figure is a separate fourth change, to be taken once the release has settled.

**Note for Mark, not for implementation:** the new PM bands will shift the lead mix noticeably toward At risk, so the three nurture sequences will rebalance. Worth knowing before merge rather than after.

---

## 7. Render suite

The 603-shape baseline must be re-blessed wholesale — this release changes essentially every text output, so a pass/fail run carries no signal.

**[REVISED — numbers are not categorised by judgement.]** Self-categorising a diff lets a genuine regression be filed as an expected change by the same process that produced it. The categorisation is sound for copy. It is not sound for numbers.

- **Every numeric output in the fixture set is asserted against an independently computed expected value** — computed from the formulas in this document, not read back from the implementation's own output. A number that differs from its expected value is a failure, never a category.
- **Only text differences are categorised by judgement**, into *expected copy change* (text differs, every number identical) and *unexpected*.
- **Unexpected** is then the only category worth Mark's review time, and it means what §7 intends it to mean. It should be empty.

Add fixture shapes for: negative headroom · headroom exactly zero · headroom blank · a range straddling a band boundary · **toolset invariance** (the toolset input varied across all its values with everything else held constant, asserting both tile ratings, the growth ceiling, every published figure and both Sender RAG values identical across the set) · `contractor_fte > 0` · all three corroboration outcomes · budgets carrying internal staff time (non-summing path) · an edited loaded cost flowing into the PDF and share URL · a legacy free-text-percentage URL decoding to a band · the full-cost tile rendering before the email gate · one shape per row of the suppression table in §1.1.

---

## 8. Verification fixtures

**[NOTE ADDED 4 Sep — read before using these in PR1.]** Both fixtures below are stated in **post-PR2** form: they use the banded time input from §3.5, and therefore express ranges. PR1 does not have that input — the blended percentage is still free text until PR2, so in PR1 every figure here is a single value, and the ticket divisor is still the pre-§3.6 one. The same correction applies to fixture 8.B's four-finding assertion, which cannot hold until §3.8 consolidates the findings in PR2.

This was missed when review item 2 was actioned: that fix gave the corroboration check an interim PR1 home but left the fixtures in PR2 shape. **The PR1 brief carries the PR1 equivalents of both fixtures, with their own expected values.** Use those for PR1 and these for PR2.

### 8.A — The strained department

**Inputs:** headcount 1,200 · IT staff 45 · PMs 5 · live projects 45 · annual projects 75 · project spend £367,000 · BAU staff on projects 20 · blended band **31–40%** · tickets 960/month · run share 72% · contractors 0 · tools mixed · view manual · budgets out-the-door · who-on-what stale.

| Figure | Expected |
|---|---|
| `bau_effective_fte` | **6.2 – 8.0** |
| `internal_project_fte` | **11.2 – 13.0** |
| Concurrent projects per PM | **9.0** → **At risk** |
| Live projects per effective BAU FTE | **5.6 – 7.3**, rated on 7.3 → **Watch** |
| Typical project duration | **7.2 months** |
| Red threshold, live projects (PM route) | **36** |
| Red threshold, annual pace (PM route) | **59** |
| Red threshold, annual pace (BAU route) | **104 – 134** |
| Sustainable annual pace | **58** at both endpoints; binding route: PM |
| Growth ceiling | **−17** → *"You are running 17 projects a year above your sustainable pace."* |
| Derived change share | **24.9% – 28.9%** |
| Derived run share | **71.1% – 75.1%** |
| Stated run share | 72% — inside the range → corroboration **Healthy** |
| Ticket FTE | **3.0 – 5.6** (960 ÷ 320 to 960 ÷ 170) |
| Run-work FTE reported | **32.4** |
| Run-work gap | **26.8 – 29.4 FTE** |
| ProjexaR annual cost | 25 resources × £100 = **£2,500** |
| Share of reported spend | **0.68%** |

**Findings and checks, after PR2.**

| Item | Expected |
|---|---|
| Finding 1 — BAU capacity spread | **Watch** (takes the BAU tile's state) |
| Finding 2 — no single current view | **At risk** (all three adverse: non-PPM toolset, manual view, stale picture) |
| Finding 3 — commitments against a lagging picture | **Watch** |
| Finding 4 — budgets carry out-the-door spend only | **Watch** |
| Check — corroboration | **Healthy** |
| Check — run-work composition | Stated: ticket work 3.0–5.6 FTE against 32.4 FTE reported on run work |

Findings number exactly four. The report's single Healthy comes from the corroboration check — which is honest for this fixture, and is why the check needed to be capable of returning it.

**Full cost, at an illustrative £65,000 loaded cost per head.** The real default comes from ASHE per §3.3 and will differ; these figures exist so the arithmetic can be checked, not to be published.

| Figure | Expected |
|---|---|
| Internal effort cost | **£728,000 – £845,000** |
| Full portfolio cost | **£1,095,000 – £1,212,000** |
| Reported spend as a share of full cost | **30.3% – 33.5%** |
| ProjexaR's share of full cost | **0.21% – 0.23%** |

### 8.B — The well-run department: proving Healthy is reachable

**[NEW]** Nothing in the release currently tests that an all-Healthy result is *possible*. Surveying the 603 shapes does not answer it either: they are synthetic render fixtures, so their distribution reflects whoever wrote them, not any population of departments. This is a purpose-built fixture, and it is a gate.

First, the context, because it changes how the result should be read: **a report that returns all-Healthy describes a department that is not a prospect.** Once there are real respondents, a low Healthy rate will be expected and correct. The state exists for credibility, not conversion — a findings list that can never say anything is fine reads as a sales instrument, which is the fault being corrected. So this fixture proves reachability; it is not a target to tune toward.

**Inputs:** headcount 600 · IT staff 24 · PMs 4 · live projects 16 · annual projects 24 · project spend £180,000 · BAU staff on projects 10 · blended band **61–70%** · tickets 1,400/month · run share 56% · contractors 0 · a single PPM tool · view not manual · who-on-what current · **budgets carry internal staff time**.

| Figure | Expected |
|---|---|
| `bau_effective_fte` | **6.1 – 7.0** |
| `internal_project_fte` | **10.1 – 11.0** |
| Concurrent projects per PM | **4.0** → **Healthy** |
| Live projects per effective BAU FTE | **2.3 – 2.6** → **Healthy** |
| Typical project duration | **8.0 months** |
| Sustainable annual pace | **42** at both endpoints; binding route: PM |
| Growth ceiling | **+18** → *"You could take on 18 more projects a year before a capacity measure turns red."* |
| Derived run share | **54.2% – 57.9%** |
| Stated run share | 56% — inside the range → corroboration **Healthy** |
| Ticket FTE | **4.4 – 8.2** |
| Run work reported | **13.4 FTE** |
| Findings 1, 2, 3, 4 | **Healthy, Healthy, Healthy, Healthy** |
| Hero tile | Growth ceiling — budgets carry internal time, so the non-summing path of §3.1 |
| Licence basis | 14 managed resources → **£1,400** a year |

**Assertions:** both tiles Healthy · all four findings Healthy · the corroboration check Healthy · **no At risk rating anywhere in the report** · the growth ceiling renders as a positive headroom in prose.

If this fixture cannot return an all-Healthy result, the structural third state has not landed and the bands need **re-examining, not softening**. §2.8's rejection of widened tolerances stands without qualification.

**Report, but do not gate on:** across the existing 603 shapes, the count that produce at least one Healthy tile. It is a smoke test that Healthy is not unreachable across the suite, and a property of the fixture set rather than a signal about departments. Put the number in the PR description. Do not tune against it.

---

## 9. Acceptance criteria

### 9.1 Every PR

- [ ] Every tile rating agrees with the workings page. **No rating is contradicted by any figure the tool itself publishes.** This is the fault the release exists to correct — verify it explicitly, including the rounding rule in §2.3.
- [ ] No toolset input influences any rating, anywhere. The toolset-invariance shape passes.
- [ ] No figure renders as `NaN`, `Infinity` or an unexplained blank. Every row of the §1.1 suppression table has a passing shape.
- [ ] The copy-rule check in §5 passes.
- [ ] Every numeric output in the fixture set matches an independently computed expected value. No number is categorised as an expected change.
- [ ] The text diff's "unexpected" category is empty.
- [ ] Every computed integer rendered into prose is correct at a value of 1 (§2.7).
- [ ] The §2.3 boundary shapes pass: at 5.04, 5.05, 7.04, 7.05, 10.04 and 10.05 the displayed figure, the rating and the published threshold agree.

### 9.2 PR1

- [ ] Concurrent projects per PM returns At risk at 9.0, with body copy consistent with the rating.
- [ ] Growth ceiling renders as an overrun of 17 projects a year, in prose, with no minus sign and no zero.
- [ ] `headroom` posts to Sender as −17, unclamped.
- [ ] The toolset escalation is gone, and no tile or workings copy still describes it.
- [ ] The corroboration check ships in PR1 in its interim home (§2.9), returns Healthy on fixture 8.A, and gives the report at least one Healthy rating.
- [ ] The **PR1 form** of fixture 8.B (see the PR1 brief) returns Healthy on both tiles, Healthy on corroboration, and no At risk tile rating. The Healthy count across the existing shapes is reported in the PR description. The four-finding assertion is a PR2 gate, not a PR1 one.
- [ ] The red thresholds are derived from the rounded ratio per §2.3/§2.5, and every figure in fixture 8.A is unchanged by that revision.
- [ ] No reference to an 8–12 ceiling survives anywhere in the tool or its PDF.
- [ ] The methodology page carries the §2.11 statement, including the sentence about the red threshold sitting above the confidence interval.
- [ ] Both new citations are complete and correctly spelled, and no unverified figure from either paper appears on the page.
- [ ] No retained source is orphaned; the sources that moved are named in the PR description.

### 9.3 PR2

- [ ] Every band-dependent figure displays as a range.
- [ ] Full cost is the hero tile when budgets are out-the-door, and the non-summing path is taken for every other answer.
- [ ] The loaded-cost assumption is editable, sourced, decomposed into salary + NI + overhead, and flows into the PDF and the share URL.
- [ ] Contractors are routed per all six rows of §3.2, and the exclusions appear on the workings page.
- [ ] The full-cost tile renders before the email gate, with no blur or partial reveal.
- [ ] Findings number **exactly four**, no two imply the same action, and each is capable of returning Healthy from data the report already publishes. Fixture 8.B returns Healthy on all four.
- [ ] The corroboration check has moved from its PR1 interim home into the checks block.
- [ ] The checks block carries the corroboration result and the run-work composition, with the run-work figure stated as a range.
- [ ] ProjexaR's share reads 0.68% of reported spend, with the full-cost comparator alongside as a range.
- [ ] The conversion panel names the annual discount.
- [ ] *(Not a gate — see §3.5.)* A legacy shared URL carrying a free-text percentage decodes to a band rather than erroring, or the PR description says it was dropped.

### 9.4 PR3

- [ ] Typical project duration replaces the turnover multiple in display; turnover is retained internally.
- [ ] The IT-staff-share metric appears in the tiles, numbers section, workings page and PDF, displayed against the benchmark already cited in the tool — never uninterpreted. The PR description names that benchmark and where it is cited.
- [ ] A shared report URL renders a link preview in Teams and Slack.

---

## 10. Decisions taken, so they are not reopened

| Item | Decision |
|---|---|
| Corroboration tolerance | ±3 percentage points on the derived range endpoints, applied asymmetrically per §2.9 |
| Tickets-per-agent divisor | 170–320/month, ProjexaR control declared between two cited anchors (HDI/MetricNet, Jitbit); ticket FTE expressed as a range |
| Loaded cost | ONS ASHE Table 2, SOC 213, UK full-time median, + 15% employer NI above the £5,000 secondary threshold, + 25% overhead declared as ProjexaR's judgement |
| Overhead uplift | 25%, one blended figure for PMs and BAU staff alike — not split by role |
| Contractor day rate | Not collected. Contractors excluded from the cost calculation entirely |
| IT staff share of company | **Retained and displayed against the benchmark already cited in the tool.** Reverses the previous instruction to remove it, whose premise was wrong — see §4.2 |
| Third findings state | **Healthy** — the existing vocabulary, not a new "GOOD" |
| Project-dedicated staff input | Not added. Handled by the asymmetric corroboration rule |
| Toolset escalation | **Removed.** The signal lives in finding 2 as a mechanism. No toolset input affects any rating |
| Full-cost tile gating | **Ungated.** Renders with the other tiles, before the email gate |
| Findings structure | Four findings, each Healthy-capable, plus a separate checks block for corroboration and run-work composition |
| Full cost to Sender | Not this release. Separate fourth change once the release has settled |
| Second citation | Zika-Viktorsson retained as mechanism support only; no figures published from it |
| Release shape | Three sequenced PRs |

---

## 11. Verification register

**[NEW]** Two errors in the first revision came from the same failure: an assertion made in this document's confident register without having been checked, and then marked **[DECIDED]** so nobody would reopen it. §2.11 published an unverified figure; §4.2 acted on an unverified absence. A decision resting on an unchecked premise is not settled, and marking it settled is what stops anyone catching it.

Every factual claim in this document now sits in one of two columns. **[DECIDED]** may only be attached to something in the first.

**Verified against a named source, on the date shown**

| Claim | Source | Checked |
|---|---|---|
| Colicev turning point 5.16, Fieller CI [3.57; 6.19] | Published open-access PDF, City Research Online | 4 Sep 2026 |
| Colicev setting: hydraulic pump manufacturer, 42 projects, 580 employees, Jan 2015 – Aug 2016 | as above | 4 Sep 2026 |
| Colicev sample **does** record managerial responsibility as a coded variable, project manager given as the example (Section 4.2) | as above, re-read | 4 Sep 2026 |
| The −.507, p = .324 result is about **allocation, not performance**: dependent variable MPW, Table S2, §4.2 preliminary checks. Managers were not allocated a different number of concurrent projects. It says nothing about the shape of the curve | as above, third read | 4 Sep 2026 |
| Table 2's moderators are specialized experience, project similarity, employee familiarity — **no managerial-responsibility term** | as above | 4 Sep 2026 |
| Table S10 tests age and leadership role as additional moderators and reports none matter | **UNVERIFIED** — one read only, CC to confirm before any claim rests on it |  |
| Colicev citation: *SMJ* 44(2), 610–636, DOI 10.1002/smj.3443 | publisher record | 3 Sep 2026 |
| Employer NI 2026/27: 15%, Secondary Threshold £96/week, £417/month, £5,000/year | gov.uk rates and thresholds for employers 2026 to 2027 | 4 Sep 2026 |
| HDI/MetricNet desktop support: industry averages 87–133, range 30–198 | Rumburg, *Metric of the Month* | 3 Sep 2026 |
| The pricing page already says "two months free" | projexar.com/pricing | 3 Sep 2026 |
| Product is pre-MVP and pre-launch; no one outside the team has completed the Capacity Check, so there is no respondent population, lead population or shared-result population | Stated by Mark | 4 Sep 2026 |

**Not verified — do not publish, and do not decide on, without checking first**

| Claim | Status |
|---|---|
| Zika-Viktorsson volume/issue/pages 24(5), 385–394 | From a co-author's institutional list, not the publisher record. Confirm (§2.12) |
| Zika-Viktorsson sample details (392 workers, nine companies, one third overloaded) | Unconfirmed. Barred from publication (§2.12) |
| ~~Jitbit's 480 describes high-throughput remote tier-1 operation~~ | **DISPROVED 4 Sep.** Jitbit publishes 21/technician/day across ~1,000 mixed-industry businesses, no tier named. The 480 monthly figure was never published by Jitbit at all — it was a conversion the tool presented as sourced, and it predates this release. Neither the independent review, nor the remediation brief, nor this document caught it; all three inherited the citation on trust |
| ASHE median £56,348, SOC 213, 2025 provisional, CV 1.5% on 875,000 jobs, **Full-Time worksheet** | CC parsed the ONS spreadsheet directly and corroborated three ways: the sheet's own A1 title, job counts reconciling (875 full-time + 43 part-time = 918 all-employees), and the figure sitting above the all-employees median as part-time depression predicts. The all-employees sheet would have given £55,357 — £991 apart, which would have reached the loaded cost as a £1,387 understatement and shown up as an anomaly nowhere | 4 Sep 2026 |
| ~~Jitbit publishes 480 tickets per agent per month~~ | **DISPROVED 4 Sep, second finding from the same check.** No stateable working-days basis produces 480 from Jitbit's published 21/day. Removed from output entirely; the suite fails if it reappears |
| Contractor cost sits inside the respondent's reported project spend | Modelling assumption about respondents, not a checked fact (§3.2) |
| ASHE median for SOC 213 | Not yet fetched. §3.3 requires stop-and-ask if unreachable |
| The benchmark cited in the tool for IT headcount per employee | Known to exist; its identity and citation have **not** been read by this document. §4.2 requires CC to find and report it |

**Two further corrections, 4 September, both to claims this document made in its confident register.**

1. **The Colicev sample composition, reversed twice.** Revision 1 said project managers were in the sample; revision 2 said they were not; the paper says they are. Revision 2's error was made by trusting a second summary over a first without reconciling them — the two fetches disagreed and this document picked one. **A source that contradicts an earlier reading of the same source is not a correction; it is a conflict, and it is resolved by going to the primary text, not by preferring the newer summary.**
2. **The floating-point justification in §2.3 was fabricated.** `Math.round(7.05 * 10)` was asserted to return 70. It returns 71. The claim was never run before being written into an executable brief, and Claude Code caught it by running it.

Both were made *while writing the section that exists to prevent them*. The register is necessary but not sufficient: a claim can be entered as verified because it feels checked. The discipline that actually worked in both cases was someone re-running or re-reading the primary source.

**Standing rule.** Any new assertion added to this document — about a source, a figure, a rate, or the *absence* of one — is marked unverified until it has been checked against a named source, and carries no **[DECIDED]** until then. An asserted absence needs the same evidence as an asserted presence; the search that produced it must be named, and its scope stated, so a reader can see what was not searched.
