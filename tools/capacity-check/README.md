# Capacity Check render suite

Development-only. Nothing here is deployed — `public/` is what ships, and the
Capacity Check remains a single self-contained HTML file with no build step and
no dependencies.

```
node tools/capacity-check/check.mjs [baseline.json]     # assertions + categorised diff
node tools/capacity-check/baseline.mjs <out.json>       # re-bless the baseline
```

Node 18+. No install step.

## Why it exists

The release this suite was written for is correcting one fault: **a rating
contradicted by a figure the tool itself publishes.** A suite that reads its
expected values back out of the implementation cannot catch that, so this one
does not.

- `oracle.mjs` reimplements every formula from the change spec, independently of
  the page. All 603 corpus shapes are asserted against it, at **both endpoints of
  the band**. A number that disagrees is a **failure**, never a diff category.
- The §4 fixtures are asserted against the figures the brief states, typed in by
  hand.
- Only *text* differences are categorised by judgement.

## Ranges

Every figure the blended time band moves is computed at both endpoints and
carried to the output as a range. The oracle does the same, and the suite asserts
both ends of every one of them — asserting one end would let a whole endpoint
drift unnoticed.

Index 0 is the band's low endpoint and is the **adverse** one throughout: less
time on projects means less effective BAU capacity, so more projects per FTE, a
lower growth ceiling and a higher derived run share. Every rating, every Sender
RAG value and every threshold reads it. `straddleShapes()` covers the case where
the two endpoints rate differently and the tile has to print both words.

Where the report publishes A, B and A − B, the subtraction uses the **displayed**
A and B, so a reader doing the sum on the page gets the number the page prints.
Fixture 8.B is the case that matters: 13.44 shows as 13.4 and 4.375 as 4.4, the
raw gap is 9.065 which would round to 9.1, and the page must print 9.0.

## The files

| File | What it does |
|---|---|
| `harness.mjs` | Loads the HTML, extracts the tool's IIFE, runs it in a `vm` against a DOM stub. Parses the real `<select>` options so `selText()` returns what a respondent read, and freezes `Date` so the baseline does not change at midnight. `loadTool(path, { search })` seeds `location.search`, which is the only way to reach the reopened-link path; the stub records `focus()`, `scrollIntoView()` and `setAttribute()` rather than swallowing them. |
| `shapes.mjs` | The 603-shape corpus, the seven §4 fixtures, and the assertion shapes (boundaries, band straddles, toolset, contractor and project-manager-share invariance, suppression rows, singulars, notation thresholds, corroboration states, currency options, budget branches, loaded-cost edits, legacy band decoding, the two epsilon cases, and `reproducibilityShapes()` — the operands no fixture makes fractional). |
| `oracle.mjs` | The formulas, written from the spec. Never imports from the page. |
| `capture.mjs` | Drives one shape through the page's own submit handler, then reads back every node it wrote — screen, printed report and Sender payload — plus the static printed-report copy the page does not write. |
| `baseline.mjs` | Writes the digest baseline. |
| `check.mjs` | The suite. |
| `baseline.json` | Blessed at PR6. Re-bless whenever a PR changes output on purpose. |

## The corpus

603 shapes, constructed rather than sampled, so the count is stable and means
something:

| Set | Count | What varies |
|---|---|---|
| A | 252 | every tools-and-process combination, at fixture 8.A's numbers |
| B | 252 | the same combinations, at fixture 8.B's numbers |
| C | 99 | a numeric sweep (9 PM counts × 11 caseload multipliers) at one fixed process profile |

A and B hold the arithmetic still and move the wording; C does the reverse. A
seeded 400-shape fuzz pass reaches the combinations the corpus fixes — blank
optional answers, every currency, every band, contractors, edited loaded costs,
zero PMs against zero BAU staff.

**It states how many of the 400 it rendered, and floors it.** Skipping a shape
the form rejects is right, and it is also how a new required input empties the
section without failing anything: every generated shape that does not answer the
new question is skipped. PR13 did exactly that — adding the project-manager
share took the rendered count from 400 to 97 and not one assertion failed. The
drop showed up only in the suite's own total, which nobody reads as coverage.

That is master §0.18 now, and it applies to every corpus whose size is produced
by code rather than written out shape by shape. PR14 audited the suite for the
rest and floored two more: the §3.8 process cross product, whose 252
combinations were counted into a log and never asserted, and the §0.17
population, which asserted how many shapes it CONSTRUCTED and not how many
rendered — two different numbers, and only the second is coverage. Four smaller
loops over enumerated sets were skipping silently too; those take the stronger
form instead and fail on the skip rather than count it.

