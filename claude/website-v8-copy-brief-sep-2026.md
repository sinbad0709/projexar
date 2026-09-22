# Website v8 alignment — copy brief

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`
**Target files:** `public/index.html`, `public/product/index.html`, `public/pricing/index.html`, `public/solutions/project-online-migration/index.html`
**Date:** 22 September 2026
**Baseline commit:** `00897cc` on `main`
**Scope:** copy only. The mockups stay in place until the v8 platform is ready for testing, so nothing here replaces an image or rebuilds a faux-UI block. §2.2 is the single exception, and it changes figures inside one existing mockup rather than rebuilding it, because the copy change in §2.1 would otherwise contradict the picture beside it.
**Branch:** one branch, all items below.
**Do not merge.** Push, report, and stop.

This brief implements the copy half of Mark's v8 analysis of the marketing site. The v8 specification itself is not in the repository; where this brief states what v8 says, it is restating that analysis, and §16 lists the two premises that are still to be confirmed with Norm.

---

## 0. Standing instructions

**0.1 Line numbers are as at `00897cc`.** Every replacement below quotes the current string in full. If a quoted string is not present byte-for-byte in the named file, **stop and report**. Do not search for a near match, and do not infer the intended target from the surrounding markup.

**0.2 British English throughout.**

**0.3 No em dash (`—`) in any string this brief adds.** The four target pages hold forty between them today: home 11, product 11, pricing 12, migration 6. Leave every existing one alone. A sweep is a separate decision; §13.6 records it as out of scope.

**0.4 The standing copy rules govern every new string.** No marketing fluff, no invented claims, no uniqueness assertions, no competitor citations, no ROI, breakeven or payback framing, and no claim that ProjexaR tracks actual hours. ProjexaR holds planned commitment.

**0.5 Capability card bodies are one sentence.** All twelve existing cards follow this. Where Mark's analysis supplies two sentences for a card, this brief has already cut it to the card's line and placed the remainder in the fuller section that covers the same ground. Do not restore the longer text.

**0.6 There is no render suite for the marketing pages.** `tools/capacity-check/` covers the Capacity Check only, and nothing in this brief touches it. `node --check` does not apply to HTML. Verification is §15.

**0.7 One pair must stay byte-identical.** The Forecast tab body exists twice, at `public/index.html:209` and `public/product/index.html:187`, and the two are byte-identical today. They must be byte-identical after §2. No other pillar body pair is identical and none of the others is in scope.

---

## 1. Forecast runs replace baselines

v8 replaces the capacity baseline with a dated, read-only forecast pipeline run. The word appears seven times across the site. **Six change. One must not.**

**1.1 The capability card.** `public/product/index.html:295-296`.

Current:

```
<h3 class="feature-card__title">Forecast baselines</h3>
<p class="feature-card__body">Save a dated baseline at a planning cycle and see what has drifted.</p>
```

Replace with:

```
<h3 class="feature-card__title">Forecast pipeline runs</h3>
<p class="feature-card__body">Save a dated, read-only forecast run and compare it with the current pipeline.</p>
```

**1.2 The heatmap footnote.** `public/product/index.html:225`.

Current: `Baselined 4 August 2026. Deltas are measured against that baseline.`

Replace with: `Forecast run of 4 August 2026. Deltas are measured against that run.`

**1.3 The Head of PMO role card.** `public/product/index.html:362` and `:364`.

Current at 362: `The portfolio, the forecast pipeline and the planning baselines.`
Replace with: `The portfolio, the forecast pipeline and the dated forecast runs.`

Current at 364: `Surplus and shortfall by role type by quarter, and the drift since the last baseline.`
Replace with: `Surplus and shortfall by role type by quarter, and the change since the last forecast run.`

**1.4 The Forecast tab body** carries the seventh and eighth occurrences, one in each file. They are absorbed by the rewrite in §2. Do not patch them separately.

**1.5 Do not change `public/solutions/project-online-migration/index.html:111`.**

`Historical baselines beyond what's in the files themselves`

