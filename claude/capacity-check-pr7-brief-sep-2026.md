# PR7 — The audit response

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`
**Follows:** PR6, merge state to be confirmed before branching
**Target file:** the Capacity Check HTML, plus `tools/capacity-check/`
**Date:** 9 September 2026
**Revision:** 2, 9 September 2026. Revision 1 held the bands provenance open; revision 2 records what was established and lifts the PR6 protection for one clause.
**Reads with:** `claude/capacity-check-change-spec-sep-2026.md` (master), `claude/capacity-check-handover-sep-2026.md`

An independent auditor's report was received on 9 September. This brief is the response to it. Where the audit is accepted, the section says so and specifies the change. Where it is rejected, the section says so and gives the reason, so nobody reimplements it later from the audit itself.

**Who the auditor is, and how to read them.** An independent reader working the tool as an IT manager would, with no knowledge of any of this. They cannot see the specification, the fixtures, the routing tables or the reasons. That changes how their report is used:

- Where the auditor misread the tool, **the page failed, not the reader.** Every misreading in the report is a defect report about the copy. None of them is dismissible on the grounds that the reader should have known.
- Where the auditor is factually wrong about a mechanism, say so here and fix the sentence that misled them. Both, not one.
- Their observations about what a reader feels at a given point in the page are the closest thing to respondent data this product has. There are no real respondents yet.

**Something they saw does not match current `main`.** Their §1 item 5 asks for a rename PR5 already made, to the name PR5 chose, and PR5 is merged and verified live. An independent reader can only report what was served to them. Either a stale build is reachable, or a stale artefact is cached, or the rename did not fully land. §2.1 is the gate and it is a stop condition.

Their opening also states that generated values did not render for them, yet §5.8 quotes figures. Treat every factual claim in the audit as a hypothesis about the file until §2 confirms it.

**The numeric invariant.** No number moves in this PR, with one exception: the licence quote, and only where `contractor_fte > 0`, and only if §4.1 is approved. State the invariant, then measure it. Do not predict which numbers will move.

**Do not merge.** Push, report, and stop.

---

## 0. Standing constraints

Everything in §0 of the master specification still applies without amendment. Three additions, all from the audit and all accepted:

11. **At most one asserted inference per finding.** Everything else is conditional. "If that is happening, this is where it shows up" reads as expertise. Four assertions in a row about a department nobody has seen reads as a script.
12. **We and ProjexaR make judgements. This report is an artefact and never the actor in a decision.** "The check never counted them" attributes to software a choice a person made. Write "We do not count them, because...".
13. **No sentence may place the cost of adding staff beside the price of the licence.** This is a new face of the §0.3 ban. The audit's growth-ceiling proposal walks straight into it, which is why §9.2 defers that item rather than accepting it.

---

## 1. Before you write anything

1. **Confirm PR6's merge state.** It was pushed with three final changes and may or may not be on `main`. Branch from `main`, named `pr7-audit-response`.
2. Re-bless the baseline from current `main`.
3. Enumerate the conditionals this PR touches and confirm a shape exercises each side before writing fixtures. The branches that matter here are: `contractor_fte` zero and non-zero, the binding route of the growth ceiling (PM, BAU, and differing between endpoints), and the presence or absence of the optional inputs.

---

## 2. Verification gates — answer all seven before changing anything

Report the answers in one block. Three of them can stop the PR.

**2.1 What did the auditor see? STOP CONDITION.**
An independent reader reported a section name that PR5 changed and that is live on `main`. Find out how. Check, and report on, each of: any second copy of the tool reachable on the site, including the August standalone HTML and anything under an old path; the Cloudflare cache and asset versioning on the check's route; whether the rename landed in the print report as well as the web report; and whether any downloadable artefact is generated from a template that PR5 did not touch.

**If a stale build or a stale print template is publicly reachable, stop and report.** That is a live defect ahead of everything else in this brief, and it means some readers are being served a version this release already corrected.

**2.1b The bands statement, and a possible register breach. STOP CONDITION.**
The audit says four things follow the bands statement, and names one of them as a leadership-role test. The approved statement in master §2.11 has three, and the Table S10 leadership-role result is marked **UNVERIFIED** in the register and barred from publication.

Read the live bands statement. If it contains any sentence about leadership role, age, or Table S10: **stop, report immediately, and change nothing else.** An unverified claim has reached publication.

If it does not, the auditor read three sentences as four. **That is still a fix.** A careful reader miscounting a numbered list is the list's fault. Number them, or replace "Three things follow, and we state all three" with a form that does not commit to a count.

**2.1c The bands provenance — read the deck. STOP CONDITION on its finding.**
Open `IT_Project_Manager_Concurrent_Project_Capacity_Research.pptx`, all seventeen slides. You read it during the PR3 search for the IT-share benchmark.

Report, verbatim where it matters: **does the deck state how 5.0 and 7.0 were arrived at?** Quote what it says about each. Report separately whether it says anything at all about the BAU tile's 5.0 and 10.0.

Do not infer. If the deck cites Colicev as support without deriving anything from it, say that. An asserted absence needs the same evidence as an asserted presence, so name what you searched and its scope. §3 branches on your answer.

**2.2 Do the four steps exist?**
The audit refers throughout to "the four steps" or "four no-software steps" in the print report, and quotes step 4 as "agree what triggers a renegotiation". Nothing in the master specification creates such a section. Confirm whether it exists, report its heading and the four step headings verbatim, or report that it does not. Do not assert its absence without naming the search you ran and its scope.

**2.3 Does `ct` always serialise?**
The audit says the contractor count is missing from at least one generated share link. Reproduce or refute. Report the exact path that drops it, if any.

**2.4 Technician or agent?**
Report every place in output where either word appears. Both cited sources publish "technician": HDI/MetricNet on desktop support technicians, Jitbit on 21 per technician per day.

**2.5 Which headings mean "figures"?**
List verbatim every heading in the web report and the print report that names figures, numbers, or workings, in document order, with the section each introduces.

**2.6 Print rendering.**
Render the print report to PDF and confirm whether the running header collides with section headings, as the audit reports for "Your numbersProjexaR Capacity Check".

**2.7 Endpoint discipline. STOP CONDITION if it fails.**
The audit quotes a full portfolio cost of £1.24m in one section and a ProjexaR share of 0.18% in another. Against the real ASHE-derived loaded cost those are the low endpoint of one range and the endpoint derived from the high end of the other. Either the auditor collapsed two ranges in opposite directions, which is their error and needs no fix, or the tool is publishing single figures where master §0.6 requires a range.

Check every published figure derived from the banded time input and confirm each renders as a range. If any renders as a single value, that is a live breach of §0.6 and takes priority over everything else in this brief.

---

## 3. The bands — the credibility block

This is the highest-value section in the PR. The audit is right that the sourcing for the ratings sits behind the email gate, and the handover already had this as its first open item. Since the audit was received, a second and larger problem has been found inside the statement itself.

### 3.0 The intent claim — the PR6 §6 protection is lifted for one clause

**Established 9 September.** The bands arrived already set, in the remediation brief of 3 September, attributed to the ProjexaR August 2026 research and its underlying references, of which Colicev is one. The brief's word was **"supported by"**, not "derived from", and nobody examined the difference.

What the PR sessions did was verify Colicev independently and then *observe* that 5.0 sits at or just below the turning point and 7.0 sits above the upper bound of the interval. Spec §2.11 then wrote that observation up as a decision:

> "our red threshold of 7.0 sits above the top of that confidence interval, **deliberately**: we would rather understate the problem than manufacture one."

**There is no evidence for the intent.** It may well be true, and §2.1c is how we find out, but as it stands the strongest trust claim the tool makes is an unverified assertion about our own reasoning, written in the confident register. That is the third instance of this failure in the release, and it is inside the one paragraph marked untouchable.

**The PR6 §6 protection is lifted for this clause and this clause only.** Every other word of the statement, and the whole of the rest of the §6 list, stays protected. Branch on §2.1c:

| §2.1c finding | Action |
|---|---|
| The deck derives 5.0 and 7.0 from the turning point and interval | Publish the derivation **in the deck's own terms**, not in ours. Keep the intent wording only if the deck states the intent |
| The deck sets the bands on other grounds and cites Colicev as support | Replace the clause with the fact and drop the intent: **"These bands are ProjexaR's controls. Our red threshold of 7.0 sits above the top of that confidence interval."** Let the reader draw the inference |
| The deck does not establish it either way | Same replacement as the row above. Then stop and ask, so Mark or Norm can say whether they remember setting it that way |

The same question applies to **5.0**. If it was not set from the turning point, then describing it as green at the turning point is equally post-hoc. Do not write a derivation for one band and leave the other implied.

**Do not let this pull the BAU tile into a research framing.** The BAU tile's 5.0 and 10.0 have never claimed a research basis and must not acquire one here. See §3.2.

### 3.1 Move the bands statement onto the web report

`pr-derivations` and the caveat layer sit inside `#printReport`, which is `display:none` outside `@media print`. A reader on screen never sees the justification for the rating they are being shown.