Every corpus shape reports in sterling. That is deliberate — the corpus exists to
hold one thing still while another moves — but it is also how the currency bug
survived three releases, so the currency branches are covered by fixture 8.D and
by `currencyShapes()`, one per option, rather than by the corpus.

## The project-manager share, and the three things it must not touch

PR13 added the one input the tool had been assuming. Every project manager was
counted at 100% of their time, inside the headline cost figure — on fixture 8.A
that is 5 of 11.2 to 13.0 effective FTE — and it was the only answer in the tool
nobody was asked for.

It reaches `internal_project_fte` and nothing else. Three routes would each look
defensible and are each wrong:

- **Not the PM tile's divisor.** Master §2.1's band comes from a study counting
  concurrent projects per *person*. Someone carrying nine projects carries nine
  whether they are at 40% of their week or all of it. Dividing by FTE would
  replace a sourced ratio with one nothing supports.
- **Not the growth ceiling.** Master §2.6 ties the ceiling's divisor to the
  divisor the rated tile publishes, and the PM tile stays headcount-based.
- **Not the licence basis.** It counts people with capacity recorded in the
  system. A part-time project manager is a person.

`pmShareInvarianceShapes()` runs all ten bands with everything else held
constant and asserts each of those unmoved, along with the BAU tile, the quote,
the share of reported spend, the IT share and **every posted Sender field** —
every key, so a field added later is covered without anyone remembering. The
`permalink` field is the one exception and it is named rather than skipped: it
is the answers encoded, so it carries the new one and has to differ.

The set also asserts the opposite, and without that half it would pass with the
input wired to nothing: ten bands must produce ten different internal FTE
values, and the bottom band must produce less cost and a higher derived run
share than the top. An invariance set that only asserts sameness cannot tell a
routed input from an ignored one.

## Links issued before the question existed

`pp` is a new URL parameter, and links without it already sit in printed reports
and in Sender records. A decoded link with no share is **not** a link answering
zero and **not** a link answering 100%, and treating it as either silently is the
thing this input exists to stop.

It is treated as unanswered. `internal_project_fte` is suppressed and takes the
internal effort cost, the full portfolio cost, the reported share, ProjexaR's
share of full cost and the corroboration check with it, per master §1.1. Nothing
else goes: both tiles and their ratings, the growth ceiling, the licence basis,
the quote, the share of reported spend, the IT share and the typical project
duration all still publish, because a reader following an old link should see
what the tool can still tell them. The page says which figures are missing and
why, in the slot where the cost block would have been and again in the workings.

Three shapes, because the parameter can arrive in three states and a fourth is
worth having:

| Link | Behaviour |
|---|---|
| `pp` absent | unanswered |
| `pp=` (present, empty) | unanswered — `permalink()` never writes one, so it is a truncated or hand-edited link |
| `pp=91` | read |
| `pp=45` (not a band value) | unanswered, never mapped onto the nearest band — inventing an answer would put a figure nobody gave into the cost calculation |

On the **form** the answer is required where it is asked, because a blank there
is an omission rather than a link from before the question. `readAndValidate`
takes a `reopened` flag and that is the only thing it changes.

## Every printed calculation comes out

The workings exist so a sceptical reader can redo our arithmetic, which makes a
row whose printed operands do not produce its printed result worse than a wrong
figure in the body: it is the section written to be checked, failing the check.

PR13 §4 asserted the three **sums**. PR14 §2 asserts every calculation of any
shape — 15,883 of them across 689 shapes — by mapping each row label to a regex
capturing that row's own printed operands and to the arithmetic the cell states,
written from the cell and never from the tool, on the same rule `oracle.mjs`
follows. Rows that state rather than compute are named with the reason they
carry no arithmetic; **a label in neither list fails**, so a row added later
cannot arrive unchecked, and a row whose wording changes fails at its own regex
rather than passing over an empty match (§0.17). Comparison is at the precision
the row published, read off the printed figure itself: three decimals where it
printed three, millions where it printed an `m`. The claim is not that our float
matches theirs. It is that a reader doing the sum on the page arrives at the
figure on the page.

The one row the brief named revealed four more, none of which had been read:

| row | what it printed | what it does now |
|---|---|---|
| the BAU tile's ratio | `45 ÷ 5.0` beside 9.1 | `45 ÷ 4.96`, the divisor at the precision the division used |
| the contractor companion | the same divisor, one row down | the same fix, through the same helper |
| the internal effort cost | `10.8–13.0 × £69,251` against a product built on £69,251.40 | the loaded cost carries its pence **here and nowhere else**, because this is the one row that multiplies by it |
| employer NI below the threshold | `15% × (4,000 − 5,000)` beside £0 | the floor is the rule, so the branch states the rule |
| the full portfolio cost | `£519,386 + £367,000` beside £886,385 | one rounding, the display's: `Math.round` and `roundN` disagree at 519,385.49999999994 |

The loaded cost is `1.4 × salary − 750`, so it lands on a whole pound only for a
salary that is a multiple of five: four ordinary answers in five carry pence, and
the third and fifth rows above are reachable at £50,001. Because the printed
operand has to be bounded for a reader to multiply it, the loaded cost is held
to the penny at source — money is denominated in pence, and thousandths of one
are a float artefact. No fixture figure moves: `salaryForLoadedCost(65000)`
still gives exactly £65,000, and nothing on the 603-shape corpus changes value.

`reproducibilityShapes()` reaches each of these, because no fixture does. Every
fixture happens to produce a whole tenth of effective BAU FTE and a whole pound
of loaded cost, so every calculation reproduces on them by luck of the values.
That is the third time this release has found the same shape of blindness, after
the contractor routing and the currency gate.

**What did not change is the rated figure.** `projects_per_fte` still divides by
the unrounded effective FTE, which master §2.6 ties the growth ceiling's divisor
to and PR13 §5 forbids moving, and that is asserted on the shapes where the
rounded and unrounded divisors are different numbers — the only place the claim
has content.

## Why the internal FTE is rounded before anything is built on it

The workings publish three sums: `<pm FTE> + <BAU FTE>` with their total, that
total multiplied by the loaded cost, and `100% − <change share>` beside the run
share. All three used to reproduce from the printed figures by luck of the
fixture values — every fixture happened to produce a whole tenth of an FTE.

A banded share does not. Five managers at 91% is 4.55, so the raw quantity would
have put "4.6 + 6.2" against a total of 10.75 on the page, one row above
"10.8 × £65,000" against £698,750, on fixture 8.A. That is §9.1's fault exactly:
a figure the tool publishes contradicted by another figure the tool publishes.

So `pm_project_fte` is rounded at source, `internal_project_fte` is the sum of
the two **displayed** components (rounded again, because two exact tenths added
in IEEE 754 are not an exact tenth — 0.9 + 6.2 is 7.1000000000000005), the cost
is that displayed total times the loaded cost, and the run share is
`100 − displayed change share`. The PR13 §4 section asserts all three across the
corpus and every branch set, at both endpoints.

`bau_effective_fte` stays **raw**. It is the divisor the BAU tile and the growth
ceiling publish, and rounding it would move a rating, which PR13 §5 forbids.

The consequence was that the BAU tile's own published division — "45 ÷ 4.9"
printing 9.1 where the displayed division gives 9.2 — was the same class of
fault. PR14 §2 closed it from the other side: the quantity is still raw, and the
workings print it at the precision the division used, so the row now reads
"45 ÷ 4.96". The rated figure did not move and is asserted not to have.

## Why there are seven fixtures

Three of them were added in PR4, and each covers a branch that had never been a
fixture:

| Fixture | What it is | What it was hiding |
|---|---|---|
| 8.D | 8.A reported in USD | Every fixture was sterling, so a cost block that added dollars to pounds and labelled the sum £ passed everything. |
| 8.E | 8.A with an 82% run share | Above the corroboration window. |
| 8.F | 8.A with a 60% run share | Below it. Every fixture sat inside the window, so the §2.9 branches were never rendered by a fixture and shipped inverted from PR1 to PR3. |
| 8.H | 8.A with project managers at 41–50% | PR13. 8.A carries the 91–100% band, which is the band containing the 100% it used to assume, so on its own it proves the wiring and little else. Here the share is the dominant term: internal project FTE falls from 10.8–13.0 to 8.3–10.5 on otherwise identical inputs, and a routing leak that 8.A would show as a rounding wobble shows here as a whole FTE. Its corroboration lands on a different branch from 8.A's, which is the input reaching a route it is meant to reach rather than a side effect. |