This sits in the list of what does **not** come across from Project Online, and "baseline" there means a Microsoft Project baseline, not a ProjexaR forecast run. Renaming it would make the sentence false. If a repo-wide search tempts you toward it, this is the line the search is expected to return and leave alone.

---

## 2. The Forecast tab gains the pipeline model

**2.1 The paragraph.** The current text describes the outlook heatmap but not the pipeline that feeds it. It omits duration, priority, resource risk and the FTE gap.

Replace the body at **`public/product/index.html:187`** and **`public/index.html:209`** — the same replacement in both, byte-identical, per §0.7.

Current (both files):

```
Keep a live pipeline of proposed work with a forecast window, a likelihood and a resource model by role type. ProjexaR weighs the demand by how likely each item is, sets it against the capacity you actually have, and shows surplus or shortfall by role type by quarter on a capacity outlook heatmap. Save a dated baseline at a planning cycle and see how the picture has drifted since.
```

Replace with:

```
Model proposed work by start quarter, duration, likelihood, priority and the roles it will need. ProjexaR weights each item by how likely it is, sets it against the capacity you actually have, and shows the potential FTE gap by role type by quarter on a capacity outlook heatmap. Every item carries a resource-risk rating, so work that will need people you do not have is visible before it becomes a project. Save a dated forecast run at a planning cycle and compare it with the current pipeline to see what was added, converted or withdrawn.
```

Note the deliberate change from "weighs" to "weights", which is the correct term for likelihood weighting and matches the existing badge text `Weighted by likelihood` at line 192 of the product page.

**2.2 The unit in the mockup beside it.** The new paragraph says "potential FTE gap". The mockup alongside it is headed `Capacity outlook · surplus and shortfall in days` and its cells hold day counts. Left alone, the copy and the picture would state two different units on the same screen, and FTE is the unit v8 uses. The mockup stays; only its unit and its figures change.

Change the title at `public/product/index.html:191`:

Current: `Capacity outlook · surplus and shortfall in days`
Replace with: `Capacity outlook · surplus and shortfall in FTE`

Then replace the sixteen cell values at `public/product/index.html:202-223`, keeping every `heatmap__cell` class exactly as it is, so that the existing colour assignments still match the sign and severity of each figure, and keeping the U+2212 minus sign already in use rather than a hyphen:

| Role type | Q4 26 | Q1 27 | Q2 27 | Q3 27 |
|---|---|---|---|---|
| Infrastructure | +1.0 | −0.5 | −3.0 | −1.0 |
| Applications | −1.0 | −3.5 | −2.5 | +0.5 |
| Service desk | +1.0 | +0.5 | −0.5 | +1.5 |
| Security | −0.5 | +1.5 | +2.0 | +2.5 |

These are illustrative figures replacing illustrative figures, set at the scale the v8 capacity outlook screen uses, so that the mockup does not have to be re-scaled again when the screenshot replaces it. Do not change the role type names, the quarter headings, or the `Weighted by likelihood` badge.

---

## 3. Ask ProjexaR

The card describes a figure-retrieval tool. v8 defines a role-aware and screen-aware support assistant grounded in ProjexaR's own knowledge base, whose answers cite their source.

`public/product/index.html:306`.

Current: `Ask a question in plain language — ProjexaR answers with the figure behind it.`

Replace with: `Role- and context-aware help from ProjexaR's knowledge base, with a link to the source of every answer.`

The title at 305 does not change. Note that this replacement also removes an em dash, which is intended.

---

## 4. Costing language in replanning

v8 commits to impact analysis and resolution options. It does not commit to financial costing. The word survives in two places, and the second is the more prominent of the two.

**4.1 The capability card.** `public/product/index.html:286`.

Current: `Four routes out of a conflict, modelled and costed before you choose one.`

Replace with: `Four routes out of a conflict, each with its consequences, before you choose one.`

The Replan tab body at `:143` and `public/index.html:206` already names the four routes correctly and states that the project manager decides. It needs no change.

**4.2 The Replan pillar heading.** `public/product/index.html:140`.