**Move the bands statement out of the gated block and onto the web report**, at the point where the ratings are first published. It is not a caveat on a figure; it is the reason to believe a badge, and the caveat test in the PR6 brief does not cover that category.

**No word changes in the move.** The only permitted edit to this statement is the one §3.0 specifies, and it is a separate, separately reported change. Make the move first and assert the text is byte-identical after it. Then apply §3.0 and assert that exactly one clause differs.

The rest of the caveat layer stays where it is, subject to §7.

### 3.2 Say which band the study informs

The audit's strongest single finding: the live-projects-per-effective-BAU-FTE band of 5.0 and 10.0 has no derivation anywhere. It carries the same visual weight as the PM band, sits beside a DOI, and inherits credibility it has not earned.

Add one sentence to the methodology, adjacent to but outside the protected statement:

> The study informs the bands on concurrent projects per project manager. The bands on live projects per effective BAU FTE are ProjexaR's controls. No published study sits behind them.

This is an addition, not a rewording, and it is the one item in §3 that ships whatever §2.1c returns.

**Three words that must not appear in it:** any claim that the two sets of bands share a basis, a method or a posture. The BAU bands have never claimed a research basis. A sentence written to be honest about them must not be the sentence that quietly gives them one.

### 3.3 The derivation of 5.0 — resolved into §3.0