That is the third time the same shape of blindness has cost this release a
defect. The contractor routing was invisible while every fixture carried zero
contractors, which is what 8.C exists to fix. The lesson is the same each time: a
fixture set that covers only the representative case cannot see the branches, and
the corpus does not rescue it, because the corpus holds the same values still.

## The corroboration branches, and which side flags

`stated_run` is compared against the derived run range with ±3 points applied
outward from each endpoint. **Above** the window is the Watch; **below** it is
the note that carries no rating. From PR1 to PR3 it read the other way round.

The asymmetry exists because the derivation counts only project managers and BAU
staff on projects, so a department delivering projects with staff who hold no BAU
role is invisible to it and its change share comes out understated. Through
`100 − x` an understated change share is an **overstated run share**, which puts
the derived window above the truth and the respondent's stated figure below it.
Below is therefore the side the asymmetry protects. The spec's own condition table
has this inverted, and its two prose descriptions of those conditions are
arithmetically false, which is where the error came from.

The consequence was not cosmetic. The tool printed a stated change share of 47%
beside a derived 24.9%–28.9% and headed the block "we derive more change effort
than you reported", and it rated the one case the asymmetry was built to excuse.

**The two labels in the workings row went on reading the wrong way round until
PR14.** The check, its branches and the card copy were all corrected at PR7; the
row that prints the window and the respondent's own figure, three characters
apart, kept calling a figure above the window "Below the window". Nothing in a
46,085-assertion suite read the label against the comparison beside it, because
every assertion over that row was a string. The PR14 §1 section derives the
expected direction from the two figures the cell itself prints, on both
branches, and asserts the card agrees with the row on each — so the two surfaces
cannot disagree again without failing.

Above the window stays a Watch. A department whose project managers also carry
run work has its change share overstated and lands there, which is an expected
bias rather than a fault — so the Watch copy names it first, before the input to
revisit, and the workings state the assumption beside the derivation on every
branch rather than only where it flags.

## The currency gate

The cost calculation runs on GBP and on nothing else, and the reason is country
rather than currency. Every cost figure is built on ONS ASHE, a UK survey, so it
prices a UK department. An exchange rate would not repair that — the salaries
would still belong to the wrong labour market — and it would be a figure that
goes stale and needs a source. The currency selector is the only signal the tool
has about where the department is, so it is the one that gates.

On any other currency the whole block goes: the internal effort cost, the full
portfolio cost, the reported share of it, and ProjexaR's price as a share of
reported spend, which crosses the two currencies exactly as the others do. The
hero falls back to the growth ceiling through the path the non-summing branch
already had. What survives is their spend in their own currency, the effective
FTE figures, and the ProjexaR price in sterling with no percentage beside it.

The suite asserts the six options out of the real `<select>`, so an option added
to the form without a decision about it fails rather than shipping unpriced.

## The epsilon, and an assertion that was never about one

`roundN` carries `+ 1e-9`, and the reason given for it everywhere is that 1.095
is 1.09499999999999997 in IEEE 754. That is true of the literal. It is not true
of `1095000/1e6`, which multiplies to exactly 109.5 — so fixture 8.A's
£1,095,000 rendered £1.10m with the epsilon and without it, and "the epsilon
case does not render £1.09m" passed for a reason unrelated to its own label.

PR13 moved 8.A's figure, which is how this surfaced: rehousing the assertion
meant finding out what it actually tested. `epsilonShape()` pins £1,005,000,
where `1.005 × 100` is 100.49999999999999 and the two round differently, and the
mutation — removing `+ 1e-9` from the tool — fails on it. That mutation left the
whole suite green before.

**One pinned case is one value, not the epsilon.** PR14 §3 swept the tool with
and without `+ 1e-9` across 1,874 shapes and found the epsilon load-bearing at
`round1()` as well, where it moves a **rated tile figure** on whole-number
answers rather than a money notation on a contrived salary: seven BAU staff at
the top of the 71–80% band is 5.6 effective FTE, which is 5.6000000000000005 in
IEEE 754, so 77 ÷ 5.60 comes out 13.749999999999998 and the tile publishes 13.7
where a reader dividing 77 by the 5.60 printed beside it gets 13.8.
`epsilonRatioShape()` pins it. The mutation now fails at two call sites, on two
kinds of figure, on inputs one of which nobody would type and one of which
anybody might.

