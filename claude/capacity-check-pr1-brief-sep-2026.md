# PR1 — Bands, thresholds, negative headroom, copy and sources

**For:** Claude Code, working in `~/Desktop/ProjexaR/projexar`, pushing to `sinbad0709/projexar`
**Companion document:** `CapacityCheck_ChangeSpec_CC.md` revision 2, 4 September 2026. This brief is the PR1 slice of it. Where the two differ, this brief wins **for PR1 only** — the differences are all sequencing, and each is marked.
**Target file:** the single self-contained Capacity Check HTML file. Nothing else in the repo is in scope.
**Date:** 4 September 2026

Do not merge. Open the PR, post the diff report, and stop.

---

## 0. Before you write anything

1. **Read the spec's §0 standing constraints.** They govern every line of this PR. In particular: no competitor citations, no ROI/breakeven/payback framing, no claim the tool tracks actual hours, hedging in inputs only.
2. **Read the spec's §11 verification register.** It records what has been checked against a source and what has not. Do not publish anything from the unverified column, and do not resolve an unverified item by inference — the two errors §11 exists to prevent were both made that way.
3. **Branch from `main`.** Name it `pr1-bands-thresholds-headroom`.
4. **Capture the current render baseline before your first edit.** All 603 shapes, stored so the PR can diff against it. This PR changes text output deliberately and extensively; without the pre-edit baseline the diff report in §6 cannot be produced.

**Stop and ask, rather than deciding, if:** you cannot confirm the Zika-Viktorsson volume/issue/pages against the publisher record (§4.4); the existing findings engine cannot carry a third state without a structural change larger than this PR; or any figure in the §5 fixtures comes out differently from the value stated there.

---

## 1. Scope

**In this PR.** Spec §1 named quantities · §1.1 suppression rules (the rows PR1 can reach) · §2.1 PM bands · §2.2 BAU band gap · §2.3 rounding and threshold derivation · §2.4 toolset escalation removal · §2.5 dependent thresholds · §2.6 growth ceiling endpoint rule · §2.7 negative headroom and pluralisation · §2.8 the Healthy state · §2.9 corroboration check in its interim home · §2.10 copy and methodology rewrites · §2.11 the bands statement · §2.12 sources · §5 copy-rule check · §7 render-suite discipline.

**Explicitly not in this PR.** The banded time input · contractors · the full-cost calculation and hero tile · the loaded-cost control · the recalibrated ticket divisor and the run-work check · findings consolidation to four · the checks block · the pricing workings row · legacy URL decoding · typical project duration · the IT-share metric · the OG image. All of those are PR2 or PR3. If a change you are making appears to require one of them, stop and ask — it means the sequencing is wrong, not that the scope should grow.

**Do not touch** the pricing page, `/start/`, or any file outside the Capacity Check HTML.

---

## 2. Sequencing — how PR1 differs from the spec's steady state

The spec describes the tool after all three PRs. Three things read differently in PR1, and all three are deliberate.

**No ranges.** The blended time input is still a free-text percentage until PR2 (§3.5). Every figure in PR1 is therefore a single value, not a range. **Write the code as though ranges already exist:** give every derived quantity a function that takes an endpoint and returns one value, and call it once in PR1. PR2 then calls it twice and formats the pair. Do not hard-code single-value assumptions you will have to unpick.

**No range straddle.** §2.3's boundary rule and §2.6's endpoint rule still apply — to single values. The boundary shapes in §6 are required in PR1; the straddle shapes arrive with PR2.

**Eight findings, temporarily.** §2.9's corroboration check joins the existing seven as an interim eighth. That makes the findings list longer for one merge, which is the opposite of where the release is going — PR2's §3.8 consolidates to four plus a checks block. This is expected. Do not pre-empt it by consolidating early.

**The old ticket divisor stays.** §3.6 is PR2. Ticket-derived FTE in PR1 still uses the existing divisor.

---

## 3. The work, in dependency order

### 3.1 Named quantities (spec §1)

Define once, near the top of the calculation block, and use by name everywhere:

- `bau_effective_fte(e)` = `bau_staff_on_projects × blended_share(e)`
- `internal_project_fte(e)` = `pm_count + bau_effective_fte(e)` — **permanent staff only**