The audit asks the page to say the amber line is the point estimate rounded down. **Do not write that sentence unless §2.1c produces it from the deck.** It is a claim about how a decision was made, and the answer to the audit's request is the same as the answer to the intent clause: publish the derivation if one exists, publish the fact if it does not, and let the reader draw the inference either way.

Note what the audit was actually asking for, because the honest version still delivers it. The reader wants to know that the numbers on the badge came from somewhere. Two figures and an interval, stated plainly beside two thresholds, does that. It is the assertion of intent on top that adds nothing a reader needs and everything a reader could catch us on.

### 3.4 The growth ceiling and the conservative threshold

**HELD, and the reason is §3.0.** The audit asks for one clause saying that because 7.0 is conservative, the ceiling is generous and the gap is understated. That clause rests entirely on the intent claim. If we cannot say 7.0 was set conservatively, we cannot say the ceiling inherits the conservatism. Do not implement it unless §2.1c establishes the intent.

There is a second condition on top, which holds even then: the clause is true **only when the PM route binds.** The BAU cap of 10.0 carries no conservatism claim, per §3.2, so a ceiling bound by the BAU route inherits nothing.

If and only if both conditions are met, implement it as:

| Binding route | Behaviour |
|---|---|
| PM at both endpoints | Render the clause |
| BAU at either endpoint | Do not render it |
| Route differs between endpoints | Do not render it |

Add a render-suite shape for each row. On fixture 8.A the PM route binds at both endpoints, so the clause renders; on 8.B it also binds, so it renders there too. Construct a shape where BAU binds and assert the clause is absent.

### 3.5 The pointer with nowhere to point

Handover item 3. The ticket check says the workings page sets out two qualifications and the on-screen reader has no workings page. Resolved by §3.1 if the qualification moved with the bands statement. If it did not, either move it or rewrite the sentence to state both qualifications inline. Report which you did.

### 3.6 The stale citation gloss — deadline 30 September

The Sources row reads "Microsoft product notices: Project Online retires 30 September 2026". Change to the tenseless form: **"Project Online retirement, 30 September 2026"**. The finding body was corrected already; only the Sources row is left. This must ship before 30 September or the page dates itself.