**Two tolerances in `compute()` are exercised by nothing**, and PR14 listed them
rather than changing them: `ifloor`'s `+ 1e-9` and `redThreshold`'s `− 1e-9`.
Both can be removed with the suite still green. `redThreshold`'s own comment
already says it is defensive and that nothing has been observed to need it;
`ifloor`'s cites a specific product that no shape reaches. A third is only half
exercised: `CORROBORATION_TOLERANCE` survives a change from 3 to 4 and fails at
0 and at 12, so a one-point drift in the window is invisible. All three are in
the master's §11.

## Why the fixtures carry an odd-looking salary

Every fixture pins the **loaded cost** at £65,000, because a fixture that moves
when ONS republishes its salary survey is not a fixture. The value the respondent
can edit is the salary, and the loaded cost is salary + employer NI + overhead —
so the fixtures carry `salaryForLoadedCost(65000)`, which is £46,964.29 and
produces exactly £65,000. The suite asserts that round-trip before it asserts
anything built on it. The production default is the ASHE figure, and no fixture
depends on it.

## Capturing a baseline from another commit

`CAPACITY_CHECK_HTML` points the harness at any copy of the tool, so you never
have to move the working tree:

```sh
git show main:public/capacity-check/index.html > /tmp/old.html
CAPACITY_CHECK_HTML=/tmp/old.html node tools/capacity-check/baseline.mjs /tmp/before.json
node tools/capacity-check/check.mjs /tmp/before.json
```

## What a suppression takes with it

A figure that stops being computed takes more with it than its own line. PR4
found four things pointing at cost figures a non-sterling report does not have:
the out-the-door finding's "the tile above puts a number on the difference", the
inputs row labelled "median IT salary the cost figures use", the workings-page
note claiming the price was "quoted in sterling above", and the static paragraph
headed "What the cost figures exclude". Each is asserted absent on a suppressed
report and present on a sterling one.

The static paragraph is the awkward one. `staticReportText()` reads it out of the
file, so `allText()` carries it whether or not the page showed it, and hiding it
changes nothing the text diff can see. `capture()` records `costExclusionsHidden`
for that reason. A suppression the suite cannot observe is a suppression that
will come back.

## The copy rule

`approximately`, `roughly`, `estimated`, `very likely`, `significantly higher`
fail the suite anywhere in output, as does any sentence comparing ProjexaR's
price to a saving or a payback period.

`about` and `around` are deliberately **not** checked. A mechanical check cannot
tell "around 17 projects" from "questions around your team", and a check that
fails on legitimate copy gets switched off. Those two are handled by review — do
not add a regex or a whitelist to rescue them.

`pr-inputs` is exempt, and only `pr-inputs`. It is the printed report's verbatim
echo of the input labels and the options the respondent picked; hedging belongs
in inputs, and the only way to make it pass would be to misreport their answer.


## The static printed copy

The printed report carries copy written straight into the markup: the methodology
page, the bands statement, *What this does not account for*, the four steps. It is
output and it goes into the PDF.

PR2 extended the **copy rule** to that layer. The **numbers** were still outside
the suite until PR3 — eighteen of them, all Cited or Control constants, where an
edit changed nothing any assertion or any digest could see.

`staticReportText()` reads the block out of the file (comments stripped, cached
per path) and `capture()` hangs it on `cap.staticReport`, so `allText()` carries
it. The eighteen are also pinned by value with what each one is, so an edit fails
with a reason rather than only a changed hash.

`CAPACITY_CHECK_HTML` and the `toolPath` override both reach it, so a baseline
captured from another commit reads that commit's static copy, not this one's.

## The conservatism guard

PR2 added an assertion that the working-days basis claims no conservatism, and it
scanned **all** output. PR3 scoped it to the rows that carry the divisor claim —
`factList`, `pr-facts`, `pr-formulas`, `pr-sources`, split on row boundaries and
filtered to the ones naming the basis or the window.

The word has a legitimate true use: the red threshold of 7.0 sits above the top of
the study's confidence interval deliberately, and someone may want to say so. A
check that fails on true copy is a check that gets switched off — the same
reasoning that took `about` and `around` off the list above.

Scoped by row rather than by sentence on purpose. The captured nodes are joined
without terminal punctuation, so splitting the flattened prose on sentence
boundaries picks up whatever was rendered next and scopes to nothing in
particular.

