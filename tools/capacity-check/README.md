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
| `harness.mjs` | Loads the HTML, extracts the tool's IIFE, runs it in a `vm` against a DOM stub. Parses the real `<select>` options so `selText()` returns what a respondent read, and freezes `Date` so the baseline does not change at midnight. |
| `shapes.mjs` | The 603-shape corpus, the six §4 fixtures, and the assertion shapes (boundaries, band straddles, toolset and contractor invariance, suppression rows, singulars, corroboration states, currency options, budget branches, loaded-cost edits, legacy band decoding). |
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

Every corpus shape reports in sterling. That is deliberate — the corpus exists to
hold one thing still while another moves — but it is also how the currency bug
survived three releases, so the currency branches are covered by fixture 8.D and
by `currencyShapes()`, one per option, rather than by the corpus.

## Why there are six fixtures

Three of them were added in PR4, and each covers a branch that had never been a
fixture:

| Fixture | What it is | What it was hiding |
|---|---|---|
| 8.D | 8.A reported in USD | Every fixture was sterling, so a cost block that added dollars to pounds and labelled the sum £ passed everything. |
| 8.E | 8.A with an 82% run share | Above the corroboration window. |
| 8.F | 8.A with a 60% run share | Below it. Every fixture sat inside the window, so the §2.9 branches were never rendered by a fixture and shipped inverted from PR1 to PR3. |

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

## The link preview

`§4.4` is static markup, so those assertions read the file rather than a capture:
all six `og:` tags plus `twitter:card`, `og:image` absolute, `og:image:alt`
non-empty, `og:url` equal to the canonical, `og:description` equal to the page
description — and the asset itself, resolved from `public/` rather than from
`TOOL_PATH`, checked as a 1200x630 PNG and as the only image in that directory.

Verification of the preview itself is manual and post-deploy. Teams and Slack
cache OG data hard, so a first-attempt failure is nearly always a stale cache
rather than broken markup.