---

## 4. Contractors

### 4.1 The licence basis — MARK'S CALL, recommendation: include

Master §3.2 row six excludes contractors from the licence basis and the quote. The audit says that is a commercial error, and it is right. A managed resource is a person with capacity recorded in the system, and a contractor working on projects has capacity recorded. Quoting 25 to a department that will licence 27 understates the price in a report whose thesis is that the reader is undercounting.

**If approved:** the licence basis becomes BAU staff on projects + PMs + contractors. Every other row of §3.2 is unchanged. Contractors stay out of the cost calculation, out of the rated tile, out of the growth ceiling, out of the run/change derivation and out of the IT-share calculation.

Numeric impact: none on fixtures 8.A to 8.F, all of which set contractors to zero. That is why this change is cheap and also why the defect survived. Fixture 8.G in §10 is the gate.

### 4.2 Say why contractors sit outside the rated tile

The audit argues contractors should be inside delivery capacity and that excluding them understates capacity. **Rejected** — see §8.1. But the auditor is a careful reader who reached that conclusion anyway, which means the page is not explaining itself. Add one sentence beside the unrated contractor figure:

> The rated figure measures how far the portfolio leans on permanent BAU capacity. The figure beside it adds your contractors and carries no rating, because the bands are set against permanent capacity.

**Do not use the audit's proposed wording.** It says contractors "are already paid out of budget", which states what the respondent's budget contains. Master §3.2 requires the exclusion be stated in terms of what we exclude, never in terms of what we assume they hold. That assumption is in the unverified column of the register.

---

## 5. The error table

Audit §1, item by item. Fix only what §2 confirms.

| # | Audit claim | Verdict | Action |
|---|---|---|---|
| 1 | Three things follow, four are given | **Accepted either way** | Gated on §2.1b. If four, stop and report a register breach. If three, a careful reader still counted four, so number them or drop the count. Do not close this as "the auditor miscounted" |
| 2 | Technician and agent both used | **Accepted, different fix** | Use **technician** in output. Both sources publish it, and the standing rule is that each source is quoted in its own terms. The audit's "agent is the ITSM norm" would misquote both. The spec's internal name for the divisor is unaffected |
| 3 | Running header collides | **Accepted** | Gated on §2.6. Fix the print stylesheet |
| 4 | Four headings all mean figures | **Accepted** | Gated on §2.5. Collapse to two. Report the before and after list |
| 5 | Two near-identical section names | **Already fixed** | PR5 renamed the promoted section to "What your plans would show instead". No action. Evidence the audit predates PR5 |
| 6 | STATED badge sits in a RAG sequence | **Accepted** | It is an observation, not a severity (master §3.8). Remove the badge and set the block apart typographically. Do not introduce a fourth badge word |
| 7 | "The failure mode is rarely the original agreement" appears twice | **Accepted** | Gated on §2.2. Keep it in the steps if they exist, otherwise keep it in the tile. Cut the other |
| 8 | `ct` missing from a share link | **Accepted, highest priority in this table** | Gated on §2.3. A share link that drops an input renders a different report for the second reader. Add a round-trip shape asserting every input survives encode and decode, not only `ct` |

---

## 6. Copy

The PR6 §6 protected list stands unchanged. Nothing in this section may touch it.

### 6.1 The two new standing rules

Apply §0.11 and §0.12 across all output. The audit names four inferences in one paragraph as the worst case: "almost certainly booked across several plans", "where two projects quietly double-book the same person", "broadly known but not something you would rely on", "decisions get made against a picture already out of date". Keep one. Make the rest conditional.

### 6.2 Managed resource

Accepted. The billing unit stays "managed resource" on the pricing page and in the licence line. In report prose, use people: "You would licence the 27 people currently on project work, not your whole IT department of 45." Nothing is lost, and the sentence argues about people whose line managers own their time, which is a human claim in a human word.

### 6.3 Repetition

Cut what is said twice. The audit names the input restatement appearing five times as the worst instance, and it is right: state the effective FTE and the band once, then refer to "that capacity". PR6 §4 asked for this pass and it did not fully land.

### 6.4 Length — the target is rejected, the cuts are accepted