## What the digest does not hash

PR5 added the §5 band track under each rated tile — three tinted zones, a mark,
and the two band thresholds labelled underneath. It is output, so `allText()`
carries it and the copy rule scans it. The **digest** takes it out, through
`stripBandBars()`, and hashes a second pair alongside the first:

| Field | What it hashes |
|---|---|
| `text`, `numbers` | everything the page rendered, track included |
| `textExBar`, `numbersExBar` | the same, with the track subtrees removed |

The categorised diff reads the `ExBar` pair, because that is the only
like-for-like comparison available: a capture taken from a commit before PR5 has
no track at all, so leaving the tick labels in makes all 603 shapes read as a
numeric change and buries the one thing the diff exists to catch. On a pre-PR5
capture the two pairs are identical, which is what makes them comparable. The
line **"of the unchanged, gained a §5 band track"** counts the shapes that are
identical without the track and differ with it — the track and nothing else.

Nothing is taken on trust in exchange. `assertBars()` pins every track by value
on every shape: the zone widths, both tick positions, both tick labels, the
mark's left edge and width, its colour against the tile's own rating, the zone
the adverse endpoint falls in against the pill beside it, and the accessible
label. The geometry is typed into `check.mjs` from the specification, never read
off the page — the same rule `oracle.mjs` follows. A track drawn to the raw
float instead of the displayed figure fails, and so does a threshold drawn in
one place and labelled with another.

## The branches the corpus holds still

Every corpus shape reports in sterling, carries no contractors and holds the
process profile fixed. That is deliberate, and it is also how three defects
reached production in this release. §5 therefore has its own section that runs
the track assertions over the contractor, suppression, boundary and straddle
shapes, and **fails if any branch is unreached** rather than reporting a count:

the scale floored at its hard minimum and the scale set by 1.25x the high
endpoint · a point value and a two-ended range · all three mark colours · an
unrated tile beside a rated one · each rated tile suppressed on its own.

## What the digest cannot see at all

All three of PR5's copy strings — the renamed section, the trial line and the
download button — live in static markup outside every captured node, and so does
the section order. `SCREEN_NODES` is a fixed list joined in its own order, so a
reorder is invisible to every hash in this file. The PR5 sections read the
markup directly instead: document order as a list, the three strings by value,
the old strings asserted absent, and the download anchor resolved to an element
that exists.

The §4 alignment fixes are read the same way, out of the stylesheet. Three of
them are assertions that something is *absent* — no width on `.ceiling`, no auto
inline margins on it, no width of its own on the pricing paragraph — because
each is a fault that comes back the moment someone adds a width to the rule that
looks like it wants one.

## Dashes

PR6 removed every em-dash from output text. The two rules are asserted together
and neither is safe alone:

- **No em-dash appears in any rendered node, on any shape.** Scanned over the
  output rather than over the file, because a dash in a comment is not copy and
  a dash on a branch no fixture reaches is exactly what a file-level grep
  misses.
- **Every en-dash in output sits between two figures.** The en-dash is not
  punctuation here: it is the range marker in every figure the blended band
  produces, and one regex loose enough to strip the first would take out the
  second and break every figure on the page silently. The test is a digit
  within three characters on each side, which no prose use would satisfy.
  `31–40%` and `6.2–8.0` are also pinned by value.

A lost range en-dash used to abort the run inside the §5 band-track section
rather than report: `shownSpan()` returns null on a figure it cannot read, and
its caller did not check. It fails with a reason now, so the dash assertions
stay legible instead of arriving as a stack trace.

The bands statement is out of bounds under §6 of that spec: not one word. Its
two em-dashes became two sentence boundaries. Every word is unchanged and in its
original order, and the only additions are the full stops and the capitals they
force — which is the reading under which "no em-dashes in output" and "nothing
in §6 is reworded" both hold. Sentences rather than brackets: the clause between
the dashes is the honest limit of what the evidence covers, and brackets
de-emphasise the thing that has to carry weight.

## Counts stated in prose

"Four external figures appear in this report" was wrong on any report where the
respondent skipped an optional question. PR6 deleted the count rather than
making it dynamic, because "Every external figure is named where it is used" is
true unconditionally.

The four steps are the case where a count is legitimate: static markup, four
`<li>` with no id, nothing in the script writing to them or hiding them, so no
branch can produce a fifth or drop one. That count stays, and is now pinned —
the count and all three sentences that state it, plus an assertion that no
script reaches the list. A count that is true today is exactly what the external
figures count was, and the way it goes wrong is somebody adding an item and not
reading the prose around it.