Current: `Move something and see what it costs before you commit.`

Replace with: `Move something and see the consequences before you commit.`

This one was not in Mark's table. It is included because it is a section heading rather than a card line, so it is the most prominent surviving instance of the costing idea, and leaving it while removing the card's version would be inconsistent. **Report this change in its own line of your report** so that it can be reversed on its own if Mark wants the original heading kept.

---

## 5. Working patterns on the migration page

v8 guarantees project, user, assignment and allocation data on import. Each person's working week is onboarding setup, not an imported field, so the tick list currently over-promises.

**5.1 Delete the list item at `public/solutions/project-online-migration/index.html:97`** in full, including its inline `<svg>` tick, leaving the six items above it untouched. Those six already say what comes across.

**5.2 Add the qualifier to the exception report sentence** in the paragraph immediately below the list, which currently reads:

```
an exception report lists missing line managers, missing email addresses, incomplete project fields, duplicate records and any allocation that already exceeds 100%
```

Replace with:

```
an exception report lists missing line managers, missing email addresses, incomplete project fields, duplicate records, working patterns that need confirming, and any allocation that already exceeds 100%
```

This places the working-pattern point where the page already tells the reader what they will have to resolve, rather than adding a second qualifying sentence to a card that is already long.

---

## 6. Resource requests and resource gaps

The current card undersells two v8 workflows: searching the pool by role and availability, and raising a tracked resource gap when nobody suitable exists.

**6.1 `public/product/index.html:271`.**

Current: `Project managers request people; line managers approve or offer an alternative.`

Replace with: `Search the pool by role and availability, then request the person from their line manager.`

**6.2 Add a new capability card, "Resource gaps"**, immediately after the "Resource request and approval" card, following the existing card markup exactly, with `--accent:var(--viz-5)`:

Title: `Resource gaps`
Body: `Where no suitable person exists, raise a tracked gap that stays visible until it closes.`

---

## 7. Impact alerts

Automatic impact detection is a cross-module v8 principle and appears nowhere on the site. **Add a new capability card** after "Conflict detection", following the existing markup, with `--accent:var(--viz-3)`:

Title: `Impact alerts`
Body: `A change to availability, BAU or a plan flags the affected tasks before it is confirmed, and tells the managers involved.`

Mark's analysis specifies "in-app and by email". Email notification is not evidenced in any screen available to this brief, so it is omitted here pending Norm's confirmation. See §13.2.

---

## 8. Lifecycle phases

**8.1 Add a new capability card** after "RAID, RACI and RAG", following the existing markup, with `--accent:var(--viz-1)`:

Title: `Lifecycle phases`
Body: `Configurable phases each project moves through, with every phase change kept in the project record.`

**8.2 The five-dimension RAG model needs no change.** The Plan tab body at `public/product/index.html:70` and `public/index.html:205` already reads `RAG status against schedule, budget, scope, resourcing and risk`, which is the five dimensions v8 defines. Confirm this in your report rather than editing it.

---

## 9. Additional roles

The "Who sees what" section publishes four roles. v8 has more.

**Add a fifth role card** to the roles `grid-4` that opens at `public/product/index.html:330`, following the existing `role-card` markup, with the title `Additional roles`, and with the two key/value pairs replaced by a single body line:

```
Programme Managers see their programme portfolio. Project Resources update progress on the tasks they are permitted to. System Administrators manage users, roles and workflow configuration.
```

If the `role-card` markup cannot carry a single body without the `Owns` and `Sees` keys, report the constraint and propose the minimal markup change rather than inventing content to fill both keys.

**The ProjexaR Super Admin role is deliberately excluded.** See §13.3.

---

## 10. Getting started

**10.1 Step 01 body.** `public/product/index.html:382`.

Current: `MS Project, Excel or exported Planner plans — or use the import template if your data is scattered.`

Replace with: `MS Project, Excel, or Planner plans exported to Excel. If your data is scattered, start from the guided import template instead.`