**Do not work to a 1,000 to 1,200 word target.** PR6 rewrote this copy four days ago and placed several caveats inline under a deliberate test. A 40% cut applied on top of that will take out qualification, because qualification is what looks cuttable.

Make the three cuts the audit names, all of which are repetition or padding rather than qualification: the input restatement, the AT RISK "no single current view" block reduced to three points, and the ticket composition block reduced to its single sentence. Report the word count before and after. Whatever it lands at is what it lands at.

**No caveat placed inline by PR6 §3 may move to the workings page without re-applying the PR6 §3 test and reporting the result.**

### 6.5 The epigram pattern

Accepted in moderation. The pattern is audible and the audit is right to hear it. **Cut two, not four**, and never cut one that carries a limitation. "The internal figure is a floor, not a total" and "that is a question of which ledger it lands in" both do real work and stay.

---

## 7. The report that gets forwarded

The audit's §5 is its best contribution and its central claim is correct: the web report and the print report have different readers, and the print report's job is to survive a sceptical read with nobody there to defend it. The consequence the audit draws is the right one. **The print report sells less than the web page, not more**, because the reason the sender forwards it is that it does not argue for a vendor.

### 7.1 Print report order

Reorder to:

1. Cover: title, date, and one line — *Prepared from estimates provided at [date]. A directional check, not an audit.*
2. Provenance, page one. Where the figures came from, attributed to the respondent's own answers.
3. Executive summary, one page, three figures at most.
4. The findings, with the bands statement and citation inline where the threshold is used.
5. The steps, if §2.2 confirms they exist.
6. Workings and sources in full.
7. ProjexaR, one page, last.

**Do not invent an organisation name for the cover.** The tool does not collect one and the email domain is not a company name. If the gate collects a name, use it; otherwise the cover carries the date alone.

**Every figure in the executive summary is computed, never written as a constant.** Assert that a shape with different inputs produces a different summary.

### 7.2 Ask-agnostic

Accepted, and it costs nothing because it is a removal. The sender's reason for forwarding varies: awareness, a resourcing case, sign-off, or putting a known risk on the record. A report that presumes one is wrong for the other three. Keep the ask out of the report body. ProjexaR's page stays last and states what it does and what it costs.

### 7.3 One covering note

The audit proposes three selectable covering notes. The concept is accepted; the implementation is deferred to PR8 with the selector. **Ship one neutral note in the email body** for now.

The audit's three drafts cannot be used as written. Each breaches master §5: "roughly £Xm" uses a barred hedge and the hedge is ours, not a source's. Any note shipped must pass the copy-rule check and must carry computed figures, not placeholders.

### 7.4 The link alongside the file

Accepted. Issue the shareable result link in the same email as the PDF. It is cheap, the URL already exists, and it keeps the trial path one click from the second reader where a PDF is terminal.

**Conditional on §2.3 and §5 item 8.** A link that drops an input is worse than no link. It must open on the results with the inputs above them, collapsed and editable. Confirm it does; if it opens on an empty form, that is the first thing to fix.

### 7.5 A second CTA, additive

Add one further route to the trial, lower on the page, beside the cheapest thing the reader can do without buying anything. If §2.2 confirms the steps exist, it sits after step 1. If not, it sits after the checks block, which is the point at which the reader has been shown something a spreadsheet cannot do.

Constraints:

- The existing panel does not move and does not change.
- Plain link or button, not a second panel. Two conversion boxes on one page reads as pressure.
- Same offer wording as the existing panel, exactly. Two different descriptions of one offer is the contradiction already open on `/start`, reproduced inside a single page.
- No price beside it. The price is stated once, in the panel.

---

## 8. Rejected, with reasons

Do not implement these. They are recorded here so that nobody reads the audit later and implements them without seeing why they were declined.

**8.1 Contractors into rated delivery capacity.** The tool already publishes a contractor-inclusive figure, unrated, beside the BAU tile. The auditor appears not to have seen it, which is itself a finding and is why §4.2 adds the explanation. On the substance: master §2.6 requires the growth ceiling's divisor to be the same divisor the rated tile publishes, so moving contractors into the tile moves them into the ceiling, and a ceiling that projects forward on transient capacity is a worse number than the one it replaces. The rated tile measures dependence on permanent capacity. That is a definition, not an oversight.

