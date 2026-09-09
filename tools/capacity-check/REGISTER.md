# Claims register

Every external claim the Capacity Check publishes, and what stands behind it.

**Standing rule (PR7 §1.4).** Any commit that verifies, disproves or changes the
status of an item here **updates this file in the same commit**. A register that
lags the code is worse than no register, because it is trusted.

That rule exists because of what happened in this release. A register written on
4 September went stale on 4 September: PR1 verified Table S10 and used it to
replace a false claim, and nobody moved the row. Five days later a brief written
from the stale row halted a PR on a stop condition that had already been
cleared. The round trip cost more than the entry would have.

This file lives in the repo, not alongside the specification, for the same
reason. A register outside version control cannot be updated in the same commit
as the code it describes, so the rule above would be unenforceable.

**Asserted absences carry the same burden as asserted presences.** An entry that
says a source does *not* say something must name the search that produced it and
the scope that search covered.

---

## Verified

| Claim | Evidence | Where |
|---|---|---|
| **The bands are ProjexaR's management controls, informed by published research but not established by it** | `IT_Project_Manager_Concurrent_Project_Capacity_Research.pptx` slide 9, closing bullet: *"These thresholds are proposed management controls—not values established directly by academic research."* The page's opening line is a faithful paraphrase. Verified PR7. | Bands statement, opening |
| **5.0 and 7.0 are the deck's GREEN/AMBER/RED boundaries** | Slide 9: GREEN up to 5; AMBER 6–7; RED more than 7. Set on complexity, phase and dependency grounds, not derived from Colicev. Verified PR7. | Bands statement |
| **Colicev: 9,649 project-month-employee observations, 42 projects, 580 employees, inverted-U, point estimate 5.16, CI 3.57–6.19** | Colicev, Hakkarainen & Pedersen (2023) *SMJ* 44(2) 610–636, DOI 10.1002/smj.3443. Read in the published Version of Record. | Bands statement |
| **The paper tests whether a leadership role changes the benefit of multi-project work, and finds it does not** | Table S10. Coefficients MPW × Leadership Role −5.786 (12.818) and MPW² × Leadership Role −.010 (1.225), each smaller than its own standard error, against MPW 37.220 (9.636) and MPW² −3.625 (.710). Verified in commit `80a8cc2`, which used it to **replace a false asserted absence** ("the paper does not test whether that curve differs for managers"). See the artefact note below. | Bands statement |
| **Managerial responsibility appears in the paper only as an allocation check** | VOR §4.2 and Panels e–h: *"Managerial responsibilities and seniority are deduced directly from the job title if it contains the word 'manager' (e.g., project manager)"*, used to check allocation patterns. The main model's three moderators are specialized experience, project similarity and employee familiarity. Verified PR7. | Bands statement, item 2 |

### Artefact note on Table S10 (PR7 §1.2)

The rest of the bands statement was verified against the **published Version of
Record**, deposited at City Research Online (eprint 31695, labelled *Published
Version*: CC BY, © 2022 The Authors, Wiley typeset, "Strat Mgmt J. 2022;1–27").
Table S10's **coefficients** were read in the **accepted manuscript**, where the
table is numbered A-10.

Supplementary tables are the part of a paper most likely to differ between those
two versions, so PR7 checked. What was established:

- The **VOR's own main text names "Table S10"** — the number the page uses — and
  states the finding directly: *"we speculated that employee age and leadership
  role might alter the benefits of MPW. We found that none of these factors seem
  to matter as additional moderators (Table S10)."*
- "Table A-10" appears **0** times in the VOR; the renumbering between versions
  is confirmed rather than assumed.
- The **coefficients themselves could not be re-checked.** They live in the
  Supporting Information, a separate Wiley download that returns HTTP 403 without
  an institutional session; CRO deposits the article only.

So the substantive claim is now corroborated in the version of record's main
text, which is a stronger citation than the supplement. The four coefficients
remain verified against the accepted manuscript alone. **Not a blocker** — the
check found agreement, not divergence — but the row is not fully closed and
should be finished by anyone with Wiley access.

---

## Asserted absences

| Absence | Search that produced it | Scope, and what it excludes |
|---|---|---|
| **"The paper never models project management caseload as such"** | Full text of the published VOR, 27 pages, 72,755 non-whitespace characters, matched with whitespace collapsed so broken PDF glyph spacing cannot hide a term. `caseload` **0**; `project managers` **0**; `project manager` **2**, both as job-title examples inside the allocation analysis, never as a modelled quantity; main-model moderators are specialized experience (51), project similarity (25), employee familiarity (22), with no managerial or role term among them. | **Excludes the Supporting Information**, which was not retrievable. The absence is asserted over the article text only. This clause **concedes rather than claims** — it narrows our position — which is a different risk profile from the absences that caused trouble in this release. |
| **The deck establishes no intent about how 5.0 and 7.0 were placed** | All 29 XML parts of the .pptx carrying `<a:t>` text runs: all 17 slides plus layouts and masters. **There is no `notesSlides` part**, so there are no speaker notes. 10,815 characters. `confidence interval` **0**, `3.57` **0**, `6.19` **0**, `turning point` **0**, `deliberate` **0**, `understate` **0**, `manufactur` **0**, `conservat` **0**. | Complete for that artefact. The deck is **positive evidence against** the intent, not silence on it: slide 9 sets the bands on other grounds and slide 4 warns against reading 5.16 as a PM limit. |
| **No published study sits behind the BAU bands of 5.0 and 10.0** | Same deck search. `10.0` **0**, `per FTE` **0**. `BAU` appears once, slide 10, *"Keep 15–20% of nominal time unallocated for BAU"* — PM contingency, a different quantity. The deck is entirely about PM concurrent projects. | Complete for that artefact. Recorded so a future request to publish a derivation cannot pull the BAU bands into a research framing they have never claimed. |

---

## Withdrawn

| Claim | Why |
|---|---|
| **"7.0 sits above the interval deliberately: we would rather understate the problem than manufacture one"** | **Removed in PR7.** No source establishes the intent. The bands arrived already set on 3 September, attributed to the research as *supported by* rather than derived from it; the PR sessions verified Colicev, observed that 7.0 sits above the interval, and wrote the observation up as a decision. The deck settles it against us. The fact stays and the reader draws the inference: 7.0 > 6.19 is visible without being told what it was for. Guarded by two assertions in `check.mjs`, one of them sentence-scoped so a band value can never again appear beside an intent word. |
| **"The paper does not test whether that curve differs for managers"** | **Removed in PR1** (`80a8cc2`). Contradicted by Table S10, which does test leadership role as a moderator. Guarded by a negation. |
| **"We also do not find this pattern for managers"** as evidence the inverted-U fails for managers | **Never published.** The −.507 result sits in §4.2, a preliminary section whose regression has MPW as the *dependent* variable. It is about allocation, not performance. Guarded by a negation. |

---

## Open

| Claim | Status |
|---|---|
| The deck's amber and red bands carry triggers the tool does not implement — complexity, three or more high-intensity projects concurrently, sustained utilisation above ~85% | **Known simplification.** The tool implements the count trigger alone, which is legitimate. Nothing on the page implies it applies the deck's full policy, and nothing may. No assertion guards this; it is a copy risk, not a computed one. |
| Contractors are recorded as managed resources in the product | **Assumption**, from the free tier decision record's definition. PR7 §4.1 rests on it. |