In PR1 `e` has one value. The parameter exists so PR2 does not have to rewrite the call sites.

### 3.2 Rounding and thresholds (spec §2.3, §2.5) — do this before the bands

Everything downstream depends on these two helpers being right.

```js
function round1(x){ return Math.round(x * 10 + 1e-9) / 10; }              // x ≥ 0
function redThreshold(cap, d){ return Math.ceil((cap + 0.05) * d - 1e-9); }
```

- **Rate on the rounded, displayed value**, never the raw float.
- **Derive every published red threshold from `redThreshold`**, never from a raw multiplication. `7 × PMs + 1` is the bug, not the rule: at 25 PMs it publishes 176 while the tile displays 7.0 and rates Watch.
- **Keep the epsilons, but the stated reason was wrong. [CORRECTED 4 Sep]** This brief claimed `Math.round(7.05 * 10)` returns 70. It returns 71, and the epsilons change no result at any boundary ratio in the fixture set — the claim was written without being run. Keep them for the reason that is true: `(cap + 0.05) * d` can land a hair above an integer for divisors outside the fixture set, where a bare `Math.ceil` would publish a threshold one too high. Defensive, not a fix for a demonstrated bug. Do not substitute `toFixed` in the rating path.

```
pm_red_live       = redThreshold(7.0,  pm_count)
bau_red_live(e)   = redThreshold(10.0, bau_effective_fte(e))
pm_red_annual     = floor((pm_red_live    − 1) × turnover) + 1
bau_red_annual(e) = floor((bau_red_live(e) − 1) × turnover) + 1
```

`turnover = annual_projects ÷ live_projects`, internal only.

### 3.3 The two tiles (spec §2.1, §2.2)

| Tile | Healthy | Watch | At risk |
|---|---|---|---|
| Concurrent projects per PM — `live ÷ pm_count` | `≤ 5.0` | `> 5.0 and ≤ 7.0` | `> 7.0` |
| Live projects per effective BAU FTE — `live ÷ bau_effective_fte` | `≤ 5.0` | `> 5.0 and ≤ 10.0` | `> 10.0` |

Both bands are stated with explicit operators. The BAU tile previously read "green ≤5, amber 6–10", which left everything between 5.0 and 6.0 unrated. No existing integer rating changes.

### 3.4 Remove the toolset escalation (spec §2.4)

The PM tile currently escalates Watch → At risk on a non-PPM toolset. **Remove it entirely.**

- `rag_pm` becomes the band value from §3.3 and nothing else.
- **No toolset input may influence any rating anywhere.**
- The toolset signal keeps its existing home in the current findings list; it is not orphaned. PR2 folds it into the consolidated finding 2.
- Remove any tile or workings copy that described or hinted at the escalation.

### 3.5 Growth ceiling and negative headroom (spec §2.6, §2.7)

```
sustainable_annual(e) = min( pm_red_annual − 1, bau_red_annual(e) − 1 )
headroom(e)           = sustainable_annual(e) − annual_projects
```

The BAU route uses `bau_effective_fte` — the same divisor the tile publishes. A ceiling derived from any other divisor contradicts the tile.

Rendering:

- **Negative** — prose only: *"You are running 17 projects a year above your sustainable pace."* No minus sign, no negative number, never zero.
- **Zero** — exactly at the limit. This is now the only meaning of zero.
- **Blank** — nothing live. Unchanged.
- **Never clamp at zero.** Clamping restores the ambiguity this path removes.

**Pluralisation.** Write one helper and route every computed integer rendered into prose through it — projects, project managers, months. `"1 projects"` must not be reachable. Add a shape at exactly 1 for each site.

### 3.6 Suppression rules (spec §1.1)

Nothing may render as `NaN`, `Infinity`, `£NaN`, or a bare `0.0` standing in for "not computed". Where a figure cannot be computed, suppress it and say on the workings page that it was not computed and why.

