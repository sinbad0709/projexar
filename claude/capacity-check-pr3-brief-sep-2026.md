# PR3 — Duration, IT-share, project definition, link preview

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`
**Companion:** `CapacityCheck_ChangeSpec_CC.md` §4, plus §1.1, §5, §9.4, §11
**Follows:** PR2
**Target file:** the single self-contained Capacity Check HTML file, plus `tools/capacity-check/` and one new image asset
**Date:** 4 September 2026

The smallest of the three, and the last. It carries the release's one remaining unaudited citation — see §2.2, which is the substantive work here.

Do not merge. Open the PR, post the diff report, and stop.

---

## 0. Before you write anything

1. **Branch from `main`**, which now contains PR1 and PR2. Name it `pr3-duration-itshare-preview`.
2. **Re-bless the baseline from post-PR2 `main`.**
3. **§2.3 is a question-wording change, so it is Norm's.** Implement to the wording given, flag it, expect it to change.
4. **§2.4 needs an image asset that does not exist yet.** Mark or a designer produces it — Claude Design is not used for anything landing in the repo. If it has not arrived, implement the rest and leave §2.4 open rather than shipping a tag pointing at nothing.

**Stop and ask, rather than deciding, if:** the IT-share benchmark cannot be located in the repo (§2.2); the audit in §2.2 disqualifies it; or the OG image asset is unavailable.

---

## 1. Scope

**In.** Spec §4.1 typical project duration · §4.2 IT staff as a share of company, reinstated **after audit** · §4.3 project definition helper text · §4.4 link preview · the two closing deliverables in §5.

**Out.** Everything else. No Sender payload changes — the field contract is final as of PR2 and Mark is about to reconcile it against his Sender configuration, so it must not move underneath him.

**Do not touch** the pricing page, `/start/`, or any file outside the Capacity Check HTML, `tools/`, and the one new image asset.

---

## 2. The work

### 2.1 Typical project duration (spec §4.1)

Replace the displayed 1.7× turnover multiple with:

```
typical_duration_months = roundN((live_projects ÷ annual_projects) × 12, 1)
```

Turnover is retained internally — the growth ceiling still needs it — but is no longer displayed anywhere.

**Suppression:** `annual_projects = 0` or `live_projects = 0` → not computed, and the workings page says why. Same discipline as §1.1.

**One naming caution, and it needs a line on the workings page.** "Typical project duration" reads as a measured fact about projects. It is not — it is derived from the ratio of live to annual projects, so it describes portfolio throughput on the assumption of a steady state. A department mid-ramp-up or winding down gets a figure that describes its throughput rather than its projects. State the derivation plainly beside the figure: it is one line, it is true, and this release's whole position is that a derived number says how it was derived.

### 2.2 IT staff as a share of company — audit the benchmark before reinstating it

**This is the substantive work in PR3, and it is not "put the metric back".**

The metric was removed in an earlier revision of the specification on a premise that turned out to be wrong — I asserted no benchmark existed, having searched the project's documents rather than the tool's own source. It was reinstated. But that means the benchmark it is displayed against is **the last citation in this tool that has never been examined**.

The record so far, from citations we have examined: the 8–12 concurrent-projects convention was uncited and retired. The Jitbit "high-throughput remote tier-1" characterisation was unsupported and dropped. The Jitbit 480 turned out never to have been published by Jitbit at all — a day-to-month conversion presented as a sourced figure. Three for three. **Assume nothing about this one.**

**First, locate and report it.** Find the benchmark cited in the tool for IT headcount as a share of company employees. Report what the figure is, what source it names, and where in the file it is cited. Do not substitute a different source, and do not add one.

**Then audit it, to the standard the Jitbit check set:**

- What does the named source actually publish — the figure as we state it, or something we converted or derived from it?
- What population does it describe? All organisations, or a sector? What size band? Which country?
- What unit and denominator? IT staff per employee, per 100 employees, as a percentage, headcount or FTE?
- What year, and is a newer edition available?
- Is the source on the approved list — Panko, Microsoft first-party, Flexera 2023 Tech Spend Pulse, Jitbit, HDI/MetricNet, ProjexaR's own July 2026 analysis, ONS, gov.uk? If it is not, that is itself a finding.

**Apply the two standing rules from §3.6 of the spec.** A unit conversion is authorship: if our figure is in a unit the source did not publish, the conversion is ours and must be attributed to us with its basis stated. And quote the source in the unit the source uses.

**Then reinstate**, to the tiles, the numbers section, the workings page and the PDF:

```
it_share = roundN((it_staff ÷ company_headcount) × 100, 1)
```

- **Displayed against the benchmark, never uninterpreted.** The comparison is the point of the metric; a bare percentage invites a question the tool cannot answer.
- **Contractors are excluded from the numerator** per spec §3.2, and that exclusion is stated on the workings page.
- **Suppression:** `company_headcount = 0` or `it_staff = 0` → not computed.
- **Not rated.** This is context, not a capacity measure. No RAG state, no finding.

**If the audit disqualifies the benchmark** — it turns out to be a conversion, or to describe a population we cannot honestly compare against, or to be uncited — **stop and ask.** Do not remove the metric on your own judgement (that decision was already taken once on a bad premise and reversed), and do not display it uninterpreted.

### 2.3 Project definition (spec §4.3)

Add beneath the "Live projects right now" input:

> **A project is work that requires project management oversight** — someone with responsibility for holding the plan together, whether or not that person holds the title.

**Rejected, so it is not reopened:** "exclude minor works" — too subjective to apply consistently.

**Norm's call, not yours:** whether to add a sharper second filter using concrete criteria — expected to run beyond four weeks, or requiring more than one person. Flag it to him; do not implement it unasked.

No computation changes. But note in the PR description that this changes what a respondent counts as a project, so results either side of it are not strictly like-for-like. With no respondent population yet, that costs nothing — it is recorded so nobody later compares across the boundary without knowing.

### 2.4 Link preview (spec §4.4)

The report renders client-side, so a shared result URL currently previews blank in Teams and Slack and indexes blank.

**One static branded OG image. No per-result generation.** Document generation stays out of scope.

- `og:title`, `og:description`, `og:image`, `og:image:alt`, `og:url`, `og:type`
- `twitter:card` set to `summary_large_image`
- `og:image` must be an **absolute** URL — relative paths fail on most platforms
- Image 1200×630, and it lands in `public/`, which **is** published — unlike `tools/`. Confirm its size is sensible and that it is the only new asset the build picks up.
- The description is generic, not per-result. It describes the Capacity Check, not the reader's outcome.

**Verification is manual and post-deploy.** Teams and Slack cache OG data aggressively, so a first-attempt failure is usually stale cache rather than broken markup. Say so in the PR description so nobody re-edits working tags.

### 2.5 Optional — scope the `conservative` guard

PR2 added a suite assertion that fails if `conservative` reaches output. Correct for that release, but the word has a legitimate true use: the §2.11 bands statement's red threshold **is** deliberately conservative, and someone may want to say so.

If it is cheap, scope the assertion to the ticket-divisor block rather than all output. If not, leave it and note why here, so the next person meets a reason rather than a wall. A check that fails on true copy is a check that gets switched off — the same reasoning that took `about` and `around` off the copy-rule list.

---

## 3. Fixtures — two rows added to each

No new fixture. Extend 8.A, 8.B and 8.C with:

| Fixture | Typical project duration | IT staff as a share of company |
|---|---|---|
| **8.A** (live 45, annual 75, IT 45, headcount 1,200) | **7.2 months** | **3.8%** |
| **8.B** (live 16, annual 24, IT 24, headcount 600) | **8.0 months** | **4.0%** |
| **8.C** (8.A + 6 contractors) | **7.2 months** | **3.8%** — identical to 8.A; contractors are excluded from the numerator |

Everything else in all three fixtures is unchanged by PR3. If any other figure moves, something has leaked.

---

## 4. New shapes

- `annual_projects = 0` and `live_projects = 0` → duration suppressed with a stated reason, no `NaN`.
- `company_headcount = 0` and `it_staff = 0` → IT-share suppressed with a stated reason.
- `contractor_fte > 0` → IT-share unchanged from the same inputs with contractors at 0 (extends the 8.C invariance).
- The IT-share figure never renders without its benchmark beside it.
- OG tags present, `og:image` absolute, `og:image:alt` non-empty.

Carry forward every PR1 and PR2 shape, including the boundary ratios, toolset invariance and working-days invariance.

---

## 5. Two closing deliverables

PR3 ends the release. Both of these are the natural capstone and neither is expensive now.

### 5.1 A provenance table for every published number

Enumerate every number the tool publishes — tiles, findings, checks, numbers section, workings, conversion panel, PDF — and classify each as one of:

| Class | Meaning |
|---|---|
| **Input** | the respondent typed or selected it |
| **Computation** | derived from inputs by a formula the workings page states |
| **Cited** | published by a named source, in that source's own unit |
| **Converted** | derived from a cited figure by arithmetic of ours, with the basis stated and attributed to us |
| **Control** | ProjexaR's judgement, declared as such |

Every number must land in exactly one class, and nothing may be unclassifiable. This release found four figures that would have failed that test — the 8–12 convention, the Jitbit tier characterisation, the Jitbit 480, and an ASHE table reference that pointed at a table not containing the grouping it named. A fifth would be unsurprising, and this is how it gets found.

Put the table in the PR description. Whether any of it belongs on the page is a separate decision for Mark, not something to implement here.

### 5.2 The Sender payload manifest

Mark is reconciling his Sender configuration against what the tool posts, and the field contract is final as of PR2. Emit the authoritative list from the Worker source: **field name, type, an example value from fixture 8.A, and one line on what it means** — flagging in particular the fields that carry one endpoint of a range rather than a single figure, and `headroom`, which is signed and must never be a segment filter.

Read it from the source, not from recollection. Two fields in that payload were posting `null` for months and nobody knew.

---

## 6. Acceptance criteria

- [ ] Typical project duration replaces the turnover multiple in display; turnover is retained internally; the derivation is stated beside the figure.
- [ ] The IT-share benchmark has been located, audited against the §2.2 checklist, and reported — including what the source actually publishes and in what unit.
- [ ] IT-share appears in the tiles, numbers section, workings page and PDF, always beside its benchmark, never rated, with contractors excluded and that exclusion stated.
- [ ] All three fixtures reproduce §3 exactly, and no other figure in any fixture has moved.
- [ ] Every suppression shape passes; nothing renders `NaN`, `Infinity` or an unexplained blank.
- [ ] A shared report URL produces a link preview, with an absolute `og:image` and non-empty `og:image:alt`.
- [ ] The provenance table is complete and every number lands in exactly one class.
- [ ] The Sender payload manifest is read from the Worker source.
- [ ] The copy-rule check passes; every PR1 and PR2 assertion still passes.
- [ ] Nothing outside the Capacity Check HTML, `tools/`, and the one image asset has changed.

---

## 7. PR description must contain

1. **The IT-share benchmark audit** — what it is, what the source publishes, in what unit, for what population, what year, and whether our figure is that figure or a conversion of it.
2. The provenance table from §5.1.
3. The Sender payload manifest from §5.2.
4. Confirmation that every fixture number matched its independently computed expected value.
5. Whether the `conservative` guard was scoped or left, and why.
6. Whether the OG asset was available, and the note that preview verification is manual and cache-sensitive.
7. Anything you stopped and asked about, and what was decided.