**10.2 Add one line below the three steps**, inside the same `stack`, after the closing `</div>` of the `steps grid-3` that opens at `:378`, as a `<p>` in the page's existing small-print style:

```
A project missed at go-live can be imported on its own at any time.
```

The heading "Three steps to a live plan" stays. The new line is about what happens after go-live, so it does not make the count wrong.

---

## 11. BAU look-ahead and correction

The Declare tab already covers percentage, days, hours, presets, bulk apply and inheritance. What is missing is the enforced look-ahead and the fact that entries cannot be deleted, both of which are constraints rather than benefits and therefore belong in the page's voice.

**Append one sentence** to the body at `public/product/index.html:100`, after `...works it out the moment the number changes.`:

```
Every person must be set at least three months ahead, and an entry can be corrected but never deleted.
```

Do not change `public/index.html:207`. The home page carries the shorter version of this pillar deliberately, and §0.7 does not apply to this pair.

---

## 12. Pricing inclusions

The free plan's feature list omits the capabilities a buyer most wants reassurance about, which makes the paid card's "Everything else is the same as the free plan" carry weight it has not earned.

**Add four items to the free plan list** at `public/pricing/index.html:76-86`, after `Import from MS Project, Excel or Planner`, in the existing `<li>` style:

```
<li>Capacity outlook and forecast pipeline</li>
<li>RAID, RACI and RAG governance</li>
<li>Full audit history</li>
<li>Ask ProjexaR</li>
```

Nothing else on the pricing page changes. In particular, **do not add any sentence stating that capacity limits rather than feature tiers determine price.** See §13.1 for why, and the note in the covering message.

---

## 13. Decisions already taken

These were settled before this brief was written. Each is reversible, and each is called out so it can be argued with rather than discovered later.

**13.1 No statement of the pricing principle.** "Capacity limits, not feature tiers, determine price" is a forward commitment, and feature gating beyond MVP is undecided. The inclusion list in §12 gives the buyer the same reassurance and commits to nothing about later releases.

**13.2 "By email" omitted from impact alerts.** No available screen evidences email notification. §7 states the in-product behaviour only.

**13.3 ProjexaR Super Admin not published.** Naming it on a customer-facing roles section tells a prospect that ProjexaR staff hold a privileged role inside their tenant. That is a Trust page disclosure with scope and safeguards attached, not a role card. The role also does not appear in the role switcher of any v7 mockup, which is consistent with it being internal.

**13.4 No fifth pillar tab.** The four tabs are the same component on the home and product pages. A fifth on the home page alone contradicts the heading "Four things it does, end to end" and desynchronises the two. The "Respond" content is held for the media brief, where it becomes a section of its own anchored to the Line Manager screen.

**13.5 Card bodies kept to one line**, per §0.5.

**13.6 The em dash sweep is out of scope.** New strings carry none; the forty existing ones stay.

---

## 14. Held until the v8 platform is ready for testing

Every mockup on the site stays as it is. Screenshots will be captured from the built v8 platform rather than from the v7 mockup set, and the media brief follows then. Nothing in this brief touches the following, and they are listed so that you do not treat their absence as an oversight: the home hero visual and its caption; the Forecast pipeline and Capacity outlook screens; the Ask ProjexaR assistant panel; the Update BAU allocation screen; the Gantt and conflict-resolution visuals; the "Respond" section; and the replacement of faux UI across the product and migration pages. §2.2 is the one figure change, and it keeps the mockup rather than replacing it.

Appendix A lists what the site will need captured, and is for Mark and the build team rather than for you.

---

## 15. Verification

No figure on any page changes in this brief. If any of your edits changes a number, stop and report before continuing.

Report each item as `file:line` before and after. Then run and report all five of these:

**15.1** A repo-wide search for `baseline` under `public/`, excluding `public/capacity-check/`. Expected: exactly one result, `solutions/project-online-migration/index.html:111`, unchanged.

**15.2** A repo-wide search under `public/` for `modelled and costed`, `the figure behind it`, `Working patterns`, and `what it costs`. Expected: zero results for each.