| Condition | Behaviour |
|---|---|
| `pm_count = 0` | Suppress the PM tile and the PM route. The BAU route binds alone. |
| `bau_staff_on_projects = 0` or no blended share | Suppress the BAU tile, the BAU route and the corroboration check. `internal_project_fte = pm_count`. |
| `live_projects = 0` | `headroom` blank. |
| `annual_projects = 0` | `turnover` undefined — suppress the annual-pace thresholds and the ceiling. |
| `it_staff = 0` | Suppress the corroboration check. |
| Both routes suppressed | No growth ceiling; the report runs without one. |

The full-cost row of the spec's §1.1 table arrives with PR2.

### 3.7 The Healthy state (spec §2.8)

The findings engine emits only Watch and At risk. Add **Healthy** — the word already used by the tiles and by the Sender `rag_pm`/`rag_bau` fields. Same word, same casing, same styling token. Do not invent a new label.

Rejected, so it is not revisited: widening tolerances so borderline cases fall into a gentler category. That produces more Watch, not more Healthy, and is the same fault as tightening thresholds to create alarm.

### 3.8 Corroboration check (spec §2.9)

```
derived_change_share(e) = internal_project_fte(e) ÷ it_staff
derived_run_share(e)    = 1 − derived_change_share(e)
```

Compare `stated_run_share`, tolerance **±3 percentage points**. The test is **asymmetric**, and the asymmetry is the point: the derivation counts only PMs and BAU-staff-on-projects, so a department with delivery staff who hold no BAU role is invisible to it.

| Condition | Result |
|---|---|
| `stated_run` within `[derived_run − 3, derived_run + 3]` | **Healthy.** Two independently supplied answers corroborate. |
| `stated_run` above that window | **Note, not a fault.** We derive less change effort than stated — expected where projects are delivered by staff with no BAU role, whom we do not count. Say so; do not rate it. |
| `stated_run` below that window | **Watch.** We derive more change effort than stated. Name which input to revisit and which figures depend on it. |

**Interim home.** Render it as an additional finding in the existing list. PR2 moves it into the checks block. Without this, PR1 has no Healthy rating available anywhere and cannot pass its own acceptance criteria.

### 3.9 Copy and methodology (spec §2.10, §2.11)

1. **Retire the 8–12 convention everywhere** — tile body, findings, methodology, sources, PDF.
2. **Rewrite the concurrent-projects tile body.** It currently explains that the caseload sits *inside* an acceptable ceiling while showing a red badge. Rating and explanation now agree; rewrite to say so rather than patching around it.
3. **Rewrite the growth-ceiling tile** for both the positive and the negative case.
4. **Leave a clean seam** in "What this does not account for" — its blended-average paragraph is rewritten in PR2.
5. **Add the bands statement**, below, to the methodology page.

> These bands are ProjexaR's management controls. They are informed by published research but are not values the research establishes.
>
> The evidence comes from a longitudinal study of 9,649 project-month-employee observations across 42 projects and 580 employees at a single manufacturer, over twenty months. It finds an inverted-U relationship between the number of concurrent projects a person carries and how well those projects perform, with an estimated turning point of 5.16 concurrent projects and a confidence interval of 3.57 to 6.19.
>
> Three things follow, and we state all three. The study covers new-product-development engineering, and a portfolio of IT change projects is a different setting. The study records whether an employee held managerial responsibility, and reports that it does not find the same pattern among managers — so applying this number to project management caseload is our step, not the paper's. And our red threshold of 7.0 sits *above* the top of that confidence interval, deliberately: we would rather understate the problem than manufacture one.

**[SUPERSEDED VERSION REPLACED 4 Sep, after PR1 was opened.]** The version issued with the original brief said the paper "does not identify project managers as a group within its sample". That was wrong — Section 4.2 records managerial responsibility as a coded variable, with project manager as its example. Claude Code was right to challenge it.

But the correction is not simply to put project managers back in. The paper reports a separate result for the manager subgroup — *"we do not find this pattern for managers"* — meaning the inverted-U that the whole band scheme rests on **is not found among managers**. That is the honest limit of the evidence and it was missing from every version until now. **[VERIFY BEFORE PUBLISHING]** confirm in the paper which model and which pattern that result refers to; do not publish the clause from this brief's paraphrase.

**All three closing sentences are load-bearing and none may be trimmed.** Do not paraphrase the figures, and do not add anything about this paper you have not read there.