**8.2 The delegated-authority line.** Rejected on three grounds. It asserts what the reader's own approval threshold is, which is the overreach the auditor's own §6.2 rule forbids. The arithmetic is wrong: 27 resources at £10 is £270 a month, not £290. And quoting a monthly figure beside a share-of-spend calculation stated on the annual plan reintroduces the gap that master §3.7 closed. State the price plainly and let the reader judge their own authority.

**8.3 "At this caseload the cost usually shows up first as dates moving, and later as the people carrying it leaving."** Rejected as written. "Usually" is an unsourced causal claim about a population we have not observed, delivered in the confident register. The underlying point is fair: nothing in the report connects any of this to a consequence anyone reacts to. A defensible version is conditional and belongs to Norm's wording, not to CC's. Raise it; do not draft it.

**8.4 Moving the trial CTA.** *Moving* it is rejected. PR5 placed the conversion panel four days ago for a stated reason, and moving it again on one reader's report is thrash.

**But the reader's observation is accepted and acted on in §7.5.** They report that the CTA lands where the problem feels too large for a trial to touch. That is the only account anyone has of how this page reads to an IT manager, and it costs nothing to answer additively rather than by moving anything.

**8.5 Standardising on "agent".** See §5 item 2.

**8.6 The purpose question posted to Sender.** Deferred, not rejected on merit. The Sender reconciliation is already overdue, two fields carry one endpoint of a range, and the RAG nurture split was calibrated on bands that have moved. Adding a field before that pass lands makes the reconciliation harder to reason about.

**8.7 The audit's characterisation of the offer.** The audit describes a full-product 14-day trial for ICP accounts and 5 managed resources free forever below that, as two offers split by segment. That is not the decision. The decision of 1 September is one sequence: a 14-day sandbox in the customer's own tenant, which contracts to 5 managed resources free forever on day 14. There is no segment test. The real contradiction is that projexar.com/start still promises two projects free forever while the check says "Unlimited 14-day trial", and that is a launch blocker outside this file, already logged.

---

## 9. Deferred to PR8

**9.1 The project manager time-share input.** The audit's best structural finding and it is correct. The tool counts each PM as a full FTE of change work while §4.3 of the master defines a project as work requiring oversight "whether or not that person holds the title", which invites part-time PMs. Where PMs are part-time, the internal cost figure is overstated and the caseload picture is flattered, in opposite directions, from one missing question.

It is deferred rather than declined because it is not a contained change. As a band it multiplies through `internal_project_fte`, hence the full cost, the corroboration check, the share of full cost and both fixtures. Every expected value in §8 of the master would need re-deriving, and a PR that moves every number is exactly the shape that hid three defects in this release.

**One design note for PR8, decided now:** the input routes to the FTE and cost quantities only. **It must not become the divisor of the PM tile.** The study behind that band counts concurrent projects per person, so dividing by PM FTE would break commensurability with the source that justifies the band.

**9.2 Three priced options against the growth ceiling.** The structure is good and the audit is right that "17 projects a year above your sustainable pace" invites "so what". It is deferred because the obvious implementation puts the cost of adding a project manager next to the licence price, which is §0.13 and one inch from a payback claim. The cheap half already exists: master §2.6 requires the binding route to be named, so the reader is already told which lever moves the number.

**9.3 The three-note selector.** Per §7.3.

**9.4 The stated 14-day outcome.** "Unlimited 14-day trial" is a duration, not an outcome, and the audit is right that an outcome converts better. But the sentence would be a claim about what the product delivers in fourteen days, and the product is pre-MVP. Norm's wording, and only once the MVP scope is fixed.

---

## 10. Fixtures

Existing fixtures 8.A to 8.F are unchanged and every figure in them must reproduce exactly.

**8.G — contractors present. New.** Fixture 8.A inputs with `contractor_fte = 2`.

| Figure | Expected |
|---|---|
| BAU tile ratio and rating | Identical to 8.A. Contractors change nothing rated |
| Growth ceiling | Identical to 8.A |
| Internal effort cost and full portfolio cost | Identical to 8.A |
| Derived run and change share | Identical to 8.A |
| IT staff share | Identical to 8.A |
| Contractor-inclusive delivery figure | Rendered, unrated, with the §4.2 sentence |
| Licence basis | **27** if §4.1 is approved, 25 if it is not. Report which you implemented |
| Share of reported spend | Recompute from the licence basis actually used and report it |