**15.3** A byte comparison of the Forecast tab body in `public/index.html` and `public/product/index.html`. Expected: identical.

**15.4** A search for `—` restricted to the lines this brief added or replaced. Expected: zero. Report the whole-file counts as well, which should have fallen from 11/11/12/6 by the two the brief removes, at product:306 and product:382.

**15.5** The capability card count on the product page, before and after. It was twelve. Three cards are added by §6.2, §7 and §8.1, giving fifteen in a four-column grid. **Report how the last row renders at each breakpoint** and propose a fix if it reads badly. Do not remove a card to make the arithmetic tidy, and do not add a sixteenth to balance it.

---

## 16. Two premises to confirm before merge

Neither blocks your work. Both are Mark's to settle with Norm, and both are recorded here so that the branch is not merged on an unchecked assumption.

**16.1 The baseline rename.** The v7 mockups still use baseline language throughout: the Forecast pipeline screen has a run named "Q1 planning baseline" and a status of "Baselined", and the Capacity outlook screen has a section headed "Forecast baselines" with a "Capture baseline" button. The likeliest explanation is that the mockups predate v8. If instead v8 kept the term, §1 and §2 rename the site away from the product's own language and must be reverted.

**16.2 Email notification** on impact alerts, per §13.2.

---

## 17. Report format

One report, in the order of this brief, naming for each item the file, the line before and after, and the search that establishes it. Flag §4.2 separately. Then §15's five checks, each with its command and its output. Then anything you could not do as specified, with what you would need.

---

## Appendix A. Screenshots the site will need from v8

Not for Claude Code. This is the capture list, written now so that the v8 test build is photographed once rather than three times.

**Already held in the v7 mockup set, and needing a v8 retake rather than a first capture:** Line Manager my team; Update BAU allocation; Forecast pipeline; Capacity outlook; Audit log; Portfolio overview; Projects by lifecycle phase.

**Not held in any form, and needed for a slot the site already has:**

| Slot | Screen to capture | Why the site needs it |
|---|---|---|
| Product, Plan tab | Tasks and schedule, with the Gantt, a dependency chain and a dragged task | The most load-bearing visual on the page, currently faux UI |
| Product, Replan tab | Conflict detection with the four resolution routes on screen | The page's central claim, currently faux UI |
| Product, Forecast tab | A single forecast run opened, showing start quarter, duration, likelihood, priority and resource-risk rating per item | The pipeline model §2.1 now describes. The run list alone does not show it |
| Product, capabilities | Ask ProjexaR open, showing an answer with its cited source and the route to support | §3 claims cited answers. The collapsed tab does not evidence them |
| Product, capabilities | An impact alert in context, at the moment a change is made but before it is confirmed | §7 claims detection before confirmation |
| Product, Respond section | Line Manager home, KPI tiles and Critical events, and the activities log open | The deferred "Respond" section is built around this |
| Migration page | The import exception report | The page describes it in detail and shows nothing |
| Home hero | Line Manager my team, cropped to the attention tiles, the BAU and project columns and one over-allocation | Replaces the illustrative hero graphic |

**Capture standards, learned from the v7 set.** One fictional company and one cast of people across every screen, because the site's current mockups use a different cast (Priya Raman, Tom Byrne, Ravi Menon, Dee Okafor) from the v7 screens (J. Hart, M. Singh, P. Torres, L. Chen), and a page that mixes the two reads as two products. Dates that are real: the v7 Line Manager screen is headed "Friday 4 July 2026", and that date was a Saturday. Counters that agree with the table beneath them: the same screen's tile reads "4 Resources on live projects" above six rows carrying a project, and both the exception tile and the critical events panel claim two people over-allocated where one is flagged. Labels that match their figures: the v7 Capacity outlook reads "−9.5 Worst quarter FTE", but no quarter in its own grid sums to that, while −9.5 is exactly the Developer row's four-quarter total. One viewport width and one theme throughout. No missing glyphs: the screenshot currently on the home page renders two as empty boxes.