### 3.10 Sources (spec §2.12)

**Remove:** the informal 8–12 convention.

**Add:**

- Colicev, A., Hakkarainen, T. & Pedersen, T. (2023). Multi-project work and project performance: Friends or foes? *Strategic Management Journal*, 44(2), 610–636. DOI 10.1002/smj.3443.
- Zika-Viktorsson, A., Sundström, P. & Engwall, M. (2006). Project overload: An exploratory study of work and management in multi-project settings. *International Journal of Project Management*, 24(5), 385–394. **Confirm volume, issue and pages against the publisher record before publishing** — the numbers above come from a co-author's institutional list. Use the publisher's spelling *Zika-Viktorsson*, not *Zika-Wiktorsson*. Publish no figure from this paper: cite it for the overload mechanism only.

**Retain:** Flexera 2023 Tech Spend Pulse with its existing caveats intact.

**Do not cite:** Bendoly, Swink & Simpson (2014) and Delisle (2026). Both are described in the internal research deck by subject matter only, with no titles or publication details.

**Check for orphans.** Every retained source must still be attached to a surviving finding, or be removed from the sources page. Name in the PR description any source that moved.

### 3.11 Copy-rule check (spec §5)

Add a render-suite check that fails on any of these appearing in **output** text — tiles, findings, numbers, workings, PDF:

`approximately` · `roughly` · `estimated` · `very likely` · `significantly higher`

`about` and `around` are deliberately **not** on this list. A mechanical check cannot tell "around 17 projects" from "questions around your team", and a check that fails on legitimate copy gets switched off. Those two are handled by review. Do not add a regex or a whitelist to rescue them.

Also failing: any sentence comparing ProjexaR's price to a saving, a recovered cost, or a payback period.

Hedging belongs in input labels and helper text only.

---

## 4. Fixtures for PR1

**These are the PR1 forms.** The spec's §8 fixtures are stated in post-PR2 shape and will not reproduce here — they assume the banded input and the recalibrated ticket divisor, neither of which exists yet.

### 4.A — The strained department

**Inputs:** headcount 1,200 · IT staff 45 · PMs 5 · live projects 45 · annual projects 75 · project spend £367,000 · BAU staff on projects 20 · blended time **37%** · tickets 960/month · run share 72% · tools mixed · view manual · budgets out-the-door · who-on-what stale.

| Figure | Expected |
|---|---|
| `bau_effective_fte` | **7.4** |
| `internal_project_fte` | **12.4** |
| Concurrent projects per PM | **9.0** → **At risk** |
| Live projects per effective BAU FTE | **6.1** → **Watch** |
| `pm_red_live` | **36** |
| `pm_red_annual` | **59** |
| `bau_red_live` | **75** |
| `bau_red_annual` | **124** |
| Sustainable annual pace | **58**; binding route: PM |
| Growth ceiling | **−17** → *"You are running 17 projects a year above your sustainable pace."* |
| Derived run share | **72.4%** |
| Stated run share | 72% — inside ±3 → corroboration **Healthy** |
| `headroom` posted to Sender | **−17**, unclamped |
| `rag_pm` / `rag_bau` | **At risk** / **Watch** |

### 4.B — The well-run department: Healthy must be reachable

Nothing else in the release tests that an all-Healthy result is *possible*. Surveying the 603 shapes does not answer it either: they are synthetic render fixtures, so their distribution reflects whoever wrote them, not any population of departments.

Context, because it changes how the result should be read: **a report that returns all-Healthy describes a department that is not a prospect.** Once there are real respondents, a low Healthy rate will be expected and correct. The state exists for credibility, not conversion. This fixture proves reachability; it is not a target to tune toward.

**Inputs:** headcount 600 · IT staff 24 · PMs 4 · live projects 16 · annual projects 24 · project spend £180,000 · BAU staff on projects 10 · blended time **65%** · tickets 1,400/month · run share 56% · a single PPM tool · view not manual · who-on-what current · budgets carry internal staff time.

