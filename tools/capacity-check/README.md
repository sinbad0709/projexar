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
  the page. All 603 corpus shapes are asserted against it. A number that
  disagrees is a **failure**, never a diff category.
- The §4 fixtures are asserted against the figures the brief states, typed in by
  hand.
- Only *text* differences are categorised by judgement.

## The files

| File | What it does |
|---|---|
| `harness.mjs` | Loads the HTML, extracts the tool's IIFE, runs it in a `vm` against a DOM stub. Parses the real `<select>` options so `selText()` returns what a respondent read, and freezes `Date` so the baseline does not change at midnight. |
| `shapes.mjs` | The 603-shape corpus, the two §4 fixtures, and the assertion shapes (boundaries, toolset invariance, suppression rows, singulars, corroboration states). |
| `oracle.mjs` | The formulas, written from the spec. Never imports from the page. |
| `capture.mjs` | Drives one shape through the page's own submit handler, then reads back every node it wrote — screen, printed report and Sender payload. |
| `baseline.mjs` | Writes the digest baseline. |
| `check.mjs` | The suite. |
| `baseline.json` | Blessed at PR1. Re-bless whenever a PR changes output on purpose. |

## The corpus

603 shapes, constructed rather than sampled, so the count is stable and means
something:

| Set | Count | What varies |
|---|---|---|
| A | 252 | every tools-and-process combination, at fixture 4.A's numbers |
| B | 252 | the same combinations, at fixture 4.B's numbers |
| C | 99 | a numeric sweep (9 PM counts × 11 caseload multipliers) at one fixed process profile |

A and B hold the arithmetic still and move the wording; C does the reverse. A
seeded 400-shape fuzz pass reaches the combinations the corpus fixes — blank
optional answers, every currency, zero PMs against zero BAU staff.

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
