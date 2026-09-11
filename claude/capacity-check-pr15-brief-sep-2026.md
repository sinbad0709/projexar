<!-- PROVENANCE. This is the brief as issued to Claude Code on 11 September 2026,
     committed here verbatim from that copy because claude/ holds the
     authoritative version and this brief had no file. If it was edited in place
     after issue, per this directory's own rule, the maintained version
     supersedes this one and should replace it here. Nothing in the repository
     reads this file. -->

# PR15 — The review pass

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`
**Follows:** PR14, merged
**Target files:** the Capacity Check HTML and its screen stylesheet
**Date:** 11 September 2026
**Reads with:** master §0.11, §0.14, §2.1, §2.11; `claude/capacity-check-pr6-brief-sep-2026.md` §3 and §6; `claude/capacity-check-pr10-brief-sep-2026.md` §2

Mark read the whole web report against the shape below and raised twenty-odd items. This is all of them, collated.

**The shape he reviewed.** 600 company headcount, 24 IT staff, 4 project managers at 91–100%, 23 live projects, 55 annually, £250,000 spend, 16 BAU staff at 71–80%, 0 contractors, 500 tickets a month, 65% run, Excel or Google Sheets, no single view, out-the-door budgets, would have to ask. Render this shape when checking each item.

**Standing instruction for every item.** Report whether the fault exists in the web report, the printed report, or both, **and name the search that establishes it**. Several defects this release were live in one surface and absent from the other — a rename that missed the print header, a copy rule reading only the print slice, two paid cards disagreeing. An asserted absence in the second surface needs the same evidence as a found fault in the first.

**Numeric invariant.** No figure changes. §6.2 is a check that could disprove that; if it does, stop and report before doing anything else in this brief.

**Every replacement runs through the existing guards** — copy rule, both dash rules, the offer guard, the feature-gating guard, and §0.11.

**Do not merge.** Push, report, and stop.

---

## 1. The form

**1.1 The two band labels are near-identical.** "Your best estimate of the blended average share of their time spent on project management" and "…on that project work" differ in four words, two screens apart, and their hints are word-for-word the same. Name the population in each label. Propose wording rather than writing it: the project-manager label is CC's and Norm's to overrule, and the BAU one is Norm's.

**1.2 The project-manager help text and the hidden question.** "Whoever holds a plan together. Enter 0 if nobody does formally." Entering 0 hides the share question with no explanation. Report whether that is announced anywhere. Also consider whether "nobody does formally" sits oddly beside a count of 4 — someone answering on that basis is counting people who are project managers by function, which is what the share question then asks about.

**1.3 The BAU section's lead paragraph.** "Rarely do we get the luxury of appointing BAU resources full time to projects. BAU resources are hired with the primary focus of supporting and maintaining existing systems and services." Two faults. It is the only first-person voice in a data-entry sequence, and the inverted opening is a register nothing else in the tool uses. And "resources" for people: PR7 §6.2 keeps the billing unit in billing contexts and uses people elsewhere. Rewrite to the register of the surrounding help text.

**1.4 "All four shape your report."** Confirm the count is computed from the questions present rather than written as a constant. A fifth question added later makes that sentence quietly wrong, which is the fault the bands statement's "Three things follow" already demonstrated.

---

## 2. Your capacity position

**2.1 The second sentence does not parse.** "Your 11.4–12.8 effective BAU FTE, 16 people at an average of 71–80% of their time, is spread across all 23 of them." The pronoun points at projects; the nearest plural noun is people. Replace:

> Your 16 BAU staff give 71–80% of their time to project work, which comes to 11.4–12.8 effective full-time equivalents. That capacity is spread across all 23 live projects.

**2.2 Averages stated as facts about individuals.** "Each of your 4 project managers is carrying 5.8 concurrent projects" is false of any real person and is the first thing a manager who knows their team will reject.

> Your 4 project managers are carrying 23 live projects between them, an average of 5.8 each.

Same class, same fix, at every site. Known: the BAU tile's "Each project is getting 49%–56% of one person's time", the AT RISK finding's "Each of your project managers is carrying 5.8 concurrent projects", and the closing verdict's "5.8 concurrent projects for each project manager". **Search for others and report the full list.**

**2.3 The bands block goes behind a disclosure.** It occupies most of a screen and most readers will skip it.

Keep the first sentence visible — *"These bands are ProjexaR's management controls. They are informed by published research but are not values the research establishes"* — and collapse everything from the study description onward. That sentence is the claim; the rest is the evidence, which is what a disclosure is for.

Native `<details>`, per PR10's pattern: keyboard-operable, no script deciding.

Two assertions are required. **The text must be byte-identical after the move** — it is protected under PR6 §6. And **it must render expanded in print**: a collapsed `<details>` prints collapsed in some browsers, which would put the sourcing back behind a gate in the artefact that gets forwarded. That is the opposite of what PR7 §3.1 did.

**2.4 The range paragraph.** "A single number would be more precise than the answer it came from" tells the reader a single figure would beat the band we required of them. It reads as criticism of an answer we insisted on.

> Your BAU staff give 71–80% of their time to project work, so every figure drawn from that answer is shown as a range. Where a range crosses a threshold, we rate it on the less favourable end.

The threshold rule is the sentence that earns its place: it is why a badge says what it says.

**Then check the scope.** PR13 added a second band, and the project-manager share now drives the cost figures further down the page. Report whether this paragraph is scoped to its section or reads as covering the whole report, and whether it needs to name both bands.

---

## 3. The measure

**3.1 Centre the measure inside the navy cards.** Text stops at `--measure` (660px) while the card runs wider, so the space falls entirely on the right and reads as a margin fault. Centre the measure so the space falls equally either side.

On the full-cost card the horizontal rule and the salary input span the card while the text spans the measure, which is what makes it visible. They should agree: either both span the card, or both come in to the measure.

**Do not widen or remove the cap.** PR10's root cause was five nominal measures across four type sizes producing eight columns, and at full container width the bands statement runs to 94 characters. If 660px proves wrong, change `--measure` globally and render at 1440, 1024 and 380. **A per-block exception is that fault starting again.**

Apply to every navy card, not the two in the screenshots. Report the full list and check the printed report's equivalents rather than assuming they inherit it.

---

## 4. What your plans would show

**4.1 "Unit of capacity" is undefined**, and the tile above calls the same ratio "Live projects per effective BAU FTE". Two names for one quantity within a screen.

> 1.8–2.0 live projects for every effective BAU FTE, across the band.

The tile's info icon already carries the definition. **Fix every occurrence of the phrase**, including the closing verdict's "1.8–2.0 live projects for every unit of BAU capacity". Report the full list.

**4.2 The growth ceiling reads as permission.** "Room to raise your annual pace by 11 more projects a year before a capacity metric turns red" offers headroom, where the reader's question is how close they are to trouble. Red is where things go wrong, not a target.

> Your current pace of 55 projects a year sits 11 below the point at which concurrent load per project manager turns red.

Same arithmetic, stated as a distance to a boundary rather than an invitation, and it names the binding measure, which is the actionable part.

**The navy growth-ceiling card takes the same treatment.** Its headline reads "Room to grow: 11 more projects a year at today's pace", which is the more encouraging of the two framings and is set in bold. Rewrite it to the same posture and report the wording.

**4.3 The right-hand column heading becomes "What Your Plans Should Show".** "From your project plans" claims the reader's plans already contain this; they do not, which is the argument. It also loses the conditional the section heading carries.

**Do not name ProjexaR in that column.** PR8 §2.7 and §7.2 keep the product to one page, last, and this section sits immediately above the four steps that need no software. That adjacency is what sells it.

---

## 5. The conversion card

**5.1 The measure**, per §3.1.

**5.2 The offer string is the short form where the full form was confirmed.** It renders "Free for five. 14 days unlimited to start." The confirmed wording is **"Free for up to five people. 14 days unlimited to start."** — the longer form exists because "free for five" beside "14 days" reads as five days.

At least two sites are affected: this card and the checks section. **Report every site taking `OFFER.short`** and whether the confirmed wording reached the constant at all.

**5.3 A future-tense product promise.** "Nothing will need to be built and nothing will need to be migrated." The two sentences after it are properly conditional — *the design has*, *the intent is that*. This one is a flat promise about an unshipped product, and because it is future rather than present tense the §5 feature-gating guard's phrase list does not see it.

> The design needs nothing built and nothing migrated.

**Report whether the guard should extend to future-tense product promises**, or whether that is the same brittleness that made the tense guard not worth building in PR11. Do not build it before reporting.

---

## 6. What your answers show

**6.1 The Healthy finding should define its band.** "Inside the coverage we treat as sustainable across the whole of the 71–80% band you picked" — by this point the reader has forgotten what that band measured. Name it: the average share of BAU staff time going to project work.

**6.2 The AT RISK finding carries five asserted inferences, where §0.11 allows one.** Plans live in spreadsheets; nothing connects those files to resource data; consistency depends on manual re-entry; overwrites are silent; there is no audit trail.

The reader answered "Excel or Google Sheets" and "no single view". Those support the first and the last. The middle three are assertions about a department nobody has seen, which is exactly the overreach §0.11 was written to stop. **It appears the rule was applied to the finding the audit quoted and not to this one — check every finding, not this one alone, and report which were compliant.**

Keep one assertion. Everything else conditional: "if that is happening, this is where it shows up".

**6.3 The Panko citation.** "(Panko, University of Hawaii)" is the only inline attribution in the findings, with no year, title or link, against a Colicev citation carrying a DOI and a licence. Confirm it appears in §11 and in the sources table. It is attached to the one sentence making an empirical claim about error rates, and it is among the least defensible of the five inferences — if the §6.2 cut reaches it, the citation problem goes with it. Report which happened.

**6.4 Drop "single" from the AT RISK heading.** "There is no current view of demand and availability."

---

## 7. Checks on your answers

**7.1 "Start free" is a text link and should be the button used elsewhere.** PR7 §7.5 barred a second conversion *panel*, not a second button; the concern was two boxes reading as pressure. Match the primary CTA's style.

**7.2 Two figures on one page look inconsistent, and this is a check, not a finding.** The cost card gives internal project effort as 15.0–16.8 effective FTE; against 24 IT staff that is about 63–70%. The checks section says the staff named imply 30.0%–37.5%, which against 24 is 7.2–9.0 FTE.

Report which quantity produces 30.0%–37.5%, whether both are correct, and whether a reader comparing them on one page would be right to think they disagree. The derived change share is what the corroboration verdict rests on, and PR13 moved that quantity. **If it is wrong, stop and report before anything else in this brief.**

**7.3 A relative clause attaches to the wrong noun.** "…or run work in your organisation genuinely is not ticket-shaped, which is infrastructure, incident response, vendor management and compliance."

> …or your run work is genuinely not ticket-shaped: infrastructure, incident response, vendor management and compliance.

---

## 8. Your numbers

**8.1 The ticket block is verbose and its key sentence has no antecedent.** "That window is one ProjexaR sets between two published figures, not a published figure itself" states the conclusion of an argument the reader was never given — the two figures are never named. The heading also carries the finding and a second statistic in one line.

> **1.6–2.9 FTE — Ongoing capacity absorbed by ticket volume before any project work.**
>
> That is 7.8%–14.7% of your 20 non-PM IT staff, from your monthly ticket volume against 170 to 320 tickets per technician per month, or 8.1 to 15.2 a day across the 21-working-day month we assume.
>
> We set that window ourselves, between two published figures: one measuring desktop support, one measuring a mixed internal and customer queue. Neither measures an internal IT service desk, so they bracket our window rather than confirm it.

Naming what each source measures is what makes the last sentence land.

**8.2 Confirm the two divisors are intended.** This block divides by 20 non-PM staff; the block above divides by 24. Both may be right, but they are adjacent and a reader will compare the percentages. Report the reason for each, and whether the page states it.

**8.3 Cut the size clause from the Flexera block.** "…and of organisations larger than most of the departments this check is built for" asserts our own ICP as a qualification of someone else's data and raises a question we do not answer here.

> …but that is a split of IT budget rather than of people's time.

---

## 9. Acceptance criteria

- [ ] Every item reports which surface it was live in, with the search named.
- [ ] No figure changes, asserted. §7.2 cleared before anything else.
- [ ] The bands text is byte-identical after §2.3 and renders expanded in print, both asserted.
- [ ] No average is stated as a fact about an individual anywhere, with the full site list reported.
- [ ] "Unit of capacity" appears nowhere, with the full site list reported.
- [ ] Every site uses the confirmed offer string.
- [ ] Each finding carries at most one asserted inference, checked across all of them.
- [ ] The measure is centred on every navy card, with the cap unchanged at 660px and no per-block exception.
- [ ] No em-dashes in output. Every en-dash in a number range survives.
- [ ] Copy rule, dash rules, offer guard and feature-gating guard all pass.
- [ ] Every PR1 to PR14 assertion still passes.

---

## 10. Report back with

1. §7.2 first and separately, before anything else.
2. Per item: which surface, and the search that established it.
3. Proposed wording for §1.1 and §1.3 before you write them.
4. The full site lists for §2.2, §4.1 and §5.2.
5. Which findings were already §0.11-compliant and which were not.
6. Whether the feature-gating guard should extend to future tense, with your reasoning.
7. Anything that could not be done without moving a number.

---

## 11. Held

- **Precision and reproducibility checks.** PR14 covered them and they pass; not re-run here.
- **What 14 days produces.** Norm's, once the MVP scope is fixed.
- **The email re-gate**, and **`pm_load` formatting**. Decision-gated.
- **The marketing site's broader copy work.** Separate.