## Planned commitment, never hours

The tool holds committed time and does not track where time went. `PR6 §7`
scans every rendered node for the phrasings that break it — "where it actually
goes", "actual hours", "hours logged", "timesheet" and the rest. The comparison
table is the exposure: its right-hand column describes what a project plan would
return, and since PR5 moved that section near the top of the report a skimmer
reads it before the column header has done any work.

## Your numbers stands on its own

One row of the numbers list used to open "Of ongoing capacity" and finish its
sentence only if you had already read the figure in the column beside it. In the
**printed** table the figure sits *between* the label and the description, so
the sentence could not be reassembled there at all, and a screen reader got a
fragment either way.

The assertion reads the printed table, where label, figure and description are
three separate cells with nothing joining them, and checks the shape rather than
the wording: no label opens with a preposition or a bare pronoun, every
description opens as a sentence does and closes with a full stop. The ticket row
is named explicitly, because it is the one the section exists for.

## Why the numeric diff is order-sensitive, and why that is right

`numbersIn()` produces an ordered list, so the digest catches a figure that
moves position as well as one that changes value. PR6 hit this three times: a
clause reordered for readability moved a range after the headcount it was
apposed to, and moving the ticket proportion out of its label moved it past the
figure column in the printed table.

None of them changed a number. All of them were rewritten to keep figure order,
and that is the right call rather than sorting the comparison: a report that
printed the low endpoint where the high one belongs is precisely the class of
fault this suite exists to catch, and a sorted multiset cannot see it.

## One measure, and what the unit was doing

PR10 audited every rule constraining a text measure, on screen and in print, at
1440px, 1024px and 380px. Eight screen blocks carried `max-width` in `ch` at five
values, and `ch` resolves against **each element's own font-size** — so five
nominal values across four type sizes produced eight different columns:

| block | size | cap | rendered | its container |
|---|---|---|---|---|
| `.bands-note p` | 12.5px | 60ch | 457px | 720px |
| `.legend-note` | 14px | 62ch | 529px | 678px |
| `.ceiling .h-note` | 14px | 64ch | 547px | 696px |
| `.check-item .c-body` | 14px | 72ch | 615px | 710px |
| `.hero .lead` | 19px | 58ch | 672px | 872px |
| `.section-sub` | 19px | 60ch | 695px | 760px |

and three prose blocks (`.detail`, `.gate-sub`, and the finding bodies) carried
no measure at all and ran to their container. The blocks that read as broken were
the ones set in the smallest type, because that is where a character count and a
physical column disagree most.

A reading measure is a physical distance; the character count is a proxy for it
at body size, and used across four sizes it inverts and gives the smallest type
the shortest line. The file already recorded that finding at `--midcta-measure`,
where PR5 reached it for one box and did not generalise it. There is one token
now, `--measure`, in px, and every prose block takes it. Where a container is
narrower the container wins, which is the correct order: this caps a measure, it
does not set one.

Two rules keep a measure of their own and neither is a reading measure —
`.hero h1`'s 19ch, which balances a display headline by line count, and
`--midcta-measure`, an alignment column shared by children of three sizes. Both
are asserted present, so "no ch anywhere" cannot become the rule by accident.

The print report had the same fault in `em`: `.p-cover h1` at 22em of 26pt is
572pt, wider than the 182mm A4 text column, so it never constrained anything, and
`.p-cover .p-cover-line` at 30em of 11pt is 330pt and always did. Both are
written as distances now. Nothing on the cover moves — 439.7px becomes 438.4px —
and a change of font-size no longer moves a column silently.

The bands statement is the block PR10 §2 named as mattering most, and the comment
that used to sit on its rule recorded the drift in writing: "measure held to the
body text's 60ch". It was not the body text's. Body is 16px; that block was
12.5px. It is at body-sm now, because 400 words of sourcing is body copy and
caption size is what made a block PR7 promoted out from behind the gate read as
the footnote it had been. **Not one word of the statement moved** — PR6 §6 puts
it out of bounds — and the suite asserts that too.

## One notation per figure

`moneySpan()` is the only magnitude-threshold formatter in the file, and the only
formatter the two range-valued money quantities go through. So a value near the
threshold cannot render two ways across the web report, the printed report and
the covering note: there is one helper, and PR10 §1.3 confirmed it rather than
finding a defect.