| Figure | Expected |
|---|---|
| `bau_effective_fte` | **6.5** |
| `internal_project_fte` | **10.5** |
| Concurrent projects per PM | **4.0** → **Healthy** |
| Live projects per effective BAU FTE | **2.5** → **Healthy** |
| Sustainable annual pace | **42**; binding route: PM |
| Growth ceiling | **+18**, rendered as positive headroom in prose |
| Derived run share | **56.2%** |
| Stated run share | 56% → corroboration **Healthy** |

**Assertions:** both tiles Healthy · corroboration Healthy · **no At risk tile rating anywhere** · the ceiling renders as positive headroom.

If this fixture cannot return Healthy on both tiles, the third state has not landed and the bands need **re-examining, not softening**.

The four-findings-all-Healthy assertion belongs to PR2, once §3.8 of the spec consolidates them. Do not attempt it here.

---

## 5. Boundary shapes — required

The rounding rule is where this PR is most likely to be subtly wrong, and the failure is invisible in ordinary inputs.

Add shapes at ratios of exactly **5.04, 5.05, 7.04, 7.05, 10.04, 10.05** on both tiles. For each, assert that the **displayed figure, the rating and the published red threshold agree**.

Two worked cases that must hold:

- 25 PMs, 176 live → displays **7.0**, rates **Watch**, published threshold **177**. Not 176.
- 25 PMs, 177 live → displays **7.1**, rates **At risk**.

Add also: **toolset invariance** — vary the toolset input across all its values with every other input held constant; assert both tile ratings, the growth ceiling, every published figure and both Sender RAG values are identical across the set. One shape per row of the §3.6 suppression table. One shape at a computed integer of exactly 1 for each prose site.

---

## 6. The diff report

The 603-shape baseline is re-blessed wholesale — this PR changes text output deliberately, so a pass/fail run carries no signal.

- **Every numeric output in the fixture set is asserted against the expected value stated in §4**, computed from the formulas in this brief rather than read back from the implementation. A number that differs is a failure, never a category.
- **Only text differences are categorised**, into *expected copy change* (text differs, every number identical) and *unexpected*.
- **"Unexpected" is the only category worth review time.** It should be empty.

---

## 7. Acceptance criteria

- [ ] Every tile rating agrees with the workings page. No rating is contradicted by any figure the tool publishes.
- [ ] Boundary shapes pass at 5.04, 5.05, 7.04, 7.05, 10.04, 10.05, with threshold, display and rating in agreement.
- [ ] Both fixtures in §4 reproduce every stated figure exactly.
- [ ] Fixture 4.B returns Healthy on both tiles and on corroboration, with no At risk tile rating.
- [ ] Concurrent projects per PM returns At risk at 9.0, with body copy consistent with the rating.
- [ ] Growth ceiling renders as an overrun of 17 projects a year, in prose, with no minus sign and no zero.
- [ ] `headroom` posts to Sender as −17, unclamped, and is not used as a segment filter.
- [ ] The toolset escalation is gone; the invariance shape passes; no copy still describes it.
- [ ] Every computed integer rendered into prose is correct at a value of 1.
- [ ] No figure renders as `NaN`, `Infinity` or an unexplained blank; every suppression row has a passing shape.
- [ ] No reference to an 8–12 ceiling survives anywhere in the tool or its PDF.
- [ ] The methodology page carries the §3.9 statement in full, both closing sentences intact.
- [ ] Both citations are complete and correctly spelled; no unverified figure from either paper appears.
- [ ] No retained source is orphaned.
- [ ] The copy-rule check passes.
- [ ] The text diff's "unexpected" category is empty.
- [ ] No PR2 or PR3 item has been implemented.

---

## 8. PR description must contain

1. The categorised text diff, and confirmation that every fixture number matched its expected value.
2. Both fixtures' actual output, so the figures can be read against §4 without running anything.
3. **The count of the existing 603 shapes that now produce at least one Healthy rating.** This is a smoke test that Healthy is not unreachable across the suite — it is a property of the fixture set, not a signal about departments. Report the number; do not tune against it.
4. Any source that moved during the orphan check.
5. Confirmation of the Zika-Viktorsson volume/issue/pages against the publisher record, or a statement that the citation was held back because it could not be confirmed.
6. Anything you stopped and asked about, and what was decided.
