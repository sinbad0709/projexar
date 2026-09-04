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
| `shapes.mjs` | The 603-shape corpus, the three §4 fixtures, and the assertion shapes (boundaries, band straddles, toolset and contractor invariance, suppression rows, singulars, corroboration states, budget branches, loaded-cost edits, legacy band decoding). |
| `oracle.mjs` | The formulas, written from the spec. Never imports from the page. |
| `capture.mjs` | Drives one shape through the page's own submit handler, then reads back every node it wrote — screen, printed report and Sender payload. |
| `baseline.mjs` | Writes the digest baseline. |
| `check.mjs` | The suite. |
| `baseline.json` | Blessed at PR3. Re-bless whenever a PR changes output on purpose. |

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

## The link preview

`§4.4` is static markup, so those assertions read the file rather than a capture:
all six `og:` tags plus `twitter:card`, `og:image` absolute, `og:image:alt`
non-empty, `og:url` equal to the canonical, `og:description` equal to the page
description — and the asset itself, resolved from `public/` rather than from
`TOOL_PATH`, checked as a 1200x630 PNG and as the only image in that directory.

Verification of the preview itself is manual and post-deploy. Teams and Slack
cache OG data hard, so a first-attempt failure is nearly always a stale cache
rather than broken markup.