The point of 8.G is that exactly one figure moves. If a second one moves, contractors have leaked into a route §3.2 excludes them from.

**New shapes.**

- The bands statement renders on the web report, outside `#printReport`, byte-identical to its pre-move text.
- The growth-ceiling conservatism clause: present when PM binds at both endpoints, absent when BAU binds at either, absent when the routes differ.
- Share URL round trip: every input encodes and decodes, asserted field by field, not `ct` alone.
- The executive summary's figures change when the inputs change.
- The word "agent" does not appear in output; "technician" does, where the sources are quoted.
- The string "480" still does not appear anywhere in output. That guard stays.

---

## 11. Acceptance criteria

- [ ] All seven §2 gates answered in the report, with the two stop conditions cleared.
- [ ] Zero numeric change across all shapes, except the licence quote in 8.G.
- [ ] The bands statement renders on the web report and is byte-identical after the move, before §3.0 is applied.
- [ ] Exactly one clause of the bands statement differs after §3.0, and it is the clause §3.0 names. Nothing else in PR6 §6 is reworded. Nothing in master §10 is reopened beyond §4.1, which the audit gave a reason for.
- [ ] No claim of intent about how any band was set survives anywhere in output unless §2.1c produced it from the deck.
- [ ] The scoping sentence in §3.2 is present, names which band the study informs, and gives the BAU bands no basis they do not have.
- [ ] The conservatism clause is absent unless §2.1c established the intent, and where present obeys the binding-route table with a passing shape for each row.
- [ ] The second CTA in §7.5 uses the same offer wording as the existing panel, with no price beside it.
- [ ] The Sources row is tenseless.
- [ ] No em-dashes in output. Every en-dash in a number range survives.
- [ ] The copy-rule check passes, and the §0.11 to §0.13 rules hold on a deliberate read.
- [ ] Every input survives the share URL round trip.
- [ ] The print report follows the §7.1 order and ProjexaR appears once, last.
- [ ] Every figure in the executive summary is computed.
- [ ] Every PR1 to PR6 assertion still passes.

---

## 12. Report back with

1. The §2 answers, first and separately, before anything else. §2.1, §2.1b and §2.1c lead, and each can stop the PR.
2. What the deck says about 5.0 and 7.0, quoted, and which row of the §3.0 table you took.
3. Confirmation the numeric diff is empty, and the one figure that moved in 8.G.
4. Which of the audit's error-table items you could not reproduce, and what you searched to conclude that.
5. The heading list before and after §5 item 4.
6. Word counts before and after §6.4, and anything you wanted to cut and did not.
7. What you did about §3.5, and whether the four steps exist.
8. Anything in this brief that could not be done without moving a number.

---

## 13. Register additions

Enter these in master §11, unverified column, until checked.

| Claim | Status |
|---|---|
| **7.0 was set above the confidence interval deliberately, to understate rather than manufacture the problem** | **UNVERIFIED, and currently published.** The bands arrived already set on 3 September, attributed as *supported by* the research, not derived from it. The PR sessions verified Colicev and then observed the relationship; §2.11 wrote the observation up as intent. Enter this now, ahead of any fix. §3.0 |
| 5.0 was set at or from Colicev's turning point | **Unverified**, and the same failure as the row above. §3.0 |
| The BAU bands of 5.0 and 10.0 have any research basis | **Never claimed and must not be.** Recorded so that a future request to publish a derivation cannot pull them in. §3.2 |
| A four-step actions section exists in the print report | **Unverified.** §2.2 |
| A stale build or stale print template is publicly reachable | **Unverified.** §2.1. If true it outranks everything else here |
| Contractors are recorded as managed resources in the product | **Assumption**, from the free tier decision record's definition of a managed resource. §4.1 rests on it |
| The audit's £1.24m and 0.18% are endpoints of published ranges rather than single published figures | **Unverified.** §2.7 |

The standing rule from master §11 applies to every line of this brief: an asserted absence needs the same evidence as an asserted presence, and the search that produced it must be named.