The threshold reads the **displayed** pound, not the raw float — the same rule
§2.3 sets for rating a figure. `notationShapes()` pins both sides of the crossing
with two shapes a penny of salary apart:

    48154.73 -> raw 999,999.33, rounds to   999,999 -> £849,999–£999,999
    48154.74 -> raw 999,999.54, rounds to 1,000,000 -> £0.85m–£1.00m

On both, the full portfolio cost stays at £1.22m–£1.37m, which is the case worth
having: two money quantities in two different units, on one page, each of them
identical in all three places it is printed. A range never mixes units, because
the switch is made once off the larger endpoint.

The screen's cost callout carries **one** of the two quantities and its own
eyebrow says which — the full portfolio cost where the budget answer lets the two
be summed, the internal effort cost alone where it does not. Reading the figure
without reading the eyebrow is how fixture 8.B, the whole non-summing path, gets
compared against the wrong printed slot; the assertion reads the eyebrow.

The one place both notations of one quantity appear together is the workings row
that prints the exact pounds and then says "shown as" the rendered form. That is
a labelled disclosure of the rounding, not a second notation, and it is excluded
by name rather than by accident.

## Where a reopened link lands

`setAttribute`, `removeAttribute` and `scrollIntoView` were all no-ops in the
stub, so "the reopened link lands on the results with the form collapsed" was,
exactly like `focus()` before PR9, a claim the suite had no way to read. All
three record now. `scrolled` is the tool-wide log in call order, and **order is
the assertion** on the prefill path: scrolling before the collapse reads an
offset off a page the reader never sees.

`loadTool(path, { search })` seeds `location.search` before the IIFE runs, which
is the only way to reach `prefill()` at all — everything on that path happens
during load. The PR9 §4.2 round-trip test sets the fields directly and has never
executed it.

Measured in a real browser on fixture 8.A: the report used to sit **2,810px**
below a page that opened at scroll 0 with the form fully expanded. It lands on
the figures now, with the form folded into one row above them, still holding
every answer — open it, change a number, submit, and the report, the PDF and the
saved link all move together.

`#report` also gained a `scroll-margin-top`. The site header is `position:sticky`
and 73px tall, and both paths scroll with `block:'start'`, so "the top of the
report" put the report's own heading behind it. That has been true on the manual
path since the header became sticky; the reopened link is where it stops being
survivable, because that reader has not watched the page scroll and has no idea
anything is above the fold.

## The singular, in the places the old regex could not see

PR3 §3.5 checks every prose integer at 1, and its regex required the plural noun
to sit **immediately** after the "1". Every site with a word in between was
invisible to it, and three were live:

- `1 project managers`, in two workings formula cells
- `1 concurrent projects`, in the position lead and in the closing verdict
- `Your 1 contractor **are** counted separately`, on screen and in the printed
  report — a plural verb no assertion in this suite could see, because `qty()`
  agrees the noun and the sentence around it was written once, in the plural

Up to three intervening words now, plus a verb-agreement scan. And `Each of your
1 project manager is carrying` is not a sentence anyone writes: at one manager
there is no "each", so both sites that said it take their own opening.

`qtyWord()` spells the count at one and leaves the numeral everywhere else, which
is why it is a second helper rather than a change to `qty()`. Three kinds of site
keep the numeral deliberately: the workings formula cells, where "one project
manager + 6.2 effective BAU FTE" is arithmetic written in words; the corroboration
sentence, which enumerates three figures in a row; and any figure the respondent
typed and is owed back as they entered it.

**Nothing moved a figure.** Across all 661 shapes the suite renders, zero values
changed. On 21 of them the ordered numeric list is shorter, and every deleted
item is the numeral `1` in a sentence §3 required to be rewritten.

## The link preview

`§4.4` is static markup, so those assertions read the file rather than a capture:
all six `og:` tags plus `twitter:card`, `og:image` absolute, `og:image:alt`
non-empty, `og:url` equal to the canonical, `og:description` equal to the page
description — and the asset itself, resolved from `public/` rather than from
`TOOL_PATH`, checked as a 1200x630 PNG and as the only image in that directory.

Verification of the preview itself is manual and post-deploy. Teams and Slack
cache OG data hard, so a first-attempt failure is nearly always a stale cache
rather than broken markup.
