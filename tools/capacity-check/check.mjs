/* The PR2 check suite.
       node tools/capacity-check/check.mjs [baseline-before.json]

   Numbers are asserted against values computed outside the tool — the §4
   fixtures against the figures the brief states, typed in by hand, and all 603
   corpus shapes against oracle.mjs. A number that disagrees is a failure, never
   a category. Only text differences are categorised. */

import { readFileSync, writeFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sha = (v) => createHash('sha256').update(String(v)).digest('hex').slice(0, 16);
import { corpus, FIXTURE_A, FIXTURE_B, FIXTURE_C, FIXTURE_D, FIXTURE_E, FIXTURE_F, FIXTURE_G,
         FIXTURE_H, FIXTURE_LOADED_COST, FIXTURE_SALARY,
         pmShareInvarianceShapes, epsilonShape, epsilonRatioShape,
         boundaryShapes, straddleShapes, toolsetInvarianceShapes, contractorShapes,
         suppressionShapes, singularShapes, corroborationShapes, budgetShapes,
         loadedCostShapes, currencyShapes, notationShapes, reproducibilityShapes,
         corroborationToleranceShapes,
         LEGACY_BAND_CASES, CURRENCIES,
         TOOLSETS, VISIBILITY, BUDGETS, ASSIGNMENT, BANDS } from './shapes.mjs';
import { capture, allText, renderedText, numbersIn, staticReportText, staticWebText,
         SCREEN_NODES, PRINT_NODES } from './capture.mjs';
import { TOOL_PATH, loadTool } from './harness.mjs';
import { evaluate, roundN, round1, redThreshold, loadedCost, bandContaining,
         typicalDurationMonths, itShare, pricesCosts, COST_CURRENCY,
         finding2State, finding3State, finding4State,
         TICKETS_LO, TICKETS_HI, WORKING_DAYS, JITBIT_PER_DAY, HDI_LO, HDI_HI,
         CORROBORATION_TOLERANCE } from './oracle.mjs';

let pass = 0, fail = 0;
const failures = [];
/* Counted across two callers — the 603-shape corpus loop and the PR5 §5
   section — so both live up here with the function that increments them. */
let contradictions = 0, barFaults = 0;

function ok(cond, label, detail = '') {
  if (cond) { pass++; return true; }
  fail++; failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  return false;
}
function eq(actual, expected, label) {
  return ok(actual === expected, label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function section(name) { console.log(`\n── ${name}`); }

/* =============== §0.17 — extraction fails loudly, or not at all ==============

   A selector, regex or slice that stops matching returns undefined or an empty
   string, and every assertion built on it then passes for a reason that has
   nothing to do with the claim. Two shapes, and PR12 hit the first:

   - A comparison of two extracted values. Both extractions usually fail
     together, because they are usually adjacent markup edited in one change,
     and eq(undefined, undefined) passes. PR7 §7.5 compared the Capacity
     Check's two CTA subs by patterns anchored to a bare class attribute; PR12
     added data-offer to both elements and the comparison went on passing on a
     page where the two subs were free to disagree.
   - A negative test over an extracted value. !has(x, …) and !/…/.test(x) are
     true of the empty string, so an absence asserted over nothing is not an
     absence. PR12's own §5 guard is built almost entirely from negative
     claims, which is why it is audited with the rest.

   These four helpers are the mechanism rather than a convention. Each asserts
   the extraction succeeded BEFORE the caller sees the value, so a selector
   that stops matching produces a named failure at the extraction site instead
   of a silent pass at every assertion downstream. They are deliberately not
   folded into the assertions they feed: a combined check cannot tell "found
   and correct" apart from "not found", which is the whole defect.

   The test for these differs from §0.16's. Break the EXTRACTION, not the
   content: rename the class, move the attribute, change the id. Mutating
   content proves an assertion reads the right thing; only mutating the
   selector proves it notices when it reads nothing. */

/* One capture group out of a regex. Returns undefined on failure, having
   already failed the run, so callers may still compare it. */
function grab(text, re, label, group = 1) {
  const m = String(text).match(re);
  ok(m !== null, `${label} — extraction found`, String(re));
  return m === null ? undefined : m[group];
}

/* The slice between two markers. Asserts both were found, because slice() with
   a -1 start silently returns the wrong thing rather than nothing, and an
   assertion over the wrong slice is the defect PR8 §5 already caught once. */
function between(text, from, to, label) {
  const t = String(text);
  const i = t.indexOf(from);
  const j = to === undefined ? t.length : t.indexOf(to, i < 0 ? 0 : i);
  const okFrom = ok(i >= 0, `${label} — slice start found`, from);
  const okTo = ok(j >= 0, `${label} — slice end found`, String(to));
  if (!okFrom || !okTo) return '';
  const out = t.slice(i, j);
  ok(out.length > 0, `${label} — slice is not empty`);
  return out;
}

/* The capture-node population is NOT handled here. `cap.print['id']` is a
   plain property read at 88 sites, and converting each one buys less than the
   two structural assertions in the §0.17 section below, which read this file's
   own source and cover every site at once: that each id named is a node the
   harness captures, and that each captured node is written by the tool on at
   least one shape. A helper here would also have collided with the harness's
   own tool.node().

   There is deliberately no helper for /g extractions either. Every such site in
   this suite either gates on the result before comparing it, or feeds a length
   or join that fails loudly on its own; a null there is the semantics ("no
   violations found"), not a failure. Adding a helper nothing needs would look
   like coverage. */

/* Rendered text contains a phrase, with the en dash the tool uses.

   ---------------------------------------------------------------------------
   PR8 §5 — the slice audit, and the standing rule that came out of it.

   `has` is scope-neutral. What matters is what is passed as `hay`, and PR7
   found the shape of defect this whole class produces: the assertion meant to
   catch a stale section name read `has(report, …)`, where `report` is the WEB
   slice, so it asserted the old name was gone from the half of the file PR5
   edited and was structurally blind to the half PR5 missed. The name survived
   in the print report's running header for two releases.

   THE RULE: a claim about the file is asserted against the file. A slice is
   used only where the claim is genuinely about that slice, and then it is said
   here why.

   The audit covered every assertion reading a slice of the file. 76 audited,
   10 re-scoped, 30 left slice-scoped:

     re-scoped to both halves or to the whole file
       - the static copy-rule scan, which read the printed report only. There
         has never been a staticWebText(); there is now, and allText() carries
         it, so the 603-shape copy rule, the em-dash rule and the en-dash rule
         all see the web report's static prose for the first time.
       - the em-dash scan on static copy, same reason.
       - the two "old heading is gone" assertions, which read `printCopy`.
       - `positionSection`, which sliced to end of file and settled its question
         against a literal run of whitespace.
       - two assertions re-scoped the OTHER way, from allText() to the render:
         "this shape makes no full-cost claim" is a claim about what one shape
         renders, and #fullCostTile carries its heading in the markup on every
         shape. Widening the copy scan is what exposed them.

   WHAT THE RE-SCOPING FOUND ON LANDING: nothing. The 1,594 characters of web
   report prose that had never been scanned were already clean on every rule now
   pointed at them — no banned hedge, no ROI framing, no em-dash, no loose
   en-dash, no page cross-reference, no NaN. That is recorded because a suite
   that goes green after a re-scope is consistent with two very different facts,
   and this is the one that happened. What the widened scope caught was a guard,
   not a violation: the full-cost claim assertion had been passing vacuously,
   because the DOM stub starts nodes empty and render() never writes that node
   on the shapes the assertion was about, while the real page carries the string
   in the markup and hides it. Nothing asserted that it was hidden. Now
   something does.

   The boundary is <section id="report">, not the top of the page. The form
   above it says "Estimated total IT staff", master §5 allows a hedge in an
   input label, and a rule that fails on correct copy is a rule somebody turns
   off — the same reason pr-inputs is exempt from the copy scan.

     left slice-scoped, with the reason
       - the §7.5 second-CTA block (7): every one is about the web page's
         structure and ordering. The printed report has no CTA at all, and
         "exactly one conversion panel" over the whole file is a different and
         weaker claim. Its absence from the print report is now asserted
         directly, under §0.14.
       - the web presence checks (4): the trial line, the report button, the
         section name, the tile CTA. Each names an element that exists only on
         the web page. Every corresponding ABSENCE claim reads the whole file.
       - the print-report structure checks (17): headings, running headers,
         captions, section order, the product page. These are claims about the
         printed document as a document.
       - `steps` and `script` (2): the four-step count, and the fact that no
         script writes to the list, which is what makes the count safe.
   --------------------------------------------------------------------------- */
function has(hay, needle) { return String(hay).includes(needle); }

/* ------------------------------------------- PR5 §5 — the band track ----- */
/* The geometry, typed in from the specification rather than read off the page,
   for the same reason oracle.mjs exists: a suite that reads its expected values
   out of the implementation cannot catch the implementation being wrong.

   scale_max   = max(hard_min, high_endpoint x 1.25)
   zones       = 0..t1 healthy, t1..t2 watch, t2..scale_max at risk
   mark        = left lo/scale_max, width (hi-lo)/scale_max, floor 1.2%
   ticks       = t1 and t2, centred on their positions */
const BAR = { HEADROOM: 1.25, MIN_MARK: 1.2, T1_PM: 5.0, T2_PM: 7.0, MIN_PM: 12,
              T1_FTE: 5.0, T2_FTE: 10.0, MIN_FTE: 14 };

/* The Watch zone is the difference of the two rounded positions, not the
   rounding of the difference. The three zones have to tile the track exactly,
   so each one has to start where the last ended — taking (t2 - t1) / scale_max
   on its own leaves a hundredth-of-a-percent seam at the boundary. */

function expectedBar(lo, hi, t1, t2, hardMin) {
  const max = Math.max(hardMin, hi * BAR.HEADROOM);
  const pct = (x) => roundN((x / max) * 100, 2);
  const left = pct(lo);
  return {
    healthy: pct(t1), atrisk: roundN(pct(t2) - pct(t1), 2),
    t1: pct(t1), t2: pct(t2),
    left, width: Math.max(BAR.MIN_MARK, roundN(pct(hi) - left, 2)),
  };
}

/* The zone a value lands in, by the same comparison ragPM and ragFTE make. */
function zoneOf(x, t1, t2) { return x > t2 ? 'over' : (x > t1 ? 'atrisk' : 'healthy'); }

/* Split the rendered tile grid into tiles, and pull each one's band track
   apart. Reads the markup rather than the tool's own objects, so a bar that is
   computed correctly and rendered wrongly still fails.

   §0.17, audited and deliberately left raw. `bar` has to stay nullable: an
   unrated tile genuinely carries no band track, and "the unrated tile carries
   no band track" is asserted as eq(tile.bar, null). The '' and 0 defaults on
   label, value, markRag, aria and hidden are safe for a different reason —
   every consumer of them is a positive check (an eq against a wanted string,
   or a condition that pushes a failure when the string does not start with the
   tile's own value), so an extraction that stops matching produces '' and
   fails loudly rather than passing. There is no negative assertion anywhere
   over a tile field, which is what makes that true; if one is added, these
   defaults have to go through grab() first. */
function tilesOf(html) {
  return String(html).split('<div class="tile ').slice(1).map((chunk) => {
    const bar = (chunk.match(/<div class="band-bar"[\s\S]*?<\/div><\/div>/) || [])[0] || null;
    const num = (re) => { const m = bar && bar.match(re); return m ? Number(m[1]) : null; };
    return {
      rag: chunk.slice(0, chunk.indexOf('"')),
      label: (chunk.match(/<p class="t-label">([\s\S]*?)(?: <span class="tip"|<\/p>)/) || [])[1] || '',
      value: (chunk.match(/<p class="t-value">([^<]*)<\/p>/) || [])[1] || '',
      bar: bar && {
        healthy: num(/bb-zone healthy" style="width:([\d.]+)%/),
        atrisk: num(/bb-zone atrisk" style="width:([\d.]+)%/),
        /* The At risk zone carries no width — it fills what the other two
           leave. Its presence is asserted, its width is not a number. */
        hasOver: /<span class="bb-zone over"><\/span>/.test(bar),
        markRag: ((bar.match(/bb-mark ([a-z]+)"/) || [])[1]) || '',
        left: num(/bb-mark [a-z]+" style="left:([\d.]+)%/),
        width: num(/bb-mark [a-z]+" style="left:[\d.]+%;width:([\d.]+)%/),
        ticks: [...bar.matchAll(/<span class="bb-tick" style="left:([\d.]+)%">([^<]+)<\/span>/g)]
          .map((m) => ({ at: Number(m[1]), label: m[2] })),
        aria: (bar.match(/aria-label="([^"]*)"/) || [])[1] || '',
        hidden: (bar.match(/aria-hidden="true"/g) || []).length,
      },
    };
  });
}

/* The endpoints the tile printed, off the tile's own figure. The bar has to be
   drawn to the number beside it — not to the raw float behind it. */
function shownSpan(value) {
  const parts = String(value).split('–').map((s) => Number(s.trim()));
  if (parts.some((n) => !Number.isFinite(n))) return null;
  return parts.length === 1 ? [parts[0], parts[0]] : [Math.min(...parts), Math.max(...parts)];
}

/* §5. Every rated tile carries a band track, no unrated tile carries one, and
   every track is drawn to the figure printed above it. A mark landing in a
   zone the pill beside it contradicts is the same class of fault as a rating
   contradicting a threshold, so it is counted the same way. */
function assertBars(id, tileGrid) {
  for (const t of tilesOf(tileGrid)) {
    const isPm = t.label.startsWith('Concurrent projects per PM');
    const isBau = t.label.startsWith('Live projects per effective BAU FTE');

    if (t.rag === 'unrated') {
      /* No track on the contractor companion. It has no thresholds, and one
         drawn there would assert a rating that does not exist (§3.2). */
      if (t.bar) { fail++; barFaults++; failures.push(`${id}: the unrated tile carries a band track`); }
      else pass++;
      continue;
    }
    if (!isPm && !isBau) {
      fail++; barFaults++; failures.push(`${id}: unrecognised tile "${t.label}"`); continue;
    }
    if (!t.bar) {
      fail++; barFaults++; failures.push(`${id}: ${isPm ? 'PM' : 'BAU'} tile has no band track`); continue;
    }

    const t1 = isPm ? BAR.T1_PM : BAR.T1_FTE;
    const t2 = isPm ? BAR.T2_PM : BAR.T2_FTE;
    const hardMin = isPm ? BAR.MIN_PM : BAR.MIN_FTE;
    const shown = shownSpan(t.value);
    if (!shown) {
      fail++; barFaults++; failures.push(`${id}: cannot read the tile figure "${t.value}"`); continue;
    }

    const want = expectedBar(shown[0], shown[1], t1, t2, hardMin);
    const got = t.bar;
    const geometry = got.healthy === want.healthy && got.atrisk === want.atrisk
      && got.left === want.left && got.width === want.width && got.hasOver;
    if (!geometry) {
      fail++; barFaults++;
      failures.push(`${id}: ${isPm ? 'PM' : 'BAU'} track geometry — want ${JSON.stringify(want)}, `
        + `got ${JSON.stringify(got)}`);
    } else pass++;

    /* Two ticks, at the thresholds, labelled with the threshold values. A
       threshold drawn in one place and labelled with another is what this
       pins. */
    const wantTicks = [{ at: want.t1, label: t1.toFixed(1) }, { at: want.t2, label: t2.toFixed(1) }];
    if (JSON.stringify(got.ticks) !== JSON.stringify(wantTicks)) {
      fail++; barFaults++;
      failures.push(`${id}: ${isPm ? 'PM' : 'BAU'} ticks — want ${JSON.stringify(wantTicks)}, `
        + `got ${JSON.stringify(got.ticks)}`);
    } else pass++;

    /* The mark's colour is the tile's rating, and the rating is taken on the
       adverse endpoint — the higher ratio, at the top of the printed span. The
       zone that endpoint falls in has to be the zone the pill names. */
    if (got.markRag !== t.rag || zoneOf(shown[1], t1, t2) !== t.rag) {
      fail++; contradictions++; barFaults++;
      failures.push(`${id}: ${isPm ? 'PM' : 'BAU'} track marks ${got.markRag} at ${t.value}, `
        + `tile rates ${t.rag}`);
    } else pass++;

    /* The picture is hidden from assistive technology and the label carries
       the same thresholds in words, so the track is not read out as four
       positioned spans and two bare decimals. */
    if (got.hidden !== 2 || !got.aria.startsWith(t.value)
        || !got.aria.includes(`healthy to ${t1.toFixed(1)}`)
        || !got.aria.includes(`watch to ${t2.toFixed(1)}`)
        || !got.aria.includes(`at risk above ${t2.toFixed(1)}`)) {
      fail++; barFaults++;
      failures.push(`${id}: ${isPm ? 'PM' : 'BAU'} track label — "${got.aria}"`);
    } else pass++;
  }
}

/* ------------------------------------------------------------ §5 copy rule */
const BANNED = ['approximately', 'roughly', 'estimated', 'very likely', 'significantly higher'];
/* `about` and `around` are deliberately absent: a mechanical check cannot tell
   "around 17 projects" from "questions around your team", and a check that fails
   on legitimate copy gets switched off. Review handles those two. */
const PRICE_COMPARISON = /\b(pays? for itself|payback|breaks? even|break-even|recovered? cost|saving of|save[sd]? you|return on investment|ROI)\b/i;

function copyRuleViolations(text) {
  const found = [];
  const lower = text.toLowerCase();
  for (const w of BANNED) if (lower.includes(w)) found.push(w);
  if (PRICE_COMPARISON.test(text)) found.push('price-vs-saving comparison');
  return found;
}

function badNumbers(text) {
  return /NaN|Infinity|undefined|£NaN/.test(text);
}

/* No published figure may be a midpoint of its own range. Checked structurally
   below rather than by scanning text — a midpoint that happens to equal an
   endpoint is not a fault, and one that does not is caught by the oracle. */

/* =========================================================== §4 fixtures ==== */
function assertFixture(name, shape, expect) {
  section(`Fixture ${name}`);
  const cap = capture(shape);
  if (!ok(cap.ok, `${name}: renders`, cap.error)) return cap;
  const c = cap.computed;
  const lo = c.at[0], hi = c.at[1];
  const h = c.ceiling, hh = c.ceilingHi;

  /* The loaded cost the fixture pins, before anything built on it. */
  eq(roundN(c.loaded.total, 2), FIXTURE_LOADED_COST, `${name}: loaded cost pinned at £65,000`);

  eq(round1(lo.bauEffectiveFte), expect.bauFteLo, `${name}: bau_effective_fte lo`);
  eq(round1(hi.bauEffectiveFte), expect.bauFteHi, `${name}: bau_effective_fte hi`);
  eq(round1(lo.internalProjectFte), expect.ipfLo, `${name}: internal_project_fte lo`);
  eq(round1(hi.internalProjectFte), expect.ipfHi, `${name}: internal_project_fte hi`);

  eq(round1(c.pmLoad), expect.pmConcurrent, `${name}: concurrent projects per PM`);
  eq(cap.sender.rag_pm, expect.ragPM, `${name}: PM tile rating`);

  /* The BAU ratio is highest at the adverse endpoint, which is where it rates. */
  eq(round1(hi.projectsPerFTE), expect.perFteLo, `${name}: live per effective BAU FTE, low end of range`);
  eq(round1(lo.projectsPerFTE), expect.perFteHi, `${name}: live per effective BAU FTE, high end of range`);
  eq(cap.sender.rag_bau, expect.ragBAU, `${name}: BAU tile rating, from the adverse endpoint`);

  eq(h.pmLive, expect.pmRedLive, `${name}: pm_red_live`);
  eq(h.pmAnnual, expect.pmRedAnnual, `${name}: pm_red_annual`);
  eq(h.bauLive, expect.bauRedLiveLo, `${name}: bau_red_live, adverse endpoint`);
  eq(hh.bauLive, expect.bauRedLiveHi, `${name}: bau_red_live, other endpoint`);
  eq(h.bauAnnual, expect.bauRedAnnualLo, `${name}: bau_red_annual, adverse endpoint`);
  eq(hh.bauAnnual, expect.bauRedAnnualHi, `${name}: bau_red_annual, other endpoint`);
  eq(h.sustainable, expect.sustainable, `${name}: sustainable annual pace, adverse endpoint`);
  eq(hh.sustainable, expect.sustainable, `${name}: sustainable annual pace, other endpoint`);
  eq(h.binding, expect.binding, `${name}: binding route`);
  eq(h.value, expect.headroom, `${name}: growth ceiling`);
  eq(cap.sender.headroom, expect.headroom, `${name}: headroom posted to Sender, unclamped`);

  eq(c.derivedRunShare[0], expect.derivedRunLo, `${name}: derived run share lo`);
  eq(c.derivedRunShare[1], expect.derivedRunHi, `${name}: derived run share hi`);
  eq(c.corroboration, expect.corroboration, `${name}: corroboration`);

  eq(round1(c.ticketFTE[0]), expect.ticketLo, `${name}: ticket FTE lo`);
  eq(round1(c.ticketFTE[1]), expect.ticketHi, `${name}: ticket FTE hi`);
  eq(round1(c.runWorkFte), expect.runWork, `${name}: run work reported`);
  eq(c.runWorkGap[0], expect.gapLo, `${name}: run-work gap lo, from displayed values`);
  eq(c.runWorkGap[1], expect.gapHi, `${name}: run-work gap hi, from displayed values`);

  /* null rather than 0 where the cost block is suppressed. Math.round(null) is
     0, which would let a suppressed figure pass as a computed one. */
  const money = (x) => (x === null ? null : Math.round(x));
  eq(money(lo.internalEffortCost), expect.effortLo, `${name}: internal effort cost lo`);
  eq(money(hi.internalEffortCost), expect.effortHi, `${name}: internal effort cost hi`);
  eq(c.sums, expect.sums, `${name}: summing path`);
  eq(lo.fullPortfolioCost, expect.fullLo, `${name}: full portfolio cost lo`);
  eq(hi.fullPortfolioCost, expect.fullHi, `${name}: full portfolio cost hi`);
  if (expect.reportedLo !== undefined) {
    eq(roundN(hi.reportedShare, 1), expect.reportedLo, `${name}: reported share lo`);
    eq(roundN(lo.reportedShare, 1), expect.reportedHi, `${name}: reported share hi`);
  }

  /* §4.1 and §4.2. Typed in by hand from the PR3 brief, like every other
     figure here, and cross-checked against the oracle in the corpus loop. */
  eq(c.typicalDurationMonths, expect.duration, `${name}: typical project duration`);
  eq(c.typicalDurationMonths, typicalDurationMonths(cap.values),
     `${name}: typical project duration agrees with the oracle`);
  eq(round1(c.itPercent), expect.itShare, `${name}: IT staff as a share of the company`);
  eq(round1(c.itPercent), itShare(cap.values),
     `${name}: IT share agrees with the oracle`);

  eq(c.licenceCount, expect.licences, `${name}: licence count, contractors excluded`);
  eq(c.yearly, expect.yearly, `${name}: annual price`);
  eq(c.spendPct === null ? null : c.spendPct.toFixed(2), expect.spendPct, `${name}: share of reported spend`);
  if (expect.fullPctLo !== undefined) {
    eq(roundN(c.fullCostPct[1], 2), expect.fullPctLo, `${name}: ProjexaR share of full cost, lo`);
    eq(roundN(c.fullCostPct[0], 2), expect.fullPctHi, `${name}: ProjexaR share of full cost, hi`);
  }

  const text = allText(cap, { forCopyRule: true });
  ok(copyRuleViolations(text).length === 0, `${name}: copy rule`, copyRuleViolations(text).join(', '));
  ok(!badNumbers(allText(cap)), `${name}: no NaN/Infinity/undefined`);
  return cap;
}

const capA = assertFixture('8.A', FIXTURE_A, {
  bauFteLo: 6.2, bauFteHi: 8.0, ipfLo: 10.8, ipfHi: 13.0,
  pmConcurrent: 9.0, ragPM: 'At risk', perFteLo: 5.6, perFteHi: 7.3, ragBAU: 'Watch',
  pmRedLive: 36, pmRedAnnual: 59,
  bauRedLiveLo: 63, bauRedLiveHi: 81, bauRedAnnualLo: 104, bauRedAnnualHi: 134,
  sustainable: 58, binding: 'Concurrent projects per PM', headroom: -17,
  derivedRunLo: 71.1, derivedRunHi: 76.0, corroboration: 'healthy',
  ticketLo: 3.0, ticketHi: 5.6, runWork: 32.4, gapLo: 26.8, gapHi: 29.4,
  effortLo: 702000, effortHi: 845000, sums: true,
  fullLo: 1069000, fullHi: 1212000, reportedLo: 30.3, reportedHi: 34.3,
  duration: 7.2, itShare: 3.8,
  licences: 25, yearly: 2500, spendPct: '0.68', fullPctLo: 0.21, fullPctHi: 0.23,
});

/* §4 states £656,000 for 8.B's lower endpoint. 10.1 × £65,000 is £656,500
   exactly, and every other figure in all three fixtures reproduces. Confirmed
   with Mark: the fixture value was a slip, cost figures display in whole pounds
   rounded half-up, and £656,500 is what the suite asserts. */
const capB = assertFixture('8.B', FIXTURE_B, {
  bauFteLo: 6.1, bauFteHi: 7.0, ipfLo: 9.3, ipfHi: 10.6,
  pmConcurrent: 4.0, ragPM: 'Healthy', perFteLo: 2.3, perFteHi: 2.6, ragBAU: 'Healthy',
  pmRedLive: 29, pmRedAnnual: 43,
  bauRedLiveLo: 62, bauRedLiveHi: 71, bauRedAnnualLo: 92, bauRedAnnualHi: 106,
  sustainable: 42, binding: 'Concurrent projects per PM', headroom: 18,
  derivedRunLo: 55.8, derivedRunHi: 61.2, corroboration: 'healthy',
  ticketLo: 4.4, ticketHi: 8.2, runWork: 13.4, gapLo: 5.2, gapHi: 9.0,
  effortLo: 604500, effortHi: 689000, sums: false,
  fullLo: null, fullHi: null,
  duration: 8.0, itShare: 4.0,
  licences: 14, yearly: 1400, spendPct: '0.78',
});

const capC = assertFixture('8.C', FIXTURE_C, {
  bauFteLo: 6.2, bauFteHi: 8.0, ipfLo: 10.8, ipfHi: 13.0,
  pmConcurrent: 9.0, ragPM: 'At risk', perFteLo: 5.6, perFteHi: 7.3, ragBAU: 'Watch',
  pmRedLive: 36, pmRedAnnual: 59,
  bauRedLiveLo: 63, bauRedLiveHi: 81, bauRedAnnualLo: 104, bauRedAnnualHi: 134,
  sustainable: 58, binding: 'Concurrent projects per PM', headroom: -17,
  derivedRunLo: 71.1, derivedRunHi: 76.0, corroboration: 'healthy',
  ticketLo: 3.0, ticketHi: 5.6, runWork: 32.4, gapLo: 26.8, gapHi: 29.4,
  effortLo: 702000, effortHi: 845000, sums: true,
  fullLo: 1069000, fullHi: 1212000, reportedLo: 30.3, reportedHi: 34.3,
  duration: 7.2, itShare: 3.8,
  /* §4.1, PR7. 8.C is 8.A with six contractors, so approving §4.1 moves its
     licence quote: 20 BAU + 5 PMs + 6 contractors = 31, and everything priced
     off that basis moves with it.

     The PR7 brief said §4.1 had "no numeric impact on fixtures 8.A to 8.F, all
     of which set contractors to zero". 8.C sets six. These five figures are the
     counter-example, and they are the only figures in 8.A to 8.F that move —
     every rated quantity, every FTE, the growth ceiling and the cost block are
     unchanged, which is what 8.C existed to prove in the first place. */
  licences: 31, yearly: 3100, spendPct: '0.84', fullPctLo: 0.26, fullPctHi: 0.29,
});

/* Fixture 8.D — 8.A reported in dollars. Every rated figure, every FTE, the
   growth ceiling and the licence count are 8.A's, typed in again rather than
   read back from capA, so a change in 8.A cannot silently drag 8.D with it.
   What differs is the cost block, which is gone, and the share of reported
   spend, which crossed two currencies and is gone with it. */
const capD = assertFixture('8.D', FIXTURE_D, {
  bauFteLo: 6.2, bauFteHi: 8.0, ipfLo: 10.8, ipfHi: 13.0,
  pmConcurrent: 9.0, ragPM: 'At risk', perFteLo: 5.6, perFteHi: 7.3, ragBAU: 'Watch',
  pmRedLive: 36, pmRedAnnual: 59,
  bauRedLiveLo: 63, bauRedLiveHi: 81, bauRedAnnualLo: 104, bauRedAnnualHi: 134,
  sustainable: 58, binding: 'Concurrent projects per PM', headroom: -17,
  derivedRunLo: 71.1, derivedRunHi: 76.0, corroboration: 'healthy',
  ticketLo: 3.0, ticketHi: 5.6, runWork: 32.4, gapLo: 26.8, gapHi: 29.4,
  effortLo: null, effortHi: null, sums: true,
  fullLo: null, fullHi: null,
  duration: 7.2, itShare: 3.8,
  licences: 25, yearly: 2500, spendPct: null,
});

/* Fixtures 8.E and 8.F — 8.A with only the run share moved, one either side of
   the corroboration window of 68.1 to 78.1. Run work and the non-ticket gap
   move with the run share; nothing else does. */
const capE = assertFixture('8.E', FIXTURE_E, {
  bauFteLo: 6.2, bauFteHi: 8.0, ipfLo: 10.8, ipfHi: 13.0,
  pmConcurrent: 9.0, ragPM: 'At risk', perFteLo: 5.6, perFteHi: 7.3, ragBAU: 'Watch',
  pmRedLive: 36, pmRedAnnual: 59,
  bauRedLiveLo: 63, bauRedLiveHi: 81, bauRedAnnualLo: 104, bauRedAnnualHi: 134,
  sustainable: 58, binding: 'Concurrent projects per PM', headroom: -17,
  derivedRunLo: 71.1, derivedRunHi: 76.0, corroboration: 'watch',
  ticketLo: 3.0, ticketHi: 5.6, runWork: 36.9, gapLo: 31.3, gapHi: 33.9,
  effortLo: 702000, effortHi: 845000, sums: true,
  fullLo: 1069000, fullHi: 1212000, reportedLo: 30.3, reportedHi: 34.3,
  duration: 7.2, itShare: 3.8,
  licences: 25, yearly: 2500, spendPct: '0.68', fullPctLo: 0.21, fullPctHi: 0.23,
});

const capF = assertFixture('8.F', FIXTURE_F, {
  bauFteLo: 6.2, bauFteHi: 8.0, ipfLo: 10.8, ipfHi: 13.0,
  pmConcurrent: 9.0, ragPM: 'At risk', perFteLo: 5.6, perFteHi: 7.3, ragBAU: 'Watch',
  pmRedLive: 36, pmRedAnnual: 59,
  bauRedLiveLo: 63, bauRedLiveHi: 81, bauRedAnnualLo: 104, bauRedAnnualHi: 134,
  sustainable: 58, binding: 'Concurrent projects per PM', headroom: -17,
  derivedRunLo: 71.1, derivedRunHi: 76.0, corroboration: 'note',
  ticketLo: 3.0, ticketHi: 5.6, runWork: 27.0, gapLo: 21.4, gapHi: 24.0,
  effortLo: 702000, effortHi: 845000, sums: true,
  fullLo: 1069000, fullHi: 1212000, reportedLo: 30.3, reportedHi: 34.3,
  duration: 7.2, itShare: 3.8,
  licences: 25, yearly: 2500, spendPct: '0.68', fullPctLo: 0.21, fullPctHi: 0.23,
});

/* Fixture 8.H — 8.A with project managers at 41-50%. PR13 §5.

   Every figure below is derived from the formulas, by hand, before the suite
   was run, in the same way 8.A's were. The derivation, endpoint by endpoint:

     pm FTE      5 x 0.41 = 2.05 -> 2.1     5 x 0.50 = 2.5
     BAU FTE     20 x 0.31 = 6.2            20 x 0.40 = 8.0
     internal    2.1 + 6.2 = 8.3            2.5 + 8.0 = 10.5
     effort      8.3 x 65,000 = 539,500     10.5 x 65,000 = 682,500
     full        539,500 + 367,000          682,500 + 367,000
                 = 906,500                  = 1,049,500
     reported    367,000/906,500 = 40.5%    367,000/1,049,500 = 35.0%
     change      8.3/45 = 18.4%             10.5/45 = 23.3%
     run         100 - 18.4 = 81.6%         100 - 23.3 = 76.7%
     window      76.7 - 3 = 73.7 to 81.6 + 3 = 84.6, against a stated 72%

   The corroboration branch differs from 8.A's and that is the point rather
   than a side effect: part-time managers imply less change effort, so the same
   stated 72% that sat inside 8.A's window sits below this one. The check is a
   named consumer of internal project FTE.

   Everything else is asserted equal to 8.A by value, typed in again rather than
   read back from capA, so a change in 8.A cannot drag 8.H with it. */
const capH = assertFixture('8.H', FIXTURE_H, {
  bauFteLo: 6.2, bauFteHi: 8.0, ipfLo: 8.3, ipfHi: 10.5,
  pmConcurrent: 9.0, ragPM: 'At risk', perFteLo: 5.6, perFteHi: 7.3, ragBAU: 'Watch',
  pmRedLive: 36, pmRedAnnual: 59,
  bauRedLiveLo: 63, bauRedLiveHi: 81, bauRedAnnualLo: 104, bauRedAnnualHi: 134,
  sustainable: 58, binding: 'Concurrent projects per PM', headroom: -17,
  derivedRunLo: 76.7, derivedRunHi: 81.6, corroboration: 'note',
  ticketLo: 3.0, ticketHi: 5.6, runWork: 32.4, gapLo: 26.8, gapHi: 29.4,
  effortLo: 539500, effortHi: 682500, sums: true,
  fullLo: 906500, fullHi: 1049500, reportedLo: 35.0, reportedHi: 40.5,
  duration: 7.2, itShare: 3.8,
  licences: 25, yearly: 2500, spendPct: '0.68', fullPctLo: 0.24, fullPctHi: 0.28,
});

/* ------------------------------------------- §4 figures as they are printed */
section('§4 figures as the reader sees them');
if (capA.ok) {
  const t = allText(capA);
  ok(has(capA.screen.costFigure, '£1.07m–£1.21m'),
     '8.A: full portfolio cost reads £1.07m–£1.21m', capA.screen.costFigure);
  ok(has(capA.screen.costEyebrow, 'The full cost of your portfolio'),
     '8.A: hero label is "The full cost of your portfolio"', capA.screen.costEyebrow);
  ok(!/true cost/i.test(t), '8.A: nothing is called the "true cost"');
  ok(!/invisible/i.test(t), '8.A: the internal figure is never called "invisible"');
  ok(has(t, '6.2–8.0'), '8.A: effective BAU FTE prints as 6.2–8.0');
  ok(has(t, '5.6–7.3'), '8.A: live per BAU FTE prints as 5.6–7.3');
  ok(has(t, '3.0–5.6'), '8.A: ticket FTE prints as 3.0–5.6');
  ok(has(t, '26.8–29.4'), '8.A: run-work gap prints as 26.8–29.4');
  ok(has(t, '£702,000–£845,000'), '8.A: internal effort cost prints as £702,000–£845,000');
  ok(has(t, '30.3%–34.3%'), '8.A: reported share prints as 30.3%–34.3%');
  ok(has(t, '0.68%'), '8.A: ProjexaR is 0.68% of reported spend');
  ok(has(t, '0.21%–0.23%'), '8.A: ProjexaR is 0.21%–0.23% of full cost');
  ok(has(t, '(25 × £10 × 10, the annual plan paid upfront) ÷ 367000')
     || has(t, '25 × £10 × 10'), '8.A: workings row multiplies by ten months, not twelve');
  ok(!/× £10 × 12/.test(t), '8.A: no × 12 workings row survives');
  ok(has(t, 'annual plan, two months free'), '8.A: the conversion panel names the discount');
  eq(capA.sender.headroom, -17, '8.A: Sender headroom signed and unclamped');
}
if (capB.ok) {
  const t = allText(capB);
  /* The §2.2 case. 13.44 displays 13.4 and 4.375 displays 4.4; the gap computed
     from the raw floats is 9.065 -> 9.1, and from the displayed figures 9.0.
     9.0 is what the page must print, because 13.4 − 4.4 = 9.0 is the sum the
     reader can do on the page. */
  ok(has(t, '5.2–9.0'), '8.B: run-work gap reads 5.2–9.0, from displayed values');
  ok(!/5\.2–9\.1/.test(t), '8.B: the gap is not 9.1');
  ok(has(t, '13.4'), '8.B: run work reported prints as 13.4');
  ok(has(t, '4.4–8.2'), '8.B: ticket FTE prints as 4.4–8.2');
  ok(has(t, '£604,500–£689,000'), '8.B: internal effort cost prints as £604,500–£689,000');
  ok(has(capB.screen.costEyebrow, 'What the internal time on your projects costs'),
     '8.B: the non-summing path does not claim a full portfolio cost', capB.screen.costEyebrow);
  /* PR8 §5. Read off the render, not off allText(): #fullCostTile carries its
     heading in the markup and is hidden where no cost was computed, so the file
     contains the string on every shape and only the render can answer this. */
  ok(!/full cost of your portfolio/i.test(renderedText(capB)),
     '8.B: no full-cost claim on the non-summing path');
}


/* --------------------------------------------- 8.B — everything must be Healthy */
section('Fixture 8.B — the third state has to land');
if (capB.ok) {
  eq(capB.sender.rag_pm, 'Healthy', '8.B: PM tile Healthy');
  eq(capB.sender.rag_bau, 'Healthy', '8.B: BAU tile Healthy');
  eq(capB.computed.corroboration, 'healthy', '8.B: corroboration Healthy');
  const findings = capB.print['pr-cards'].match(/<span class="p-rag">([^<]+)<\/span>/g)
    .map((m) => m.replace(/<[^>]*>/g, ''));
  eq(findings.length, 4, '8.B: exactly four findings');
  ok(findings.every((f) => f === 'Healthy'), '8.B: all four findings Healthy', findings.join(' | '));
  const t = allText(capB);
  ok(!/At risk/.test(t), '8.B: no At risk anywhere in the report', (t.match(/.{60}At risk.{60}/) || [''])[0]);
  /* PR15 §4.2. "Room to grow: 18 more projects a year at today's pace" offered
     headroom in bold where the reader's question is how close they are to
     trouble, so the card states a distance to the boundary instead. What this
     assertion is for is unchanged and is the reason it is not pinned by
     string: the positive branch must render as a distance BELOW the red point
     and never as a negative quantity, which is the next assertion down. */
  ok(/sits 18 below the point at which/.test(capB.screen.ceilingFigure),
     '8.B: ceiling renders the positive branch as a distance below the boundary',
     capB.screen.ceilingFigure);
  ok(!/Room to grow|room to raise/i.test(allText(capB)),
     '8.B: and the headroom framing it replaced is gone from every surface');
  ok(!/-18|−18/.test(t), '8.B: no negative rendering');
  /* The hero swap: growth ceiling leads on the non-summing path. */
  eq(capB.hero.ceilingOrder, '0', '8.B: growth ceiling leads');
  eq(capB.hero.costOrder, '1', '8.B: the cost block drops to second');
  ok(/secondary/.test(capB.hero.costClass), '8.B: the cost block is styled as secondary');
  ok(!/secondary/.test(capB.hero.ceilingClass), '8.B: the ceiling is not');
  /* PR8 §2.3. The printed summary no longer mirrors the screen's hero swap:
     slot 1 is the full portfolio cost on every shape, slot 2 the ceiling gap,
     slot 3 the internal staff cost. On 8.B the portfolio cost does not sum, so
     slot 1 states the reason and the ceiling keeps slot 2. */
  eq(capB.print['pr-sum1figure'], 'Not computed', '8.B: no full portfolio cost to summarise');
  eq(capB.print['pr-sum2head'], 'Portfolio growth ceiling', '8.B: the ceiling holds slot 2');
}

section('Fixture 8.A — negative headroom in prose, and the full-cost hero');
if (capA.ok) {
  eq(capA.screen.ceilingFigure, 'You are running 17 projects a year above your sustainable pace.',
     '8.A: ceiling figure');
  ok(!/-17|−17/.test(allText(capA)), '8.A: no minus sign rendered anywhere');
  ok(!/\b0 projects a year\b/.test(allText(capA)), '8.A: no zero standing in for the overrun');
  ok(/At risk/.test(capA.print['pr-tiles']), '8.A: PM tile prints At risk');
  /* The hero swap the other way. */
  eq(capA.hero.costHidden, false, '8.A: the full-cost tile renders');
  eq(capA.hero.costOrder, '0', '8.A: full cost leads');
  eq(capA.hero.ceilingOrder, '1', '8.A: the growth ceiling drops to second');
  ok(/secondary/.test(capA.hero.ceilingClass), '8.A: the ceiling is styled as secondary');
  ok(!/secondary/.test(capA.hero.costClass), '8.A: the cost tile is not');
  eq(capA.print['pr-sum1head'], 'The full cost of your portfolio', '8.A: the printed summary opens on full cost');
  eq(capA.print['pr-sum2head'], 'Portfolio growth ceiling', '8.A: the ceiling gap is second');
  const findings = capA.print['pr-cards'].match(/<span class="p-rag">([^<]+)<\/span>/g)
    .map((m) => m.replace(/<[^>]*>/g, ''));
  eq(findings.length, 4, '8.A: exactly four findings');
  eq(findings[0], 'Watch', '8.A: finding 1 — BAU capacity spread — Watch');
  eq(findings[1], 'At risk', '8.A: finding 2 — no single current view — At risk');
  eq(findings[2], 'Watch', '8.A: finding 3 — line-manager commitments — Watch');
  eq(findings[3], 'Watch', '8.A: finding 4 — budgets carry out-the-door spend — Watch');
}

/* ================================ the full-cost tile renders before the gate == */
section('§3.1 — the full-cost tile renders before the email gate, unobscured');
{
  /* The gate is the last block on the page and the tile is rendered into the
     capacity section above it, so position is structural. What is asserted here
     is that nothing gates, blurs or partially reveals it: it is unhidden, its
     figure is complete, and no gating class or "sign up" copy touches it. */
  const html = readFileSync(TOOL_PATH, 'utf8');
  const heroAt = html.indexOf('id="heroArea"');
  const gateAt = html.indexOf('<div class="gate" id="gate">');
  ok(heroAt > 0 && gateAt > heroAt, 'the hero area is in the markup before the email gate');
  for (const cap of [capA, capC]) {
    /* §0.18's neighbour: a shape that stops rendering must fail here, not be
       skipped into a loop body that then asserts nothing. */
    if (!ok(cap.ok, `${cap.id}: renders`, cap.error)) continue;
    eq(cap.hero.costHidden, false, `${cap.id}: the tile is not hidden`);
    ok(!/blur|locked|gated|teaser/i.test(cap.hero.costClass), `${cap.id}: no gating class on the tile`);
    ok(/£/.test(cap.screen.costFigure), `${cap.id}: the figure itself is rendered`, cap.screen.costFigure);
    ok(!/sign up|enter your email|unlock/i.test(cap.screen.costNote + cap.screen.costFigure),
       `${cap.id}: nothing asks for an email to see the figure`);
  }
}

/* ======================================== §1 the currency gate ============== */
section('§1 — the cost block runs on sterling only, and says so otherwise');
{
  /* Six options in the markup, and exactly one of them gates. Read out of the
     real <select> rather than restated here, so an option added to the form
     without a decision about it fails this rather than shipping unpriced. */
  const tool = loadTool();
  const options = tool.selects.currency.map(([value]) => value);
  eq(options.join(','), CURRENCIES.join(','), 'the six currency options are the six the suite knows about');
  eq(options.filter((o) => pricesCosts({ currency: o })).join(','), COST_CURRENCY,
     'exactly one option gates the cost block, and it is GBP');

  /* 8.D must match 8.A on every rated figure. Asserted node by node rather than
     figure by figure: anything the gate touched beyond the cost block shows up
     here even if no named assertion covers it. */
  if (capA.ok && capD.ok) {
    const RATED = ['positionLead', 'tileGrid', 'rangeNote', 'ceilingEyebrow', 'ceilingFigure', 'ceilingNote'];
    for (const id of RATED) {
      eq(capD.screen[id], capA.screen[id], `8.D: ${id} is identical to 8.A`);
    }
    eq(capD.print['pr-tiles'], capA.print['pr-tiles'], '8.D: the printed capacity table is identical to 8.A');
    /* The four findings keep their ratings. One body changes: the out-the-door
       finding pointed at a cost tile the gate removed, and a sentence naming a
       figure that is no longer on the page is exactly the fault this PR is
       for. Ratings are compared, and the replacement is asserted below. */
    const ratings = (cap) => (cap.print['pr-cards'].match(/<span class="p-rag">([^<]+)<\/span>/g) || [])
      .map((m) => m.replace(/<[^>]*>/g, '')).join(',');
    eq(ratings(capD), ratings(capA), '8.D: the four finding ratings are identical to 8.A');
    ok(!has(capD.print['pr-cards'], 'The tile above puts a number on the difference'),
       '8.D: no finding points at the removed cost tile');
    ok(has(capD.print['pr-cards'], 'We have not put a number on that difference'),
       '8.D: and the finding says so instead');
    ok(has(capA.print['pr-cards'], 'The tile above puts a number on the difference'),
       '8.A: the sterling report still points at its cost tile');
    ok(has(capA.print['pr-inputs'], 'Median IT salary the cost figures use'),
       '8.A: the sterling report still says the salary was used');
    eq(capD.sender.rag_pm, capA.sender.rag_pm, '8.D: PM rating unmoved');
    eq(capD.sender.rag_bau, capA.sender.rag_bau, '8.D: BAU rating unmoved');
    eq(capD.sender.headroom, capA.sender.headroom, '8.D: growth ceiling unmoved');
    eq(capD.sender.licence_count, capA.sender.licence_count, '8.D: licence count unmoved');
    eq(capD.sender.effective_fte, capA.sender.effective_fte, '8.D: effective FTE unmoved');
  }

  for (const shape of currencyShapes()) {
    const cap = capture(shape);
    if (!ok(cap.ok, `${shape.id}: renders`, cap.error)) continue;
    const c = cap.computed;
    const t = allText(cap);
    const o = evaluate(cap.values);
    eq(c.priceCosts, shape.prices, `${shape.id}: the gate agrees with the oracle`);
    eq(o.priceCosts, shape.prices, `${shape.id}: the oracle gates on the same answer`);

    if (shape.prices) {
      ok(c.at[0].internalEffortCost !== null, `${shape.id}: the cost block runs`);
      eq(cap.hero.costExclusionsHidden, false,
         `${shape.id}: the cost-exclusions paragraph is shown where cost figures are`);
      ok(c.spendPct !== null, `${shape.id}: the share of reported spend is published`);
      eq(cap.hero.currencyNoteHidden, true, `${shape.id}: no suppression reason is shown`);
      continue;
    }

    /* Every cost figure, and every ratio that would cross the two currencies. */
    eq(c.at[0].internalEffortCost, null, `${shape.id}: no internal effort cost`);
    eq(c.at[1].internalEffortCost, null, `${shape.id}: no internal effort cost at the other endpoint`);
    eq(c.at[0].fullPortfolioCost, null, `${shape.id}: no full portfolio cost`);
    eq(c.at[1].fullPortfolioCost, null, `${shape.id}: no full portfolio cost at the other endpoint`);
    eq(c.at[0].reportedShare, null, `${shape.id}: no reported share of full cost`);
    eq(c.at[1].reportedShare, null, `${shape.id}: no reported share at the other endpoint`);
    eq(c.spendPct, null, `${shape.id}: no ProjexaR share of reported spend`);
    eq(c.fullCostPct, null, `${shape.id}: no ProjexaR share of full cost`);
    /* The oracle, independently. */
    eq(o.at[0].internalEffortCost, null, `${shape.id}: the oracle suppresses the cost too`);
    eq(o.spendPct, null, `${shape.id}: the oracle suppresses the share of spend too`);

    /* The hero falls back through the non-summing path, and the block is gone
       from both renderings rather than merely emptied. */
    eq(cap.hero.costHidden, true, `${shape.id}: the cost tile does not render`);
    eq(cap.hero.ceilingOrder, '0', `${shape.id}: the growth ceiling leads`);
    eq(cap.print['pr-sum1figure'], 'Not computed', `${shape.id}: no full portfolio cost in the printed summary`);
    eq(cap.print['pr-sum3figure'], 'Not computed', `${shape.id}: and no internal staff cost either`);
    eq(cap.print['pr-sum2head'], 'Portfolio growth ceiling', `${shape.id}: the ceiling gap holds slot 2`);

    /* The reason, in both renderings. */
    eq(cap.hero.currencyNoteHidden, false, `${shape.id}: the reason is shown on screen`);
    ok(has(cap.screen.costCurrencyNote, 'UK data'), `${shape.id}: the reason names the benchmark`);
    ok(has(cap.screen.costCurrencyNote, 'full-time equivalents'),
       `${shape.id}: the reason says where the effort went instead`);
    /* Their spend is not suppressed. On screen the reason line is the only
       place it survives once the cost block is gone, so it has to carry it, in
       the currency they chose rather than converted into ours. */
    ok(has(cap.screen.costCurrencyNote, '367,000'),
       `${shape.id}: the reason carries their reported spend`, cap.screen.costCurrencyNote);
    ok(!/£367,000/.test(cap.screen.costCurrencyNote),
       `${shape.id}: and does not restate it in sterling`);
    ok(has(cap.print['pr-bandnote'], 'our salary benchmark is UK data'),
       `${shape.id}: the printed report states the reason too`);
    ok(has(cap.print['pr-fxnote'], 'why no cost figure appears'),
       `${shape.id}: the workings page states the reason`);
    ok(has(cap.print['pr-formulas'], 'built on a UK salary survey'),
       `${shape.id}: the workings table says why the cost was not computed`);
    /* The effort survives as FTE, which is what the reason points the reader at. */
    ok(has(cap.print['pr-formulas'], 'Internal project FTE'),
       `${shape.id}: the internal project FTE still publishes`);

    /* Their spend, in their own currency, still appears as they entered it. */
    ok(has(cap.print['pr-inputs'], String(FIXTURE_A.spend).replace(/\B(?=(\d{3})+$)/g, ',')),
       `${shape.id}: their reported spend is still echoed back`);
    /* Nothing may claim a figure was used in a calculation the report did not
       run. The salary row's label does exactly that, so it changes with the
       gate rather than sitting over a suppressed block. */
    ok(!has(cap.print['pr-inputs'], 'Median IT salary the cost figures use'),
       `${shape.id}: no row claims a salary the cost figures used`);
    ok(has(cap.print['pr-inputs'], 'because this report computes no cost figure'),
       `${shape.id}: the salary row says why it was not used`);
    /* The static paragraph about what the cost figures exclude describes a
       calculation that did not run. */
    eq(cap.hero.costExclusionsHidden, true,
       `${shape.id}: the cost-exclusions paragraph is not shown`);
    /* And the price note must not point at a page the price is not on. */
    ok(!/quoted in sterling above/.test(cap.print['pr-fxnote']),
       `${shape.id}: the currency note makes no wrong positional claim`);

    /* No sterling figure anywhere that would have been a cost. The price is the
       one sterling figure that survives, so it is excluded by name. */
    const price = allText(cap).includes('£2,500 a year');
    ok(price, `${shape.id}: the ProjexaR price still publishes in sterling`);
    ok(!/of your project budget/.test(t), `${shape.id}: no share-of-spend percentage`);
    ok(!/full portfolio cost/i.test(t), `${shape.id}: no full portfolio cost claim`);
    ok(!/£728,000|£845,000|£1\.10m|£1\.21m/.test(t), `${shape.id}: no cost figure survives`);
  }
}

/* ================================= new copy carries no em-dash aside ======== */
section('§0 — copy written in this PR carries no em-dash aside');
{
  /* Scoped to the surfaces this PR wrote whole, because that is the only scope
     a mechanical check can be honest about. The §3, §4 and §5 additions extend
     sentences that already carry em-dashes from earlier releases, so a node
     scan would fail on copy this PR did not write. Those three are reviewed,
     and PR6 takes the rest of the report.

     PR6 did take it: "PR6 §1.1" below scans every rendered node on every
     shape and allows no em-dash anywhere. This section is kept because it is
     stricter on these two nodes than that one is, catching an en dash used as
     an aside rather than as a range marker.

     Both dash characters, because an en dash between clauses is the same aside
     wearing different punctuation. The en dash's legitimate use is between the
     ends of a range, which is digit-to-digit, so those are excluded by shape. */
  const NEW_SURFACES = [
    ['costCurrencyNote', (cap) => cap.screen.costCurrencyNote],
    ['pr-fxnote', (cap) => cap.print['pr-fxnote']],
  ];
  const asideDash = (text) => String(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/(\d)\s*[–—]\s*(\d)/g, '$1 to $2')   /* a range is not an aside */
    .match(/[–—]/g);

  for (const shape of currencyShapes()) {
    const cap = capture(shape);
    if (!ok(cap.ok, `${shape.id}: renders`, cap.error)) continue;
    for (const [id, read] of NEW_SURFACES) {
      const found = asideDash(read(cap));
      ok(!found, `${shape.id}: ${id} carries no em-dash aside`, found ? read(cap) : '');
    }
  }
  /* And the two wholly new sentences that live inside older nodes. */
  const cap = capture({ id: 'newcopy', ...FIXTURE_D });
  const bandnote = String(cap.print['pr-bandnote']);
  const currencyRow = bandnote.split('<strong>')
    .find((part) => /our salary benchmark is UK data/.test(part)) || '';
  ok(!asideDash(currencyRow), 'the printed currency suppression note carries no em-dash aside', currencyRow);
}

/* The two suppressions together. Where there is no BAU capacity the cost block
   was already gone for a stated reason, so the currency line would be a second
   reason for the same absence — and its closing clause, that the effort appears
   as full-time equivalents, would not be true. The printed report still carries
   the currency statement, because the share of reported spend is suppressed by
   currency and by nothing else. */
section('§1 — the currency gate and the no-BAU suppression together');
{
  const cap = capture({ id: 'usd-nobau', ...FIXTURE_A, currency: 'USD', bauStaff: 0 });
  if (ok(cap.ok, 'usd-nobau: renders', cap.error)) {
    eq(cap.computed.priceCosts, false, 'usd-nobau: the gate is closed');
    eq(cap.computed.spendPct, null, 'usd-nobau: no cross-currency ratio');
    eq(cap.hero.currencyNoteHidden, true,
       'usd-nobau: the screen gives one reason, not two for the same absence');
    ok(has(cap.print['pr-bandnote'], 'No BAU staff were reported against project work'),
       'usd-nobau: the printed report states the BAU reason');
    ok(has(cap.print['pr-bandnote'], 'our salary benchmark is UK data'),
       'usd-nobau: and the currency reason, which the share of spend needs');
    ok(!/NaN|Infinity|undefined/.test(allText(cap)), 'usd-nobau: nothing broken');
  }
}

/* ============================ §2 the ticket-rate comparison is gone ========= */
section('§2 — tickets per employee and the 0.41–1.38 range are gone');
{
  /* Removed from compute(), not merely from the output. A figure left on the
     compute object is an invitation to publish it again — the same reasoning
     that keeps a Flexera splitDiff off it. */
  const probes = [FIXTURE_A, FIXTURE_B, FIXTURE_C, FIXTURE_D, FIXTURE_E, FIXTURE_F,
    { ...FIXTURE_A, ticketsPerMonth: 1 },        /* far below the old floor */
    { ...FIXTURE_A, ticketsPerMonth: 100000 },   /* far above the old ceiling */
    { ...FIXTURE_A, ticketsPerMonth: null },
    /* The smallest headcount validation allows against 45 IT staff — the
       denominator the removed ratio used, at its most extreme. */
    { ...FIXTURE_A, companyHeadcount: 45 }];
  for (const shape of probes) {
    const cap = capture({ id: 'ticketrate', ...shape });
    if (!ok(cap.ok, 'ticket-rate probe renders', cap.error)) continue;
    const c = cap.computed;
    eq(c.impliedRate, undefined, 'tickets_per_employee is undefined on compute()');
    eq(c.rateOutside, undefined, 'the outside-the-range flag is undefined on compute()');
    const t = allText(cap);
    ok(!/0\.41|1\.38/.test(t), 'neither end of the removed range appears in output');
    ok(!/tickets per employee/i.test(t), 'the tickets-per-employee phrase is gone');
    ok(!/found across sectors/i.test(t), 'the sector comparison sentence is gone');
    ok(!/second look at your ticket figure/i.test(t), 'the consistency callout is gone');
  }
  /* And out of the file altogether, so no constant survives to be re-read. */
  const src = readFileSync(TOOL_PATH, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  ok(!/TICKET_RATE_LO|TICKET_RATE_HI/.test(src), 'the range constants are deleted from the source');
  ok(!/impliedRate|rateOutside/.test(src), 'the derived figure is deleted from the source');
}

/* ================================================= §5 boundary shapes ======= */
section('Boundary shapes — display, rating and threshold agree');
for (const shape of boundaryShapes()) {
  const cap = capture(shape);
  if (!ok(cap.ok, `${shape.id}: renders`, cap.error)) continue;
  const o = evaluate(cap.values);
  const isPm = shape.tile === 'pm';
  const display = isPm ? o.pmDisplay : o.bauDisplay;
  const rating = isPm ? o.ragPM : o.ragBAU;
  const threshold = isPm ? o.pmRedLive : o.bauRedLive;
  const sender = isPm ? cap.sender.rag_pm : cap.sender.rag_bau;

  eq(sender, rating, `${shape.id}: rating matches the band applied to the displayed figure`);
  /* The published threshold must be the first count that actually rates At
     risk — the property the whole rounding rule exists to guarantee. */
  const divisor = isPm ? cap.values.pms : o.bauEffectiveFte;
  const cap0 = isPm ? 7.0 : 10.0;
  ok(round1(threshold / divisor) > cap0, `${shape.id}: threshold ${threshold} rates At risk`);
  ok(round1((threshold - 1) / divisor) <= cap0, `${shape.id}: threshold-1 (${threshold - 1}) does not`);

  if (shape.expectDisplay) {
    eq(display.toFixed(1), shape.expectDisplay, `${shape.id}: displays ${shape.expectDisplay}`);
    eq(sender, shape.expectRating, `${shape.id}: rates ${shape.expectRating}`);
    eq(threshold, shape.expectThreshold, `${shape.id}: publishes threshold ${shape.expectThreshold}`);
  }
}

/* ============================================ §2.1 straddling the boundary === */
section('§2.1 — a band straddling a rating boundary shows both states');
for (const shape of straddleShapes()) {
  const cap = capture(shape);
  if (!ok(cap.ok, `${shape.id}: renders`, cap.error)) continue;
  const o = evaluate(cap.values);
  ok(o.at[0].ragBAU !== o.at[1].ragBAU, `${shape.id}: the band genuinely straddles`,
     `${o.at[0].ragBAU} / ${o.at[1].ragBAU}`);
  eq(cap.sender.rag_bau, shape.expectRating, `${shape.id}: rated on the less favourable endpoint`);
  ok(has(cap.screen.tileGrid, shape.expectStatus),
     `${shape.id}: the tile shows "${shape.expectStatus}"`, cap.screen.tileGrid.slice(0, 400));
  /* The flattering end alone must never appear as the rating. */
  const chips = cap.screen.tileGrid.match(/<span class="pill [^"]*">([^<]+)<\/span>/g)
    .map((m) => m.replace(/<[^>]*>/g, ''));
  ok(chips.includes(shape.expectStatus), `${shape.id}: the pill carries both states`, chips.join(' | '));
}

/* ============================================== toolset invariance ========== */
section('Toolset invariance — no toolset input moves a rating or a figure');
{
  const caps = toolsetInvarianceShapes().map((sh) => ({ sh, cap: capture(sh) }));
  const ref = caps[0].cap;
  for (const { sh, cap } of caps) {
    if (!ok(cap.ok, `${sh.id}: renders`, cap.error)) continue;
    eq(cap.sender.rag_pm, ref.sender.rag_pm, `${sh.id}: rag_pm identical`);
    eq(cap.sender.rag_bau, ref.sender.rag_bau, `${sh.id}: rag_bau identical`);
    eq(cap.sender.headroom, ref.sender.headroom, `${sh.id}: growth ceiling identical`);
    eq(cap.computed.ragPM, ref.computed.ragPM, `${sh.id}: PM tile rating identical`);
    eq(cap.computed.ragFTE, ref.computed.ragFTE, `${sh.id}: BAU tile rating identical`);
    eq(cap.screen.tileGrid, ref.screen.tileGrid, `${sh.id}: both tiles render identically`);
    eq(cap.screen.ceilingFigure, ref.screen.ceilingFigure, `${sh.id}: ceiling figure identical`);
    eq(cap.screen.costFigure, ref.screen.costFigure, `${sh.id}: full cost identical`);
    eq(cap.print['pr-formulas'], ref.print['pr-formulas'], `${sh.id}: every published figure identical`);
  }
}

/* ================= PR13 §1 — the question, and when it is asked ============= */
section('PR13 §1 — banded like the BAU question, asked only where there are PMs');
{
  const tool = loadTool();
  const opts = tool.selects.pmPercent2;
  ok(Array.isArray(opts), 'the share is asked through a select, like the BAU band');
  /* Mirrored exactly, per §1. Compared against the BAU select rather than
     against a list typed here, because "the same banding" is the requirement
     and two lists that drift apart is the way it stops being true. */
  eq(opts.map((o) => o[0]).join(','), tool.selects.bauPercent2.map((o) => o[0]).join(','),
     '§1 — the same ten band values as the BAU question, in the same order');
  eq(opts.map((o) => o[1]).join(','), tool.selects.bauPercent2.map((o) => o[1]).join(','),
     '§1 — and the same labels');

  /* The wording, and the help text that has to work for someone who is a
     project manager by function rather than by title — master §4.3's point,
     which is what makes the share vary in the first place. */
  const html = readFileSync(TOOL_PATH, 'utf8');
  const field = between(html, '<div class="field full" id="f-pmPercent2"', '</div>\n          </div>',
                        'PR13 §1 the project-manager share field');
  /* PR15 addendum §2.4 supersedes the wording, not the claim. "their time"
     named no population, and the BAU label four words away said the same
     thing, so neither label told the reader which group was being asked
     about. The claim this assertion makes is unchanged and is now made in two
     parts: still a blended average, and now naming its own population. */
  ok(has(field, 'blended average share of a project manager&rsquo;s time that goes to project management'),
     '§1 — the label asks for the share as a blended average, of a named population');
  ok(has(field, 'whether or not they hold the title'),
     '§1 — the help text covers a project manager by function rather than by title');
  ok(has(field, 'alongside another role gives less than their whole week'),
     '§1 — and says why the share is not whole');
  ok(has(field, 'range across the band you pick'),
     '§1 — the hint states the range treatment, as the BAU band does');

  /* PR15 addendum §2.4. The two band labels and their two hints must not be
     the same words. The hints were byte-identical, which is how a label
     differing in four words two screens away went unnoticed for four
     releases. Both are extracted and asserted found before they are compared
     (§0.17): if either slice stops matching, this becomes a comparison of
     nothing to nothing and passes. */
  const bauField = between(html, '<div class="field full" id="f-bauPercent2"', '</div>\n          </div>',
                           'PR15 the BAU share field');
  ok(bauField.length > 0, '§2.4 — the BAU share field is found before it is compared');
  const labelOf = (f, id) => (f.match(new RegExp('<label for="' + id + '">([^<]*)')) || [])[1];
  const hintOf = (f) => (f.match(/<span class="hint">([^<]*)/) || [])[1];
  const pmLabel = labelOf(field, 'pmPercent2'), bauLabel = labelOf(bauField, 'bauPercent2');
  const pmHint = hintOf(field), bauHint = hintOf(bauField);
  for (const [v, what] of [[pmLabel, 'PM label'], [bauLabel, 'BAU label'],
                           [pmHint, 'PM hint'], [bauHint, 'BAU hint']]) {
    ok(v !== undefined && v.length > 0, `§2.4 — the ${what} is found before it is compared`);
  }
  ok(pmLabel !== bauLabel, '§2.4 — the two band labels are not the same words');
  ok(pmHint !== bauHint, '§2.4 — and neither are their hints');
  ok(/project manager/.test(pmLabel || ''), '§2.4 — the PM label names its population');
  ok(/BAU/.test(bauLabel || ''), '§2.4 — and the BAU label names its own');
  ok(/project manager/.test(pmHint || '') && /BAU/.test(bauHint || ''),
     '§2.4 — each hint names the population it averages across');

  /* Asked only where there are project managers, and the visibility is asserted
     in BOTH directions. The DOM stub defaults `hidden` to true, so the hidden
     half passes for no reason on its own (§0.16) and the shown half is the one
     that carries the claim. */
  const shown = loadTool();
  shown.node('pms').value = '5';
  shown.api.readAndValidate();
  eq(shown.node('f-pmPercent2').hidden, false, '§1 — shown where there are project managers');

  const gone = loadTool();
  gone.node('pms').value = '0';
  gone.api.readAndValidate();
  eq(gone.node('f-pmPercent2').hidden, true, '§1 — and not asked where there are none');

  /* And it tracks the count as it is typed, not only at submit. */
  const typed = loadTool();
  typed.node('pms').value = '0';
  typed.fire('pms', 'input');
  eq(typed.node('f-pmPercent2').hidden, true, '§1 — the count drives it directly');
  typed.node('pms').value = '3';
  typed.fire('pms', 'input');
  eq(typed.node('f-pmPercent2').hidden, false, '§1 — in both directions');

  /* Required where it is asked, on the same basis as the BAU band. */
  const blank = capture({ id: 'pm-share-blank', ...FIXTURE_A, pmPercent2: '' });
  ok(!blank.valid, '§1 — a blank answer is rejected where the question is asked', blank.error);
  eq(blank.error, 'validation failed at pmPercent2', '§1 — and rejected at that field');

  /* Not required where it is not asked. The BAU band still is, so this is the
     conditional requirement rather than a loosened one. */
  const noPms = capture({ id: 'pm-share-nopms', ...FIXTURE_A, pms: 0, pmPercent2: '' });
  ok(noPms.ok, '§1 — with no project managers a blank answer is not an omission', noPms.error);
  eq(noPms.values.pmPercent2, '', '§1 — and nothing is assumed in its place');
  eq(noPms.computed.at[0].pmProjectFte, 0,
     '§1 — no project managers means no project manager capacity, which is zero rather than absent');
  eq(noPms.computed.noPmShare, false, '§1 — and nothing is suppressed');

  /* A stale answer left behind by a count that dropped to zero is discarded
     rather than carried into the report or into the saved link. */
  const stale = capture({ id: 'pm-share-stale', ...FIXTURE_A, pms: 0, pmPercent2: 91 });
  ok(stale.ok, '§1 — a stale answer does not stop the report');
  eq(stale.values.pmPercent2, '', '§1 — the answer to a question we did not ask is dropped');
  ok(!/[?&]pp=/.test(stale.permalink), '§1 — and the saved link does not carry it', stale.permalink);
  eq(stale.computed.at[0].internalProjectFte, noPms.computed.at[0].internalProjectFte,
     '§1 — so it reaches no figure');
}

/* ============ PR13 §2 — the project-manager share, and where it must not go = */
section('PR13 §2 — the share reaches internal_project_fte and nothing else');
{
  const caps = pmShareInvarianceShapes().map((sh) => ({ sh, cap: capture(sh) }));
  const ref = caps[caps.length - 1].cap;   /* the 91-100 band, which 8.A carries */

  for (const { sh, cap } of caps) {
    if (!ok(cap.ok, `${sh.id}: renders`, cap.error)) continue;

    /* Not the PM tile's divisor. Master §2.1's band comes from a study counting
       concurrent projects per PERSON: someone carrying nine projects carries
       nine whether they are at 40% of their week or all of it. Dividing by FTE
       would replace a sourced ratio with one nothing supports. */
    eq(cap.computed.pmLoad, ref.computed.pmLoad, `${sh.id}: PM tile ratio unmoved`);
    eq(cap.computed.ragPM, ref.computed.ragPM, `${sh.id}: PM tile rating unmoved`);
    eq(cap.computed.ceiling.pmLive, ref.computed.ceiling.pmLive, `${sh.id}: PM red threshold unmoved`);

    /* Not the BAU tile either. It divides by BAU capacity and nothing else. */
    eq(cap.computed.at[0].bauEffectiveFte, ref.computed.at[0].bauEffectiveFte,
       `${sh.id}: bau_effective_fte unmoved`);
    eq(cap.computed.at[0].projectsPerFTE, ref.computed.at[0].projectsPerFTE,
       `${sh.id}: BAU tile ratio unmoved`);
    eq(cap.computed.ragFTE, ref.computed.ragFTE, `${sh.id}: BAU tile rating unmoved`);
    eq(cap.computed.ceiling.bauLive, ref.computed.ceiling.bauLive, `${sh.id}: BAU red threshold unmoved`);

    /* Not the growth ceiling. Master §2.6 ties its divisor to the divisor the
       rated tile publishes, and the PM tile stays headcount-based. */
    eq(cap.computed.ceiling.value, ref.computed.ceiling.value, `${sh.id}: growth ceiling unmoved`);
    eq(cap.computed.ceiling.sustainable, ref.computed.ceiling.sustainable,
       `${sh.id}: sustainable annual pace unmoved`);
    eq(cap.computed.ceiling.binding, ref.computed.ceiling.binding, `${sh.id}: binding route unmoved`);

    /* Not the licence basis. It counts people with capacity recorded, and a
       part-time project manager is a person. */
    eq(cap.computed.licenceCount, ref.computed.licenceCount, `${sh.id}: licence basis unmoved`);
    eq(cap.computed.yearly, ref.computed.yearly, `${sh.id}: the quote unmoved`);
    eq(cap.computed.monthly, ref.computed.monthly, `${sh.id}: the monthly quote unmoved`);
    eq(cap.computed.spendPct, ref.computed.spendPct, `${sh.id}: share of reported spend unmoved`);

    /* Nor anything else the brief did not route it to. The IT share is here by
       name because PR13 §2 lists it as inheriting the widened range and it does
       not: it is staff / company headcount and reads no FTE quantity at all. */
    eq(cap.computed.itPercent, ref.computed.itPercent, `${sh.id}: IT share of the company unmoved`);
    eq(cap.computed.typicalDurationMonths, ref.computed.typicalDurationMonths,
       `${sh.id}: typical project duration unmoved`);
    eq(JSON.stringify(cap.computed.ticketFTE), JSON.stringify(ref.computed.ticketFTE),
       `${sh.id}: ticket FTE unmoved`);
    eq(JSON.stringify(cap.computed.runWorkGap), JSON.stringify(ref.computed.runWorkGap),
       `${sh.id}: run-work gap unmoved`);
    eq(cap.computed.at[0].deliveryPerFTE, ref.computed.at[0].deliveryPerFTE,
       `${sh.id}: the contractor companion figure unmoved`);

    /* And no posted Sender field moves. PR13 §5: the field contract is under
       audit and this PR was scheduled on the understanding it would not disturb
       it. Every key is compared, so a field added later is covered without
       anyone remembering to add it here.

       `permalink` is the one exception and it is not a derived field: it is the
       respondent's own answers encoded, so it carries the new one and MUST
       differ, or the link would reopen to a report built on a share nobody
       gave. Named here rather than skipped silently, and asserted to differ
       below. */
    for (const key of Object.keys(ref.sender)) {
      if (key === 'permalink') continue;
      eq(cap.sender[key], ref.sender[key], `${sh.id}: Sender field ${key} unmoved`);
    }
    if (sh.band !== 91) {
      ok(cap.sender.permalink !== ref.sender.permalink,
         `${sh.id}: the saved link carries this answer rather than the reference one`);
    }
    ok(cap.sender.permalink.includes(`pp=${sh.band}`),
       `${sh.id}: and carries it under the pp parameter`, cap.sender.permalink);
  }

  /* The other half, and without it the set above would pass with the input
     wired to nothing. An invariance set that only asserts sameness cannot tell
     a routed input from an ignored one. */
  const lo = caps[0].cap, hi = caps[caps.length - 1].cap;
  if (lo.ok && hi.ok) {
    ok(lo.computed.at[0].internalProjectFte < hi.computed.at[0].internalProjectFte,
       'the bottom band produces less internal project FTE than the top',
       `${lo.computed.at[0].internalProjectFte} vs ${hi.computed.at[0].internalProjectFte}`);
    ok(lo.computed.at[0].internalEffortCost < hi.computed.at[0].internalEffortCost,
       'and less internal effort cost');
    ok(lo.computed.at[0].fullPortfolioCost < hi.computed.at[0].fullPortfolioCost,
       'and a smaller full portfolio cost');
    ok(lo.computed.derivedRunShare[0] > hi.computed.derivedRunShare[0],
       'and a higher derived run share, which is the direction less change effort implies');
    /* Every band produces its own internal FTE. Ten distinct values, so a
       routing that reached only the endpoints would fail here. */
    const seen = new Set(caps.filter((x) => x.cap.ok)
      .map((x) => x.cap.computed.at[0].internalProjectFte));
    eq(seen.size, BANDS.length, 'each of the ten bands produces its own internal project FTE');
  }
}

/* ================================ §3.2 contractors — six routing rules ====== */
section('§3.2 contractors — 8.C must move nothing rated');
{
  const caps = contractorShapes().map((sh) => ({ sh, cap: capture(sh) }));
  const ref = caps[0].cap;
  for (const { sh, cap } of caps) {
    if (!ok(cap.ok, `${sh.id}: renders`, cap.error)) continue;
    /* Rule 1: the BAU tile ratio and the growth ceiling exclude them. */
    eq(cap.computed.at[0].bauEffectiveFte, ref.computed.at[0].bauEffectiveFte, `${sh.id}: bau_effective_fte`);
    eq(cap.computed.at[0].projectsPerFTE, ref.computed.at[0].projectsPerFTE, `${sh.id}: BAU tile ratio`);
    eq(cap.sender.rag_bau, ref.sender.rag_bau, `${sh.id}: BAU tile rating`);
    eq(cap.computed.ceiling.value, ref.computed.ceiling.value, `${sh.id}: growth ceiling`);
    eq(cap.computed.ceiling.bauLive, ref.computed.ceiling.bauLive, `${sh.id}: BAU red threshold`);
    /* Rule 3: the full-cost calculation excludes them. */
    eq(cap.computed.at[0].internalEffortCost, ref.computed.at[0].internalEffortCost,
       `${sh.id}: internal effort cost`);
    eq(cap.computed.at[0].fullPortfolioCost, ref.computed.at[0].fullPortfolioCost,
       `${sh.id}: full portfolio cost`);
    /* Rule 4: the run/change derivation excludes them. */
    eq(JSON.stringify(cap.computed.derivedRunShare), JSON.stringify(ref.computed.derivedRunShare),
       `${sh.id}: derived run share`);
    eq(cap.computed.corroboration, ref.computed.corroboration, `${sh.id}: corroboration`);
    /* Rule 5: the size of IT against the company excludes them. */
    eq(cap.computed.itPercent, ref.computed.itPercent, `${sh.id}: size of IT against the company`);
    /* Rule 6, INVERTED by §4.1 in PR7. The licence basis is the one route
       contractors take. A managed resource is a person with capacity recorded
       in the system, and a contractor on project work has capacity recorded;
       quoting the permanent-only count understates the price in a report whose
       thesis is that the reader is undercounting.

       Asserted as arithmetic rather than as a literal, so the rule is visible:
       the basis is exactly the permanent basis plus the contractors, on every
       count from 0 to 40. */
    eq(cap.computed.licenceCount, ref.computed.licenceCount + sh.contractors,
       `${sh.id}: licence count includes the contractors and nothing else`);
    eq(cap.computed.yearly, cap.computed.licenceCount * 100, `${sh.id}: annual price follows the basis`);
    /* internal_project_fte stays permanent-only. */
    eq(cap.computed.at[0].internalProjectFte, ref.computed.at[0].internalProjectFte,
       `${sh.id}: internal_project_fte is permanent-only`);
  }

  /* Rule 2: the companion figure, shown and unrated, only where there are any. */
  const c6 = caps[1].cap;
  if (c6.ok) {
    const o = evaluate(c6.values);
    eq(round1(o.at[1].deliveryPerFte), 3.2, '8.C: delivery per FTE including contractors, low end');
    eq(round1(o.at[0].deliveryPerFte), 3.7, '8.C: delivery per FTE including contractors, high end');
    ok(has(c6.screen.tileGrid, '3.2–3.7'), '8.C: the companion figure prints as 3.2–3.7');
    ok(has(c6.screen.tileGrid, 'Unrated'), '8.C: the companion figure carries no rating');
    ok(has(c6.print['pr-bandnote'], 'counted separately'), '8.C: the exclusions are stated on the workings page');
    ok(has(c6.print['pr-bandnote'], 'excluded from the live-projects-per-BAU-FTE rating'),
       '8.C: the BAU-tile exclusion is stated');
    ok(has(c6.print['pr-bandnote'], 'growth ceiling'), '8.C: the ceiling exclusion is stated');
    ok(has(c6.print['pr-bandnote'], 'run and change derivation'), '8.C: the run/change exclusion is stated');
    ok(has(c6.print['pr-bandnote'], 'the size of your IT department against the company'),
       '8.C: the staff-share exclusion is stated');
    ok(has(c6.print['pr-bandnote'], 'licence basis'), '8.C: the licence-basis exclusion is stated');
    ok(has(c6.print['pr-bandnote'], 'cost figures'), '8.C: the cost exclusion is stated');
  }
  /* With none, no companion figure and no exclusion note. */
  if (ref.ok) {
    ok(!has(ref.screen.tileGrid, 'Unrated'), '8.A: no companion figure where there are no contractors');
    ok(!has(ref.print['pr-bandnote'], 'counted separately'), '8.A: no contractor note where there are none');
  }
}


/* =========================================== §3.3 loaded cost per head ====== */
section('§3.3 loaded cost — sourced, decomposed, editable, and it travels');
for (const shape of loadedCostShapes()) {
  const cap = capture(shape);
  if (!ok(cap.ok, `${shape.id}: renders`, cap.error)) continue;
  const salary = shape.loadedSalary === null ? 56348 : shape.loadedSalary;
  const want = loadedCost(salary);
  eq(cap.computed.loaded.salary, salary, `${shape.id}: salary`);
  eq(cap.computed.loaded.ni, want.ni, `${shape.id}: employer NI`);
  eq(cap.computed.loaded.overhead, want.overhead, `${shape.id}: overhead`);
  eq(cap.computed.loaded.total, want.total, `${shape.id}: loaded cost per head`);
  /* The decomposition is displayed and stays arithmetically true at whatever
     the respondent typed — salary + NI + overhead is the total on the page. */
  const parts = cap.screen.loadedSalaryParts;
  const money = (x) => `£${Math.round(x).toLocaleString('en-GB')}`;
  ok(has(parts, money(salary)), `${shape.id}: the salary is shown`, parts);
  ok(has(parts, money(want.ni)), `${shape.id}: employer NI is shown`);
  ok(has(parts, money(want.overhead)), `${shape.id}: overhead is shown`);
  ok(has(parts, money(want.total)), `${shape.id}: the total is shown`);
  ok(has(parts, '15% above the £5,000 secondary threshold for 2026/27'),
     `${shape.id}: the NI rate is labelled as sourced`);
  ok(has(parts, 'ProjexaR’s judgement'), `${shape.id}: the 25% overhead is labelled as our judgement`);
  /* It reaches the printed report and the shared link. */
  ok(has(cap.print['pr-inputs'], money(salary)), `${shape.id}: the figure reaches the printed report`);
  ok(has(cap.print['pr-formulas'], money(want.total)), `${shape.id}: the loaded cost reaches the workings`);
  ok(has(cap.permalink, `lc=${salary}`), `${shape.id}: the figure reaches the shared link`, cap.permalink);
  /* And the page says which value the figures use. */
  ok(has(cap.print['pr-inputs'], salary === 56348 ? 'the sourced default' : 'your figure'),
     `${shape.id}: the report states which value it used`);
}
{
  /* The sourced default, its grouping and its release year are on the page. */
  const cap = capture({ id: 'ashe-default', ...FIXTURE_A, loadedSalary: null });
  if (cap.ok) {
    const t = allText(cap);
    ok(has(t, 'ONS ASHE 2025'), 'the ASHE release year is stated', '');
    ok(has(t, 'SOC 2020 group 213, Information Technology Professionals'),
       'the exact ASHE grouping is stated');
    ok(has(cap.print['pr-sources'], 'Open Government Licence v3.0'),
       'the Open Government Licence attribution is carried');
    ok(has(cap.print['pr-sources'], 'gov.uk, rates and thresholds for employers 2026 to 2027'),
       'the NI source names the tax year');
    ok(has(cap.print['pr-sources'], 'Table 14.7a'), 'the ASHE table is named');
  }
  /* An edited figure must not leave the sourced default anywhere in the output,
     or a forwarded report shows two different numbers. */
  const edited = capture({ id: 'ashe-edited', ...FIXTURE_A, loadedSalary: 40000 });
  if (edited.ok) {
    ok(!/£56,348 a head/.test(allText(edited)), 'an edited salary does not leave the default in a cost figure');
    ok(has(allText(edited), '£40,000'), 'the edited salary is the one shown');
  }
}

/* ========================================== §3.1 the summing branch ========= */
section('§3.1 — only an explicit out-the-door answer sums');
for (const shape of budgetShapes()) {
  const cap = capture(shape);
  if (!ok(cap.ok, `${shape.id}: renders`, cap.error)) continue;
  eq(cap.computed.sums, shape.sums, `${shape.id}: summing path`);
  if (shape.sums) {
    eq(cap.computed.at[0].fullPortfolioCost,
       Math.round(cap.computed.at[0].internalEffortCost) + cap.values.spend,
       `${shape.id}: full cost is the displayed internal figure plus reported spend`);
    eq(cap.hero.costOrder, '0', `${shape.id}: full cost is the hero`);
    ok(has(cap.screen.costEyebrow, 'The full cost of your portfolio'), `${shape.id}: hero label`);
  } else {
    eq(cap.computed.at[0].fullPortfolioCost, null, `${shape.id}: nothing is summed`);
    eq(cap.hero.ceilingOrder, '0', `${shape.id}: the growth ceiling stays hero`);
    ok(!has(renderedText(cap), 'full cost of your portfolio'), `${shape.id}: no full-cost claim`);
    /* The heading lives in the markup, so the render either hides the tile or
       overwrites it. Both are answers; a third state is not. */
    ok(cap.hero.costHidden || !has(cap.screen.costEyebrow, 'full cost of your portfolio'),
       `${shape.id}: the tile carrying that heading is hidden or relabelled`, cap.screen.costEyebrow);
    ok(has(cap.print['pr-formulas'], 'Not summed'), `${shape.id}: the workings say it was not summed`);
  }
  /* Finding 4 tracks the same input and never reaches At risk. */
  const findings = cap.print['pr-cards'].match(/<span class="p-rag">([^<]+)<\/span>/g)
    .map((m) => m.replace(/<[^>]*>/g, ''));
  eq(findings.length, 4, `${shape.id}: exactly four findings`);
  eq(findings[3], finding4State(cap.values), `${shape.id}: finding 4 state`);
  ok(findings[3] !== 'At risk', `${shape.id}: finding 4 never reaches At risk`);
}

/* ======================================= §3.8 four findings, every answer === */
section('§3.8 — exactly four findings, each Healthy-capable, states from the oracle');
{
  let healthyReports = 0, checked = 0;
  for (const toolset of TOOLSETS)
    for (const resourceVisibility of VISIBILITY)
      for (const budgetTracking of BUDGETS)
        for (const assignmentKnowledge of ASSIGNMENT) {
          const cap = capture({ id: 'f', ...FIXTURE_B,
            toolset, resourceVisibility, budgetTracking, assignmentKnowledge });
          if (!cap.ok) continue;
          checked++;
          const findings = cap.print['pr-cards'].match(/<span class="p-rag">([^<]+)<\/span>/g)
            .map((m) => m.replace(/<[^>]*>/g, ''));
          if (findings.length !== 4) {
            fail++; failures.push(`findings: ${toolset}/${resourceVisibility}/${budgetTracking}/`
              + `${assignmentKnowledge} produced ${findings.length}, not 4`);
            continue;
          } else pass++;
          const v = cap.values;
          const want = ['Healthy', finding2State(v).state, finding3State(v), finding4State(v)];
          for (let i = 0; i < 4; i++) {
            if (findings[i] !== want[i]) {
              fail++; failures.push(`finding ${i + 1}: ${toolset}/${resourceVisibility}/${budgetTracking}/`
                + `${assignmentKnowledge} — oracle ${want[i]}, tool ${findings[i]}`);
            } else pass++;
          }
          if (findings.every((f) => f === 'Healthy')) healthyReports++;
        }
  console.log(`  process combinations checked ... ${checked}`);
  console.log(`  all-four-Healthy combinations .. ${healthyReports}`);
  ok(healthyReports > 0, 'at least one combination returns four Healthy findings');
  /* §0.18. This is a cross product, so its size is produced by code and written
     down nowhere: seven toolsets by three visibilities by four budgets by three
     assignment answers. A new required input takes every one of them to
     validation failure and the loop then asserts nothing while the run still
     reads green, which is exactly what PR13 did to the fuzz pass. The
     all-Healthy floor above catches the set emptying completely and nothing
     else; this catches it shrinking. */
  eq(checked, TOOLSETS.length * VISIBILITY.length * BUDGETS.length * ASSIGNMENT.length,
     '§0.18 — every process combination rendered, none silently skipped');
}
{
  /* Each finding must be reachable at Healthy from data the report publishes,
     and no two may imply the same action — the test that produced the merge. */
  const capH = capture({ id: 'all-healthy', ...FIXTURE_B });
  if (capH.ok) {
    const titles = capH.print['pr-cards'].match(/<strong>([^<]+)<\/strong>/g)
      .map((m) => m.replace(/<[^>]*>/g, ''));
    eq(new Set(titles).size, 4, 'four findings, four distinct titles');
  }
}

/* ====================================== §3.8 the checks block =============== */
section('§3.8 — the checks block carries corroboration and run-work composition');
for (const shape of corroborationShapes()) {
  const cap = capture(shape);
  if (!ok(cap.ok, `${shape.id}: renders`, cap.error)) continue;
  const o = evaluate(cap.values);
  const expected = shape.expect === 'Healthy' ? 'healthy' : shape.expect === 'Watch' ? 'watch' : 'note';
  eq(cap.computed.corroboration, expected, `${shape.id}: ${shape.expect}`);
  eq(o.corroboration, shape.expect, `${shape.id}: oracle agrees`);
  /* It has left the findings list and lives in the checks block. */
  ok(!has(cap.screen.ragList, 'about the same department'),
     `${shape.id}: corroboration is not in the findings list`);
  ok(has(cap.screen.checkList, 'run work'), `${shape.id}: the checks block renders`);
  /* §5, as PR6 §3 relocated it. Both qualifications are still made, in full,
     and neither may go missing: what changed is where. Removing either leaves
     the statement in the checks block true, so both sit on the workings page
     and the check itself says they exist. Asserted in the new home AND absent
     from the old one, so a later edit cannot quietly restore the inline essay
     or drop the qualification on its way out. */
  if (cap.computed.runWorkGap !== null) {
    const wk = cap.print['pr-derivations'];
    ok(has(wk, 'different kinds of estimate'),
       `${shape.id}: the workings name the two kinds of uncertainty`);
    ok(has(wk, 'carries our judgement rather than yours'),
       `${shape.id}: and say which side of it is ours`);
    ok(has(wk, 'both sides are counts of full-time equivalents'),
       `${shape.id}: and that the subtraction holds anyway`);
    /* PR7 §3.5. It used to say "the workings page sets both out". The workings
       page is pr-derivations, inside #printReport, so on screen the pointer
       pointed at nothing. It points at the full report now, and the count is
       computed rather than fixed — the second qualification only renders where
       a ticket proportion was published. */
    const qualCount = cap.computed.ticketFtePercent !== null ? 2 : 1;
    ok(has(cap.screen.checkList, qualCount === 2
             ? 'Two things qualify the comparison, and the full report sets both out.'
             : 'One thing qualifies the comparison, and the full report sets it out.'),
       `${shape.id}: the check names how many qualifications exist, and points somewhere reachable`);
    ok(!has(cap.screen.checkList, 'the workings page sets'),
       `${shape.id}: and no longer points at a page a screen reader does not have`);
    ok(!has(cap.screen.checkList, 'not the same kind of estimate'),
       `${shape.id}: the qualification is not also made inline`);
    if (cap.computed.ticketFtePercent !== null) {
      ok(has(wk, 'quoted against different populations'),
         `${shape.id}: the two denominators are made explicit in the workings`);
      ok(!has(cap.screen.checkList, 'different populations'),
         `${shape.id}: and not beside the sentence they read as contradicting`);
      /* PR6 §5.2. It pointed forward: Your numbers renders after the checks on
         screen and on a different page in print, so "above" was never true. */
      ok(!/ticket percentage above/.test(allText(cap)),
         `${shape.id}: nothing points at the ticket percentage by position`);
    }
  }
  /* §3 and the branch swap. Below the window is the note: we derive less change
     effort than they reported, which is what delivery staff with no BAU role
     would produce, and which this check cannot see. Above it is the Watch: we
     derive more, and the assumption most likely to have caused that is named
     first. Each branch must describe the direction it actually found. */
  if (shape.expect === 'note') {
    ok(cap.values.bauSplitEstimate < cap.computed.corroborationLo,
       `${shape.id}: the note branch is the one below the window`);
    /* PR7 item 6. This used to assert the pill word '>Note<'. Both unrated
       states — the run-work observation and this one — lost their pills, for
       the same reason: a word in the pill position reads as a point on the
       scale. The state is asserted structurally now. */
    ok(has(cap.screen.checkList, 'is-observation'),
       `${shape.id}: rendered as an observation, not a rating`);
    ok(!has(cap.screen.checkList, '>Note<'), `${shape.id}: and carries no severity word`);
    ok(has(cap.screen.checkList, 'derive less change effort'),
       `${shape.id}: says we derive less, which is what the figures show`);
    ok(has(cap.screen.checkList, 'what we would expect'), `${shape.id}: says why the gap is expected`);
    ok(has(cap.screen.checkList, 'without also holding a BAU role'),
       `${shape.id}: names the staff this check cannot see`);
  }
  if (shape.expect === 'Watch') {
    ok(cap.values.bauSplitEstimate > cap.computed.corroborationHi,
       `${shape.id}: the Watch branch is the one above the window`);
    ok(has(cap.screen.checkList, 'derive more change effort'),
       `${shape.id}: says we derive more, which is what the figures show`);
    /* PR13. The two branches no longer name the same thing.

       This branch used to open on the assumption that produced the gap — every
       project manager counted as a full-time equivalent of change work — and
       then offer the BAU answer as the thing to revisit. The share is asked now
       rather than assumed, so there is no assumption left to name, and what the
       derivation reads is two time bands. With project managers, both are named
       and neither is "the BAU headcount"; with none, the BAU answer is the only
       one left and the old sentence still stands. */
    if (cap.values.pms > 0) {
      const body = cap.screen.checkList.replace(/<[^>]*>/g, ' ');
      ok(has(body, 'The two answers worth revisiting are the time bands'),
         `${shape.id}: the Watch branch points at the two bands it derives from`);
      ok(has(body, 'time on project management') && has(body, 'share of your BAU staff'),
         `${shape.id}: and names both of them`);
      ok(!/full-time equivalent of change work/.test(body),
         `${shape.id}: the retired assumption is not still claimed`);
      ok(!/also carry run work|also carries run work/.test(body),
         `${shape.id}: nor the explanation that rested on it`);
    } else {
      ok(has(cap.screen.checkList, 'BAU headcount and time band'),
         `${shape.id}: with no PMs the BAU answer is the one to revisit`);
      ok(!/also carry run work|also carries run work/.test(cap.screen.checkList),
         `${shape.id}: with no PMs the PM explanation is not offered`);
      ok(has(cap.screen.checkList, 'no project managers'), `${shape.id}: says so instead`);
    }
  }
  /* Run-work composition is stated and carries no rating.

     PR7 item 6. It used to carry a pill reading "Stated", which is how this was
     asserted — '>Stated<'. The pill is gone: in the same shape and position as
     Healthy, Watch and At risk it read as a fourth severity, and an independent
     reader reported it that way. What replaces the assertion is stronger. The
     block must be present, must be marked as an observation, and must carry NO
     pill at all, because the failure mode is a fourth badge word appearing
     where the old one was. */
  ok(has(cap.screen.checkList, 'is-observation'),
     `${shape.id}: run-work composition is set apart as an observation`);
  ok(!has(cap.screen.checkList, '>Stated<'), `${shape.id}: and carries no severity word`);
  ok(has(cap.screen.checkList, 'composition, not a deficiency'),
     `${shape.id}: framed as composition rather than deficiency`);
  ok(has(cap.screen.checkList, 'not ticket-shaped'), `${shape.id}: gives the second reading`);
  ok(has(cap.screen.checkList, 'same population your projects draw from'),
     `${shape.id}: closes on what matters`);
  /* Two entries in the block, one rated and one not, and four findings beside
     it. The rated one is the only pill, so a fourth badge word cannot creep
     back in without failing here. */
  const chips = (cap.screen.checkList.match(/<span class="pill [^"]*">([^<]+)<\/span>/g) || [])
    .map((m) => m.replace(/<[^>]*>/g, ''));
  /* At most one pill: the corroboration check when it carries a state. On the
     branch below the window it carries none, so both entries are observations
     and there is no pill at all. What must never happen is a pill on an
     unrated entry, which is what the count below enforces together with the
     status-word check. */
  ok(chips.length <= 1, `${shape.id}: no unrated check carries a pill`, chips.join(','));
  const items = cap.screen.checkList.match(/<div class="check-item/g) || [];
  eq(items.length, 2, `${shape.id}: two checks`);
  const STATUS = ['Healthy', 'Watch', 'At risk'];
  ok(chips.every((w) => STATUS.includes(w)),
     `${shape.id}: and the only badge words are master §3.8's three`, chips.join(','));
  const findings = cap.print['pr-cards'].match(/<span class="p-rag">([^<]+)<\/span>/g);
  eq(findings.length, 4, `${shape.id}: still exactly four findings`);
}

/* ================================ §3 the corroboration assumption =========== */
section('§3 — the derivation states what it reads, on every branch');
for (const shape of corroborationShapes()) {
  const cap = capture(shape);
  if (!ok(cap.ok, `${shape.id}: renders`, cap.error)) continue;
  /* PR13 retired the assumption this row used to state. The rule it was
     serving stands: the derivation says what it rests on beside the arithmetic,
     on every branch and not only where it flags. What it rests on is now the
     two answers the respondent gave. */
  ok(has(cap.print['pr-formulas'],
        cap.values.pms > 0 ? 'on the two time bands you gave us' : 'on the time band you gave us'),
     `${shape.id}: the derivation names its inputs beside the arithmetic, on every branch`);
  ok(!has(cap.print['pr-formulas'], 'full-time equivalent of change work'),
     `${shape.id}: and no longer claims an assumption the tool has stopped making`);
}

/* ================================================ §1.1 suppression rows ===== */
section('§1.1 suppression — one shape per row, full cost included');
for (const shape of suppressionShapes()) {
  const cap = capture(shape);
  /* One row is unreachable through the form: the blended band is a required
     question, so a blank one is rejected at validation rather than rendering a
     suppressed report. That is the right behaviour — the alternative is a
     report built on an answer nobody gave — and the row's own state is
     asserted against compute() directly below. */
  if (shape.rejects) {
    ok(!cap.valid, `${shape.id}: rejected at validation, not rendered`, cap.error);
    const tool = loadTool();
    const o = tool.api.compute({ ...FIXTURE_A, bandLo: null, bandHi: null,
      bauPercent2: '', pmBandLo: 91, pmBandHi: 100,
      loadedSalary: FIXTURE_SALARY, spend: FIXTURE_A.spend });
    eq(o.at[0].bauEffectiveFte, null, `${shape.id}: bau_effective_fte suppressed`);
    /* §1.1 used to say this row falls back to pm_count. PR13 asks what share of
       a project manager's time goes to project management, so the fallback is
       the project managers' own effective FTE at each endpoint — 5 managers on
       the 91-100% band, not 5 managers. The master is corrected in the same
       commit. */
    eq(o.at[0].internalProjectFte, 4.6, `${shape.id}: internal_project_fte falls back to the PM capacity, lo`);
    eq(o.at[1].internalProjectFte, 5, `${shape.id}: internal_project_fte falls back to the PM capacity, hi`);
    eq(o.at[0].ragFTE, null, `${shape.id}: BAU tile suppressed`);
    eq(o.ceiling.bauLive, null, `${shape.id}: BAU route suppressed`);
    eq(o.corroboration, null, `${shape.id}: corroboration suppressed`);
    eq(o.at[0].internalEffortCost, null, `${shape.id}: the full-cost calculation is suppressed`);
    continue;
  }
  if (!ok(cap.ok, `${shape.id}: renders`, cap.error)) continue;
  const text = allText(cap);
  ok(!badNumbers(text), `${shape.id} (${shape.row}): no NaN/Infinity/undefined`);
  if (shape.id === 'suppress-pms-0') {
    ok(has(cap.print['pr-bandnote'], 'No project managers were reported'), `${shape.id}: explained`);
    ok(!has(cap.screen.tileGrid, 'Concurrent projects per PM'), `${shape.id}: PM tile suppressed`);
  }
  if (shape.id === 'suppress-bau-0' || shape.id === 'suppress-fullcost') {
    ok(!has(cap.screen.tileGrid, 'Live projects per effective BAU FTE'), `${shape.id}: BAU tile suppressed`);
    eq(cap.computed.at[0].internalEffortCost, null, `${shape.id}: full cost suppressed with the BAU tile`);
    eq(cap.hero.costHidden, true, `${shape.id}: the cost tile does not render`);
    eq(cap.hero.costExclusionsHidden, true,
       `${shape.id}: nor the paragraph about what those figures exclude`);
    ok(has(cap.print['pr-formulas'], 'Not computed'), `${shape.id}: workings say not computed`);
    ok(has(cap.print['pr-formulas'], 'needs BAU staff on project work and a time band to cost'),
       `${shape.id}: the workings say why the cost was not computed`);
  }
  if (shape.id === 'suppress-live-0') eq(cap.sender.headroom, '', `${shape.id}: headroom blank`);
  /* §4.1. Nothing live and nothing annual is the one way a respondent reaches
     the duration suppression, since validation holds annual >= live. */
  if (shape.id === 'suppress-live-0' || shape.id === 'suppress-annual-0') {
    eq(cap.computed.typicalDurationMonths, null, `${shape.id}: typical project duration suppressed`);
    ok(has(cap.screen.factList, 'Not computed'), `${shape.id}: the numbers section says not computed`);
    ok(has(cap.print['pr-derivations'], 'was not computed'),
       `${shape.id}: the workings page says the duration was not computed`);
    ok(has(cap.print['pr-derivations'], 'nothing is live'),
       `${shape.id}: and says why`, cap.print['pr-derivations']);
    ok(!has(cap.print['pr-formulas'], 'Typical project duration'),
       `${shape.id}: no duration row on the workings table`);
  }
  if (shape.id === 'suppress-both-routes') {
    ok(has(cap.screen.ceilingFigure, 'Not enough capacity information'), `${shape.id}: no ceiling, explained`);
    eq(cap.sender.headroom, '', `${shape.id}: headroom blank`);
  }
}

/* ================================= §4.2 IT share — divide by zero ========== */
section('§1.1 — the IT-share row, asserted against compute() directly');
{
  /* Total company headcount and total IT staff are both required questions with
     a minimum of 1, so the form cannot reach zero on either. That is the same
     situation as the blank band above and it is asserted the same way: against
     compute() rather than through a render that no respondent can produce.

     The guard changes no reachable output. It is here because the formula
     divides by a respondent-supplied figure, and §1.1's rule is about the
     formula rather than about which inputs are reachable in today's validation. */
  const tool = loadTool();
  const base = { ...FIXTURE_A, bandLo: 31, bandHi: 40, loadedSalary: FIXTURE_SALARY };
  const CASES = [
    [0, 45, 'you reported no company headcount'],
    [1200, 0, 'you reported no IT staff'],
    [0, 0, 'you reported neither a company headcount nor any IT staff'],
  ];
  for (const [companyHeadcount, staff, why] of CASES) {
    const v = { ...base, companyHeadcount, staff };
    const c = tool.api.compute(v);
    const label = `it-share at headcount ${companyHeadcount}, staff ${staff}`;
    eq(c.itPercent, null, `${label}: suppressed`);
    eq(c.itPercent, itShare(v), `${label}: agrees with the oracle`);
    const row = tool.api.facts(v, c)
      .find((f) => f.label === 'The size of your IT department, against the company');
    if (ok(!!row, `${label}: the numbers section still carries the row`)) {
      eq(row.figure, 'Not computed', `${label}: shown as not computed, never 0.0 or blank`);
      ok(has(row.note, why), `${label}: and says why`, row.note);
      ok(!badNumbers(row.figure + row.note), `${label}: no NaN in the row`);
    }
  }
  /* And the reachable case is unaffected. */
  const okv = { ...base };
  eq(round1(tool.api.compute(okv).itPercent), 3.8, 'it-share at the fixture inputs is unchanged');
}

/* ============================ the Flexera figure — shown, never subtracted == */
section('Flexera — both figures published, the difference never');
{
  /* Provenance is not commensurability. The 67/33 is correctly classified,
     correctly attributed and correctly sourced, and subtracting it from the
     respondent's answer was still wrong: the chart is a split of IT BUDGET
     ("Percentage of budget allocated to running the business vs. growth",
     page 25) and the question the tool asks is a split of people's TIME.
     A caveat stated elsewhere does not repair a subtraction made inline.

     The citation names the page and the chart title, which is what was read in
     the PDF. It does not name a figure number: the captions are images, so any
     figure number would be derived, and a derived number printed as a read one
     is what the Jitbit 480 was. */
  for (const [name, split] of [['below', 50], ['level', 67], ['above', 72], ['far above', 90]]) {
    const cap = capture({ id: `flexera-${split}`, ...FIXTURE_A, bauSplitEstimate: split });
    if (!ok(cap.ok, `flexera ${name}: renders`, cap.error)) continue;
    const t = allText(cap);

    /* The gap is never computed, so it can never be published. */
    eq(cap.computed.splitDiff, undefined, `flexera ${name}: no splitDiff on the compute object`);
    eq(cap.computed.splitLean, undefined, `flexera ${name}: no splitLean on the compute object`);
    ok(!/percentage points more/i.test(t), `flexera ${name}: no difference in percentage points is published`);
    ok(!/BAU-heavy|transformation-heavy/i.test(t), `flexera ${name}: no lean is asserted`);
    const diff = Math.abs(split - 67);
    if (diff > 0) {
      ok(!new RegExp(`(^|[^\\d.])${diff} percentage point`).test(t),
         `flexera ${name}: the ${diff}-point gap does not appear`);
    }

    /* Both figures are published, side by side. */
    ok(has(t, `${split}% of your department’s time on run work`),
       `flexera ${name}: the respondent's own figure is stated as a share of time`);
    ok(has(t, '67%/33% run-versus-grow split'), `flexera ${name}: Flexera's figure is stated whole`);
    /* In the unit the source uses, with the population it covers. */
    ok(has(t, 'split of IT budget rather than of people’s time'),
       `flexera ${name}: the unit mismatch is stated where the figure is shown`);
    ok(has(t, '506 organisations, all above 2,000 employees'),
       `flexera ${name}: the population is stated where the figure is shown`);
    /* PR6 §1.4 cut the sentence that explained our process beside the figure.
       The reason no gap is published is made once, on the workings page, and
       every guard against actually publishing one is above. */
    ok(has(cap.print['pr-flexeranote'], 'so we do not publish one'),
       `flexera ${name}: the workings say why no gap is published`);
    ok(!has(t, 'we do not subtract one from the other'),
       `flexera ${name}: and the inline note no longer explains our process`);
    ok(!has(t, 'We show it because it is the closest published figure'),
       `flexera ${name}: nor why we show it`);
    /* The citation quotes the unit the source publishes. */
    /* Read from the flattened text: the row emphasises "budget", so the raw
       HTML carries a tag in the middle of the sentence. */
    /* Matched tag-free: the row emphasises "budget", so the flattened text
       carries a space where the tag was. */
    ok(has(t, 'Published as a share of IT'), `flexera ${name}: the source row names the unit`);
    ok(has(t, 'and used here only as a budget figure'),
       `flexera ${name}: and says the tool holds it to that unit`);
    /* Cite what was read. The page and the chart title are in the PDF's text
       layer; the figure number is not, so it is not printed. */
    ok(has(cap.print['pr-sources'], 'page 25'), `flexera ${name}: the source row cites the page`);
    ok(has(t, 'Percentage of budget allocated to running the business vs. growth'),
       `flexera ${name}: and the chart title as published`);
    ok(!/Figure 17|Fig\. 17/i.test(t), `flexera ${name}: no derived figure number is cited`);
    ok(has(cap.print['pr-sources'], 'nearly half above 10,000'),
       `flexera ${name}: and the population it is drawn from`);
    ok(has(cap.print['pr-flexeranote'], 'arithmetic across two different quantities'),
       `flexera ${name}: the workings page gives the reason`);
    ok(copyRuleViolations(allText(cap, { forCopyRule: true })).length === 0,
       `flexera ${name}: copy rule`);
  }
}

/* ======================================== our hedges cut, theirs quoted ===== */
section('Hedging — ours is cut, the source’s is quoted');
{
  const cap = capture({ id: 'hedge', ...FIXTURE_A });
  const t = allText(cap);
  /* The respondent gave 75 exactly. "In a typical year" already carries
     whatever softness the question had; the word double-hedged a figure that is
     not uncertain to us. */
  ok(!/and around \d/.test(t), 'the verdict does not hedge the respondent’s own annual figure');
  ok(has(t, `and ${FIXTURE_A.annual} in a typical year`), 'it states the figure they gave');
  /* Jitbit's imprecision is Jitbit's. Cutting it would state their figure more
     precisely than they do — the test is whose uncertainty it is. */
  ok(has(t, 'across around 1,000 companies'), 'the source’s own imprecision is quoted as published');
}

/* ==================================== the static printed copy is captured === */
section('Static printed copy — the eighteen numbers are inside the suite');
{
  /* Until PR3 no capture reached the copy written straight into the printed
     report's markup. Eighteen published numbers sat outside the suite: edit one
     and nothing caught it. They are in allText() now, so they are in the digest
     and in the diff — and pinned here as well, so a change fails with a reason
     rather than only a changed hash. */
  /* PR7 §3.1. Fifteen of the eighteen live in the bands statement, which is no
     longer static markup — it renders into the web report and the printed
     report from one string so the two cannot drift. The numbers are unchanged
     and still published; this reads them from where they now are. Keeping the
     count at eighteen is the point: it is what fails if a citation figure is
     quietly dropped in the move. */
  const staticNums = numbersIn(
    (staticReportText() + loadTool().api.bandsStatement(''))
      .replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' '));
  const WANT = {
    '9649': 'Colicev: project-month-employee observations',
    '42': 'Colicev: projects', '580': 'Colicev: employees',
    '5.16': 'Colicev: point estimate, concurrent projects',
    '3.57': 'Colicev: confidence interval, lower', '6.19': 'Colicev: confidence interval, upper',
    '44': 'Colicev: volume', '2': 'Colicev: issue', '610': 'Colicev: first page',
    '636': 'Colicev: last page', '2023': 'Colicev: year', '10.1002': 'Colicev: DOI prefix',
    '3443': 'Colicev: DOI suffix', '4.0': 'CC BY licence version',
    '7.0': 'ProjexaR control: the PM red threshold, named in the bands statement',
    '170': 'ProjexaR control: ticket window, lower', '320': 'ProjexaR control: ticket window, upper',
    '25': 'ProjexaR control: overhead uplift, per cent',
    /* PR12 §4. The nineteenth, and the first that is neither a citation figure
       nor a control: the offer's own duration, in the ProjexaR section's offer
       statement. It is accounted for here rather than exempted, because the
       point of this table is that nothing reaches the printed page unnamed. */
    '14': 'The offer: days of unlimited access before the free tier begins',
  };
  eq(staticNums.length, 19, 'the static printed copy publishes nineteen numbers');
  eq([...new Set(staticNums)].sort().join(','), Object.keys(WANT).sort().join(','),
     'and they are exactly the nineteen accounted for in the provenance table');
  /* The capture genuinely carries them: a number only in the static layer must
     reach allText(), or none of the above is worth anything. */
  const captured = new Set(numbersIn(allText(capture({ id: 'static', ...FIXTURE_A }))));
  for (const [num, what] of Object.entries(WANT)) {
    ok(captured.has(num), `static: ${num} (${what}) reaches the captured multiset`);
  }
}

/* ================================= §4.1 typical project duration =========== */
section('§4.1 — typical project duration replaces the turnover multiple');
{
  /* The multiple is gone from display, the duration is in its place at three
     sites, and the derivation is stated beside the figure. Turnover itself is
     retained: the growth ceiling still projects a live-project threshold forward
     at that pace, and the fixtures' ceilings above are what prove it. */
  for (const [name, shape, months] of [['8.A', FIXTURE_A, '7.2'], ['8.B', FIXTURE_B, '8.0'],
                                       ['8.C', FIXTURE_C, '7.2']]) {
    const cap = capture({ id: `duration-${name}`, ...shape });
    if (!ok(cap.ok, `${name}: renders`, cap.error)) continue;
    const t = allText(cap);
    ok(has(cap.screen.factList, `${months} months`),
       `${name}: the numbers section prints ${months} months`);
    ok(has(cap.print['pr-facts'], `${months} months`), `${name}: and so does the PDF`);
    ok(has(cap.print['pr-formulas'], `(${shape.live} ÷ ${shape.annual}) × 12`),
       `${name}: the workings show the arithmetic`, cap.print['pr-formulas']);

    /* The naming caution. The label reads as a measured fact about projects and
       the number is not one, so the derivation is stated in both places. */
    ok(has(cap.screen.factList, 'Derived from that ratio rather than measured'),
       `${name}: the derivation is stated beside the figure, in short form`);
    ok(has(cap.print['pr-derivations'], 'derived, not measured'),
       `${name}: the workings page carries the naming caution`);
    ok(has(cap.print['pr-derivations'], 'steady state'),
       `${name}: and says what the steady-state assumption is`);
    ok(has(cap.print['pr-derivations'], 'ramp-up'),
       `${name}: and who gets a figure about throughput rather than projects`);

    /* Nothing displays the multiple any more. */
    ok(!/turnover/i.test(t), `${name}: the turnover multiple is not displayed anywhere`);
    ok(!/\d\.\d×/.test(t), `${name}: no bare multiple survives in output`);
    /* But it is still computed, because the ceiling needs it. */
    ok(cap.computed.turnover !== null, `${name}: turnover is retained internally`);
  }
  /* The tool's own worked example used to print 1.7× here. */
  const capT = capture({ id: 'duration-nomultiple', ...FIXTURE_A });
  ok(!/1\.7×/.test(allText(capT)), '8.A: the 1.7× multiple is gone from output');
}

/* ============================================ legacy URL band decoding ====== */
section('§3.5 — a legacy free-text percentage decodes to a band');
for (const [raw, want] of LEGACY_BAND_CASES) {
  eq(bandContaining(raw), want, `oracle: legacy p="${raw}" maps to ${want}`);
}
{
  const tool = loadTool();
  for (const [raw, want] of LEGACY_BAND_CASES) {
    eq(tool.api.bandContaining(raw), want, `tool: legacy p="${raw}" maps to ${want}`);
  }
  /* And a legacy link renders rather than erroring. 37 was the worked example's
     free-text answer and lands in 31–40, which is fixture 8.A's band. */
  const legacy = capture({ id: 'legacy', ...FIXTURE_A, bauPercent2: '' });
  ok(legacy.error === null || !legacy.valid, 'a missing band is a validation failure, not a crash');
  const mapped = capture({ id: 'legacy-mapped', ...FIXTURE_A, bauPercent2: bandContaining('37') });
  ok(mapped.ok, 'a legacy percentage mapped to its band renders');
  if (mapped.ok) eq(round1(mapped.computed.at[0].bauEffectiveFte), 6.2, 'legacy 37% renders the 31–40 band');
}

/* ============================================= §3.6 ticket divisor ========== */
section('§3.6 — the ticket divisor is a range, with both anchors named');
{
  const cap = capture({ id: 'tickets', ...FIXTURE_A });
  if (cap.ok) {
    const t = allText(cap);
    ok(!/÷ 480/.test(t), 'the single 480 divisor is gone');
    ok(has(t, '960 ÷ 320 to 960 ÷ 170'), 'the workings show both divisors');
    ok(has(cap.print['pr-sources'], 'HDI/MetricNet'), 'the lower anchor is cited');
    ok(has(cap.print['pr-sources'], '87 to 133'), 'the lower anchor figures are cited');
    ok(has(cap.print['pr-sources'], '30 to 198'), 'the full published range is cited');
    ok(has(cap.print['pr-sources'], 'Jitbit'), 'the upper anchor is cited');
    ok(has(cap.print['pr-sources'], 'ProjexaR’s control'), 'the window is named as ProjexaR’s control');
    ok(has(cap.print['pr-sources'], 'Neither is a published figure'), 'and explicitly not a published figure');

    /* The two anchors are published in different units, so the conversion needs
       a working-days figure and the page has to state it. A conversion made
       silently replaces an unattributed number with an unexplained one. */
    const perDayLo = round1(TICKETS_LO / WORKING_DAYS);
    const perDayHi = round1(TICKETS_HI / WORKING_DAYS);
    ok(has(t, `${WORKING_DAYS}-working-day month`),
       'the working-days basis for the conversion is stated');
    ok(has(t, `${perDayLo.toFixed(1)} to ${perDayHi.toFixed(1)} per technician per day`),
       'the control is stated in days as well as months', cap.print['pr-sources']);
    ok(has(cap.print['pr-formulas'], `${perDayLo.toFixed(1)} to ${perDayHi.toFixed(1)} a day`),
       'the workings page carries the daily figure too, not just the sources page');
    ok(has(t, `${JITBIT_PER_DAY} tickets per technician per day`),
       'Jitbit is quoted in the unit it publishes');
    ok(has(t, `${HDI_LO} to ${HDI_HI}`), 'HDI/MetricNet is quoted in the unit it publishes');
    /* A reader must be able to check the window against both anchors in one
       step, in the unit each is published in. */
    ok(perDayHi < JITBIT_PER_DAY,
       'the control sits below Jitbit’s daily figure, checkable in days');
    ok(TICKETS_LO > HDI_HI,
       'the control sits above HDI/MetricNet’s monthly figures, checkable in months');
    /* No stateable working-days figure produces 480, so it is not quoted. */
    ok(!/\b480\b/.test(t), 'the unattributed 480 is not quoted anywhere in output');
    /* An assumption that reaches no computation must not claim to be
       conservative, in either direction. It cannot be either.

       §2.5. Scoped to the ticket-divisor block rather than to all output. The
       word has a legitimate true use elsewhere — the §2.11 red threshold of 7.0
       sits above the top of the confidence interval deliberately, and someone
       may reasonably want to say so — and a check that fails on true copy is a
       check that gets switched off, which is the same reasoning that took
       `about` and `around` off the copy-rule list. So the scan is the rows that
       carry the divisor claim, not the report.

       Scoped structurally rather than by sentence. The captured nodes are
       concatenated without terminal punctuation, so splitting the flattened
       prose on sentence boundaries drags in whatever was rendered next and
       scopes to nothing in particular. Rows are what the page actually has. */
    const divisorRows = [cap.screen.factList, cap.print['pr-facts'],
                         cap.print['pr-formulas'], cap.print['pr-sources']]
      .flatMap((html) => String(html).split(/<\/(?:tr|li)>/i))
      .map((row) => row.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
      .filter((row) => /working[- ]day|tickets per agent|divisor/i.test(row));
    ok(divisorRows.length >= 4,
       'the divisor rows are reachable for scanning', `found ${divisorRows.length}`);
    const claimed = divisorRows.filter((row) => /conservative/i.test(row));
    ok(claimed.length === 0,
       'no conservatism is claimed for the working-days basis or the divisor window',
       claimed.join(' | '));
    ok(has(t, 'changes nothing this report computes'),
       'the page says the working-days basis moves no computed figure');
    /* The characterisation the specification carried was never checked against
       the source, and the source does not support it. */
    ok(!/tier-1|tier 1|high-throughput remote/i.test(t),
       'Jitbit’s figure is not characterised as high-throughput remote tier-1');

    /* §4. Both anchors are quoted correctly and neither measures what the
       respondent was asked for, so the page has to say so. Two published
       figures for two different functions, printed side by side without this,
       read as agreement about one thing. */
    ok(has(t, 'measure different functions'),
       'the page says the two anchors do not measure the same thing');
    ok(has(cap.print['pr-sources'], 'desktop support technicians, whose throughput is held back by travel'),
       'and says what the lower anchor actually counts');
    ok(has(cap.print['pr-sources'], 'internal IT and customer support together, worked remotely'),
       'and what the upper anchor actually counts');
    ok(has(t, 'neither one measures an internal IT service desk')
       || has(t, 'Neither is a direct match for service desk tickets in an internal IT department'),
       'and that neither matches the figure we ask the respondent for');
    ok(has(cap.print['pr-sources'], 'They do not confirm it'),
       'the anchors bracket the window rather than validate it');
    /* Anchored judgement beats bare judgement only where the anchors are honest
       about what they are, so the window is still declared as ours in the same
       breath. */
    ok(has(cap.print['pr-sources'], 'ProjexaR’s judgement'),
       'and the window is still declared as ProjexaR’s judgement beside them');
  }
}

/* ================================ the working-days basis is display-only ==== */
section('§3.6 — the working-days basis moves no computed figure');
{
  /* The basis exists so two anchors published in different units can be read in
     one. It must never reach a calculation: ticket capacity comes from the
     monthly window directly. Varying it and requiring every number in the report
     to be identical is what keeps that true — and is what makes it safe to tell
     the reader they can redo the daily comparison at their own figure.

     This shape exists because the claim was got wrong in review: the basis was
     described as the conservative end, which is not something a display-only
     constant can be. An assertion is worth more than a corrected sentence. */
  const dir = mkdtempSync(join(tmpdir(), 'cc-workingdays-'));
  const src = readFileSync(TOOL_PATH, 'utf8');
  const DECL = 'var WORKING_DAYS = 21;';
  ok(src.includes(DECL), 'the working-days constant is declared once and findably');

  /* Nodes whose text names the daily rate, and so must move with the basis.
     Everything else must not. */
  const DISPLAY_NODES = new Set(['factList', 'pr-facts', 'pr-formulas', 'pr-sources']);

  const ref = capture({ id: 'wd-21', ...FIXTURE_A });
  for (const days of [20, 22, 23]) {
    const path = join(dir, `wd${days}.html`);
    writeFileSync(path, src.replace(DECL, `var WORKING_DAYS = ${days};`));
    const cap = capture({ id: `wd-${days}`, ...FIXTURE_A }, { toolPath: path });
    if (!ok(cap.ok, `wd-${days}: renders`, cap.error)) continue;

    /* Every computed quantity, whole. Not a sample of them. */
    eq(JSON.stringify(cap.computed), JSON.stringify(ref.computed),
       `wd-${days}: the entire compute() object is unchanged`);
    eq(JSON.stringify(cap.sender), JSON.stringify(ref.sender),
       `wd-${days}: the Sender payload is unchanged`);
    /* Node by node over everything that does not name the daily rate. This is
       what proves the invariance; a filtered list of every number in the report
       would strip legitimate 20s and 21s elsewhere in it and prove less. */
    for (const id of [...SCREEN_NODES, ...PRINT_NODES]) {
      if (DISPLAY_NODES.has(id)) continue;
      eq(cap.screen[id] ?? cap.print[id], ref.screen[id] ?? ref.print[id],
         `wd-${days}: ${id} is unchanged`);
    }
    /* And the basis genuinely is stated — a constant nothing renders would pass
       every check above while telling the reader nothing. */
    ok(has(allText(cap), `${days}-working-day month`),
       `wd-${days}: the basis is stated in output`);
  }
}


/* ================================================ §3.5 pluralisation ======== */
section('Pluralisation — every prose integer correct at 1');
for (const shape of singularShapes()) {
  const cap = capture(shape);
  if (!ok(cap.ok, `${shape.id}: renders`, cap.error)) continue;
  const text = allText(cap);
  /* The lookbehind matters: without it "11 projects" and "6.1 projects" both
     match on their trailing 1 and the check fails on correct copy. */
  const bad = text.match(/(?<![\d.])1 (?:projects|people|managers|months|persons|contractors)\b/g);
  ok(!bad, `${shape.id} (${shape.site}): no "1 <plural>"`, bad ? bad.join(', ') : '');

  /* PR10 §3. The regex above requires the plural noun to sit immediately after
     the "1", and every site with an adjective in between was invisible to it.
     Three were live: "1 project managers" in two workings formula cells, and
     "1 concurrent projects" in the position lead and in the closing verdict.
     Up to three intervening words now, which reaches all of them. */
  const spaced = text.match(
    /(?<![\d.])1 (?:[a-z]+(?:-[a-z]+)? ){1,3}(?:projects|people|managers|months|persons|contractors)\b/g);
  ok(!spaced, `${shape.id} (${shape.site}): no "1 <words> <plural>"`, spaced ? spaced.join(', ') : '');

  /* And the verb. "Your 1 contractor are counted separately" was in two places,
     one on screen and one in the printed report, and no assertion in this suite
     could see either: qty() agrees the noun and the sentence around it was
     written once, in the plural. */
  const verb = text.match(/(?<![\d.])(?:1|one) (?:[a-z]+ ){0,3}(?:are|were|have|carry)\b/g);
  ok(!verb, `${shape.id} (${shape.site}): no singular subject with a plural verb`,
     verb ? verb.join(', ') : '');
}
{
  /* The numeral itself, at the site §3 names. qty() produced "Your 1
     contractor" — the noun correct and the sentence still machine output, on
     the commonest non-zero count a department reports. */
  const cap = capture(singularShapes()[5]);
  const text = allText(cap);
  ok(!/\b1 contractor\b/.test(text), 'singular: "1 contractor" appears nowhere');
  ok(/one contractor/.test(text), 'singular: the count reads as a word at one');
  ok(!/one contractors\b/.test(text), 'singular: and does not take the plural noun with it');
  /* The numeral is still the numeral everywhere it is a figure rather than
     prose, which is what makes this a per-site choice and not a global one. */
  const many = allText(capture({ id: 'plural-contractors', ...singularShapes()[5], contractors: 6 }));
  ok(/6 contractors/.test(many), 'plural: above one the numeral stands');
  /* The workings formula cells keep arithmetic in figures.

     PR13 moved the site. The internal-FTE row used to open "1 project manager +
     6.2 effective BAU FTE"; it now adds two FTE figures, and the project
     manager COUNT appears one row above, in the capacity derivation, in exactly
     the form the BAU count has always taken there. The numeral is still the
     numeral, and there is no noun left to agree with it. */
  {
    const t = allText(capture(singularShapes()[2]));
    ok(/1 × 91–100%/.test(t), 'singular: the workings formula keeps the numeral');
    ok(!/1 project managers/.test(t), 'singular: and no formula cell takes a plural noun at one');
  }
}
{
  const cap = capture(singularShapes()[1]);
  ok(/running 1 project a year above/.test(allText(cap)),
     'singular: overrun of exactly 1 reads "1 project"', cap.screen.ceilingFigure);
}
{
  const cap = capture(singularShapes()[0]);
  ok(/1 more project a year/.test(allText(cap)),
     'singular: headroom of exactly 1 reads "1 more project"', cap.screen.ceilingFigure);
}

/* ============================ the 603 corpus: oracle agreement + copy rule === */
section('603-shape corpus — oracle agreement, copy rule, no NaN, no midpoints');
const shapes = corpus();
const after = {};
let oracleMismatch = 0, copyViolations = 0, nanShapes = 0, healthyShapes = 0;
let healthyFindingReports = 0;

for (const shape of shapes) {
  const cap = capture(shape);
  if (!cap.ok) { fail++; failures.push(`${shape.id}: ${cap.error}`); continue; }
  const o = evaluate(cap.values);
  const c = cap.computed;
  const h = c.ceiling, hh = c.ceilingHi;

  const checks = [
    /* Both endpoints of every band-dependent quantity, not just one. */
    [c.at[0].bauEffectiveFte, o.at[0].bauEffectiveFte, 'bau_effective_fte lo'],
    [c.at[1].bauEffectiveFte, o.at[1].bauEffectiveFte, 'bau_effective_fte hi'],
    [c.at[0].internalProjectFte, o.at[0].internalProjectFte, 'internal_project_fte lo'],
    [c.at[1].internalProjectFte, o.at[1].internalProjectFte, 'internal_project_fte hi'],
    [c.pmLoad === null ? null : round1(c.pmLoad), o.pmDisplay, 'pm display'],
    [c.at[0].projectsPerFTE === null ? null : round1(c.at[0].projectsPerFTE), o.at[0].bauDisplay, 'bau display lo'],
    [c.at[1].projectsPerFTE === null ? null : round1(c.at[1].projectsPerFTE), o.at[1].bauDisplay, 'bau display hi'],
    [c.at[0].deliveryPerFTE, o.at[0].deliveryPerFte, 'delivery per fte (contractors)'],
    [h.pmLive, o.pmRedLive, 'pm_red_live'],
    [h.bauLive, o.at[0].bauRedLive, 'bau_red_live lo'],
    [hh.bauLive, o.at[1].bauRedLive, 'bau_red_live hi'],
    [h.pmAnnual, o.pmRedAnnual, 'pm_red_annual'],
    [h.bauAnnual, o.at[0].bauRedAnnual, 'bau_red_annual lo'],
    [hh.bauAnnual, o.at[1].bauRedAnnual, 'bau_red_annual hi'],
    [h.sustainable, o.at[0].sustainableAnnual, 'sustainable_annual lo'],
    [hh.sustainable, o.at[1].sustainableAnnual, 'sustainable_annual hi'],
    [h.value, o.at[0].headroom, 'headroom lo'],
    [hh.value, o.at[1].headroom, 'headroom hi'],
    [c.loaded.total, o.loaded.total, 'loaded_cost_per_head'],
    [c.at[0].internalEffortCost, o.at[0].internalEffortCost, 'internal_effort_cost lo'],
    [c.at[1].internalEffortCost, o.at[1].internalEffortCost, 'internal_effort_cost hi'],
    [c.at[0].fullPortfolioCost, o.at[0].fullPortfolioCost, 'full_portfolio_cost lo'],
    [c.at[1].fullPortfolioCost, o.at[1].fullPortfolioCost, 'full_portfolio_cost hi'],
    [c.at[0].reportedShare, o.at[0].reportedShare, 'reported_share lo'],
    [c.at[1].reportedShare, o.at[1].reportedShare, 'reported_share hi'],
    [c.sums, o.sums, 'summing path'],
    [c.licenceCount, o.licenceCount, 'licence_count'],
    [c.yearly, o.yearly, 'annual price'],
    [c.spendPct, o.spendPct, 'share of reported spend'],
    [JSON.stringify(c.derivedRunShare), JSON.stringify(o.derivedRunShare), 'derived_run_share'],
    [JSON.stringify(c.ticketFTE), JSON.stringify(o.ticketFte), 'ticket_fte'],
    [JSON.stringify(c.runWorkGap), JSON.stringify(o.runWorkGap), 'run_work_gap'],
    [c.typicalDurationMonths, o.typicalDurationMonths, 'typical_duration_months'],
    [c.itPercent === null ? null : round1(c.itPercent), o.itShare, 'it_share'],
    [c.priceCosts, o.priceCosts, 'currency gate'],
    /* §2. Undefined, not null: the figure is gone from compute() rather than
       computed and suppressed. */
    [c.impliedRate, undefined, 'tickets_per_employee is undefined'],
    [c.corroboration === null ? null : c.corroboration,
      o.corroboration === null ? null : o.corroboration.toLowerCase(), 'corroboration branch'],
  ];
  for (const [got, want, what] of checks) {
    if (got !== want) {
      oracleMismatch++; fail++;
      failures.push(`${shape.id}: ${what} — oracle ${JSON.stringify(want)}, tool ${JSON.stringify(got)}`);
    } else pass++;
  }
  const wantPm = o.ragPM === null ? '' : o.ragPM;
  const wantBau = o.ragBAU === null ? '' : o.ragBAU;
  if (cap.sender.rag_pm !== wantPm || cap.sender.rag_bau !== wantBau) {
    oracleMismatch++; fail++;
    failures.push(`${shape.id}: rag — oracle ${wantPm}/${wantBau}, tool ${cap.sender.rag_pm}/${cap.sender.rag_bau}`);
  } else pass++;

  /* §2.1. A published range must never be the midpoint of its endpoints: the
     tool must print both, or one where both round the same. */
  if (o.at[0].bauEffectiveFte !== null) {
    const lo = round1(Math.min(o.at[0].bauEffectiveFte, o.at[1].bauEffectiveFte));
    const hi = round1(Math.max(o.at[0].bauEffectiveFte, o.at[1].bauEffectiveFte));
    const mid = round1((lo + hi) / 2);
    const shown = cap.screen.positionLead + cap.screen.factList;
    const wantText = lo === hi ? `${lo.toFixed(1)}` : `${lo.toFixed(1)}–${hi.toFixed(1)}`;
    if (!shown.includes(wantText)) {
      fail++; failures.push(`${shape.id}: effective BAU FTE not shown as "${wantText}"`);
    } else pass++;
    if (lo !== hi && mid !== lo && mid !== hi
        && new RegExp(`(^|[^\\d.])${mid.toFixed(1)} (effective|FTE)`).test(shown)) {
      fail++; failures.push(`${shape.id}: a midpoint (${mid.toFixed(1)}) appears where a range belongs`);
    } else pass++;
  }

  assertBars(shape.id, cap.screen.tileGrid);

  /* Two views of the same render: the copy rule reads the claim-making output
     only, while the diff hashes everything the page produced. */
  const copyText = allText(cap, { forCopyRule: true });
  const text = allText(cap);
  const violations = copyRuleViolations(copyText);
  if (violations.length) {
    copyViolations++; fail++;
    failures.push(`${shape.id}: banned copy — ${violations.join(', ')}`);
  } else pass++;
  if (badNumbers(text)) {
    nanShapes++; fail++; failures.push(`${shape.id}: NaN/Infinity/undefined in output`);
  } else pass++;

  /* The governing acceptance criterion: no rating is contradicted by any figure
     the tool publishes. A tile rating At risk must be at or past the red
     threshold printed on the workings page, and one that is not must be short
     of it. The BAU tile is rated on the adverse endpoint, so it is checked
     against that endpoint's threshold — which is the one it publishes. */
  if (o.ragPM !== null) {
    const atRisk = o.ragPM === 'At risk';
    if (atRisk !== (cap.values.live >= h.pmLive)) {
      fail++; contradictions++;
      failures.push(`${shape.id}: PM tile rates ${o.ragPM} at ${cap.values.live} live, `
        + `but the workings publish a red threshold of ${h.pmLive}`);
    } else pass++;
  }
  if (o.ragBAU !== null) {
    const atRisk = o.ragBAU === 'At risk';
    if (atRisk !== (cap.values.live >= h.bauLive)) {
      fail++; contradictions++;
      failures.push(`${shape.id}: BAU tile rates ${o.ragBAU} at ${cap.values.live} live, `
        + `but the workings publish a red threshold of ${h.bauLive}`);
    } else pass++;
  }

  /* Exactly four findings on every shape that has a BAU tile to take state
     from, and their states must match the oracle. */
  const findings = (cap.print['pr-cards'].match(/<span class="p-rag">([^<]+)<\/span>/g) || [])
    .map((m) => m.replace(/<[^>]*>/g, ''));
  if (findings.length !== 4) {
    fail++; failures.push(`${shape.id}: ${findings.length} findings, not 4`);
  } else pass++;
  if (findings.length === 4) {
    const want = [null, finding2State(cap.values).state, finding3State(cap.values), finding4State(cap.values)];
    for (let i = 1; i < 4; i++) {
      if (findings[i] !== want[i]) {
        fail++; failures.push(`${shape.id}: finding ${i + 1} — oracle ${want[i]}, tool ${findings[i]}`);
      } else pass++;
    }
    if (findings.every((f) => f === 'Healthy')) healthyFindingReports++;
  }

  if (o.ragPM === 'Healthy' || o.ragBAU === 'Healthy') healthyShapes++;
  /* PR9 §4. The digest pair excludes the covering note and the two link
     surfaces. Both hashes take exDigest, so the "gained a §5 band track" count
     still means what it says: the pair differs by the track and by nothing
     else. The copy rule above reads them with no exclusion at all. */
  const digest = allText(cap, { exDigest: true });
  const bare = allText(cap, { exBar: true, exDigest: true });
  after[shape.id] = {
    text: sha(digest), numbers: sha(numbersIn(digest).join('|')),
    textExBar: sha(bare), numbersExBar: sha(numbersIn(bare).join('|')),
  };
}

console.log(`  rating/threshold contradictions ... ${contradictions}`);
console.log(`  §5 band-track faults ...... ${barFaults}`);
console.log(`  oracle mismatches ......... ${oracleMismatch}`);
console.log(`  copy-rule violations ...... ${copyViolations}`);
console.log(`  NaN / Infinity shapes ..... ${nanShapes}`);
console.log(`  shapes with >=1 Healthy tile ... ${healthyShapes} of ${shapes.length}`);
console.log(`  shapes with all 4 findings Healthy ... ${healthyFindingReports} of ${shapes.length}`);

/* ============================================================ fuzz pass ===== */
section('Seeded fuzz — 400 shapes across the whole input space');
{
  /* The 603 corpus holds the optional answers fixed. This reaches the
     combinations it does not: blank spend, blank tickets, blank split, every
     currency, every band, contractors, edited salaries, zero PMs against zero
     BAU, and caseloads either side of both bands. Deterministic, so a failure
     is reproducible. */
  let seed = 20260904;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  let fuzzFail = 0;
  let fuzzRendered = 0;

  for (let i = 0; i < 400; i++) {
    const pms = pick([0, 0, 1, 2, 5, 12, 25, 60]);
    const bauStaff = pick([0, 1, 3, 10, 20, 50]);
    const staff = pms + bauStaff + pick([0, 1, 5, 40]);
    const live = pick([0, 1, 2, 7, 16, 45, 120, 400]);
    const shape = {
      id: `fuzz-${i}`,
      companyHeadcount: Math.max(staff, pick([10, 120, 600, 1200, 20000])),
      staff: Math.max(1, staff), pms, live,
      annual: live + pick([0, 1, 5, 30, 200]),
      spend: pick([null, 0, 1000, 367000, 90000000]),
      currency: pick(['GBP', 'USD', 'EUR', 'AUD', 'NZD', 'CAD']),
      bauStaff, bauPercent2: pick(BANDS), pmPercent2: pick(BANDS),
      contractors: pick([0, 0, 1, 4, 30]),
      ticketsPerMonth: pick([null, 0, 12, 960, 100000]),
      bauSplitEstimate: pick([null, 0, 20, 56, 72, 100]),
      loadedSalary: pick([null, 1, 4000, 40000, 56348, 250000]),
      toolset: pick(TOOLSETS), resourceVisibility: pick(VISIBILITY),
      budgetTracking: pick(BUDGETS), assignmentKnowledge: pick(ASSIGNMENT),
    };
    const cap = capture(shape);
    if (!cap.ok) continue;   /* rejected by validation is a valid outcome */
    fuzzRendered++;
    const text = allText(cap, { forCopyRule: true });
    if (badNumbers(text)) {
      fuzzFail++; fail++; failures.push(`${shape.id}: NaN/Infinity/undefined — ${JSON.stringify(shape)}`);
    } else pass++;
    const violations = copyRuleViolations(text);
    if (violations.length) {
      fuzzFail++; fail++; failures.push(`${shape.id}: banned copy ${violations.join(', ')}`);
    } else pass++;
    const o = evaluate(cap.values);
    if (cap.computed.ceiling.value !== o.at[0].headroom) {
      fuzzFail++; fail++;
      failures.push(`${shape.id}: headroom oracle ${o.at[0].headroom}, tool ${cap.computed.ceiling.value}`);
    } else pass++;
    if (cap.computed.at[0].internalEffortCost !== o.at[0].internalEffortCost) {
      fuzzFail++; fail++;
      failures.push(`${shape.id}: internal effort cost oracle ${o.at[0].internalEffortCost}, `
        + `tool ${cap.computed.at[0].internalEffortCost}`);
    } else pass++;
    const badPlural = allText(cap).match(/(?<![\d.])1 (?:projects|people|managers|months|contractors)\b/g);
    if (badPlural) { fuzzFail++; fail++; failures.push(`${shape.id}: "${badPlural[0]}"`); } else pass++;
  }
  console.log(`  fuzz failures ............. ${fuzzFail}`);
  /* §0.16, in the form this pass is exposed to. "Rejected by validation is a
     valid outcome" is true, and it also means a new required input silently
     empties this section: every shape the generator does not answer it on is
     skipped, and 400 shapes assert nothing while the run still reads green.

     PR13 did exactly that. Adding the project-manager share took the rendered
     count from 400 to 97 before pmPercent2 was added to the generator, and not
     one assertion failed — the drop showed up only in the suite's own total,
     which nobody reads as coverage. The floor is stated so the next one fails
     here instead. Measured both ways in the session that added it. */
  console.log(`  fuzz shapes rendered ...... ${fuzzRendered} of 400`);
  ok(fuzzRendered >= 250, 'fuzz: the generator still reaches most of the input space',
     `${fuzzRendered} of 400 rendered`);
}

/* ============================================= static report copy =========== */
section('Copy rule — static report and methodology copy');
{
  /* The dynamically-rendered nodes are covered above, but the printed report
     also carries copy written straight into the markup: the methodology page,
     the bands statement, "What this does not account for", the four steps. All
     of it is output and all of it goes into the PDF, so the copy rule applies
     to it exactly as it does to a tile. Missing this is how the bands statement
     shipped unscanned. */
  const html = readFileSync(TOOL_PATH, 'utf8');
  const start = html.indexOf('<div id="printReport">');
  const end = html.indexOf('</main>', start);
  ok(start > 0 && end > start, 'printReport block located in the markup');
  /* PR8 §5. This scan read the print report's static markup and nothing else,
     which is a guard scoped to the half of the file the change touched. The web
     report carries static prose of its own — the section subheads, the gate
     blurb, the conversion panel, the disclaimer — and no copy rule has ever
     been applied to it. Both halves now. */
  const webStart = html.indexOf('<section id="report"');
  ok(webStart > 0 && webStart < start, 'web report block located in the markup');
  const flatten = (s) => s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&pound;/g, '£').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, ' ').trim();

  /* PR7 §3.1 moved the bands statement out of static markup and into
     bandsStatement(), so it can be rendered into the web report and the printed
     report from one string. It is still report copy and still has to clear
     every rule below, so it is flattened back in here rather than dropping out
     of this scan — which is exactly how it shipped unscanned once before. */
  const bandsCopy = flatten(loadTool().api.bandsStatement(''));
  const staticCopy = flatten(html.slice(start, end)) + ' ' + bandsCopy;
  const staticWebCopy = flatten(html.slice(webStart, start));
  /* Everything below that asserts a sentence is present stays scoped to the
     printed report, because that is where those sentences live. The RULE, which
     is a claim about output rather than about a page, runs over both. */
  const staticBoth = staticCopy + ' ' + staticWebCopy;

  const violations = copyRuleViolations(staticBoth);
  ok(violations.length === 0, 'static copy in BOTH reports clears the copy rule', violations.join(', '));

  /* The bands statement, sentence by sentence — all three closing statements
     are load-bearing and none may be trimmed.

     The three are numbered in the prose from PR7. An independent reader counted
     four, because the leadership-role sentence reads as its own item rather
     than as the elaboration of item 2 that it is. The suite had encoded that
     grouping in its own labels and the page had not, so the labels were the
     only place the intended reading existed. First/Second/Third put it on the
     page, where the reader is. */
  ok(/These bands are ProjexaR's management controls/.test(staticCopy), 'bands statement: opening');
  ok(/point estimate of 5\.16 concurrent projects and a confidence interval of 3\.57 to 6\.19/.test(staticCopy),
     'bands statement: figures, with "point estimate" clearing the copy rule');
  ok(/Three things follow, and we state all three/.test(staticCopy), 'bands statement: three things');
  ok(/First, the study covers/.test(staticCopy), 'bands statement: item 1 is numbered');
  ok(/a portfolio of IT change projects is a different setting/.test(staticCopy), 'bands statement: 1 of 3 — setting');
  ok(/Second, managerial responsibility appears in it only as a check on how people were allocated to projects/
       .test(staticCopy), 'bands statement: 2 of 3 — managerial responsibility is an allocation check, numbered');
  ok(/our step, not the paper's/.test(staticCopy), 'bands statement: 2 of 3 — our step');
  ok(/leadership role \(project leader, chief project engineer, project supervisor\) changes the benefit of multi-project work, and finds it does not/
       .test(staticCopy), 'bands statement: Table S10 — leadership role tested as a moderator, and does not moderate');
  ok(/never models project management caseload as such/.test(staticCopy),
     'bands statement: what the leadership-role test does not cover');
  ok(/Third, our\s+red threshold of 7\.0 sits above the top of that confidence interval/.test(staticCopy),
     'bands statement: 3 of 3 — the threshold sits above the interval, numbered');
  /* Exactly three ordinals, so a fourth item cannot be added without either
     numbering it or breaking this. */
  ok(!/\bFourth,/.test(staticCopy), 'bands statement: no fourth numbered item');

  /* Three claims we must not make. The first inverts the paper: the -.507 result
     is an allocation check with MPW as the dependent variable, not a finding
     that the inverted-U fails for managers. The second is an asserted absence
     contradicted by Table S10, which does test leadership role as a moderator
     of the performance curve.

     The third is PR7 §2, and it is the one that had shipped. The bands arrived
     already set on 3 September, attributed to the research as "supported by"
     rather than derived from it. The deck settles it: slide 9 sets 5.0 and 7.0
     as proposed management controls on complexity, phase and dependency
     grounds, and across all 29 XML parts it never mentions a confidence
     interval, a turning point, or any intent to sit above one. So the claim
     that 7.0 was placed above the interval *deliberately*, to understate rather
     than manufacture, was an assertion about our own reasoning that no source
     supports. The fact stays and the reader draws the inference; 7.0 > 6.19 is
     visible without being told what it was for. */
  ok(!/not find (the |that )?(same )?pattern among managers/i.test(staticCopy),
     'no claim that the inverted-U was tested and not found for managers');
  ok(!/does not test whether that curve differs for managers/i.test(staticCopy),
     'no asserted absence about testing the curve by role — Table S10 tests leadership role');
  ok(!/understate the problem than manufacture one/i.test(html),
     'no claim that 7.0 was set above the interval deliberately — the deck establishes no such intent');
  /* Scoped to the claim the register actually bars: intent about how a band
     VALUE was chosen. Two unrelated uses of "deliberately" survive and should —
     one says the two tiles measure different things by construction, the other
     that the composition check carries no rating on purpose. Neither is a
     provenance claim, so a bare word ban would be a false positive that taught
     the next reader to route around the check. Sentence-scoped instead: no
     sentence naming a band value may also assert why it was placed there. */
  {
    const INTENT = /deliberate|on purpose|we would rather|chose to|conservativ|erring|err on/i;
    const BAND_VALUE = /\b(5\.0|7\.0|10\.0|5\.16|3\.57|6\.19)\b/;
    const offenders = staticCopy
      .split(/(?<=[.?!])\s+/)
      .filter((s) => BAND_VALUE.test(s) && INTENT.test(s));
    ok(offenders.length === 0,
       'no sentence states both a band value and an intent about how it was set',
       offenders.join(' | '));
  }
  ok(!/8[–-]12/.test(html), 'no 8–12 reference anywhere in the file, comments included');

  /* §3.5 — the range explanation is an argument, and it is not buried. */
  ok(/That is why these figures are ranges/.test(staticCopy),
     'the blended-average paragraph carries the band and range treatment');
  ok(/[Tt]he width of these ranges is the measure of how much a department-wide average leaves unsaid/
       .test(staticCopy), 'the range explanation still says what the width of a range measures');
  /* §3.2 — which band the study is behind, and which it is not.

     The audit's strongest single finding: the BAU band of 5.0 and 10.0 has no
     derivation anywhere, carries the same visual weight as the PM band and sits
     beside a DOI. It inherited credibility it had not earned. The deck confirms
     the absence — it is entirely about PM concurrent projects, and mentions
     neither 10.0 nor any per-FTE quantity.

     The negation matters as much as the assertion. A sentence written to be
     honest about the BAU bands must not be the sentence that quietly gives them
     a basis, so nothing may claim the two sets share one. */
  ok(/The study informs the bands on concurrent projects per project manager/.test(staticCopy),
     '§3.2 — the scoping sentence names which band the study informs');
  ok(/bands on\s+live projects per effective BAU FTE are ProjexaR's controls/.test(staticCopy),
     '§3.2 — and says what the BAU bands are');
  ok(/No published study sits behind them/.test(staticCopy),
     '§3.2 — and that no study sits behind them');
  {
    const SHARED = /(both|two) (sets of )?bands (are|share|rest|were)[^.]*\b(same|research|study|evidence|basis|method|posture)\b/i;
    ok(!SHARED.test(staticCopy),
       '§3.2 — nothing claims the two sets of bands share a basis, a method or a posture',
       (staticCopy.match(SHARED) || [''])[0]);
  }

  /* PR7 addendum §2.1. The audit called "we would rather understate the problem
     than manufacture one" the strongest trust line on the property. It was
     deleted from the bands statement because no source establishes the intent
     it asserted about a threshold. The posture itself is true and is evidenced
     all through the release — ranges rated on the adverse end, midpoints
     barred, the corroboration check made asymmetric — so it moves here, beside
     the mechanism a reader can check, and makes no claim about a number's
     provenance. */
  ok(/Where we could have picked a single flattering number, we did not/.test(staticCopy),
     'the posture is stated where it is verifiable, in the range explanation');
  /* PR6 §4. The reorder put "What your plans would show instead" four sections
     ahead of this paragraph, arguing the same thing in a table: that a range is
     the case for holding what each person is actually committed to. Made twice
     it is the first repetition an audit picks up, so it is made once, where the
     reader meets it first, and cut here. */
  ok(!/argument for holding what each person is actually committed to/.test(staticCopy),
     'PR6 §4 — the band paragraph no longer argues the promoted section’s case');
  ok(!/We never publish the middle/.test(staticCopy),
     'PR6 §1.4 — and no longer explains our own process');
  /* §3.4 — the exclusions are named in the static copy too. */
  ok(/Contractors and outsourced staff are excluded/.test(staticCopy),
     'the cost exclusions name contractors');
  ok(/without also holding a BAU role is excluded/.test(staticCopy),
     'the cost exclusions name staff with no BAU role');
  /* §0 constraint 3, over the whole file with its own commentary removed. The
     corpus check covers every string a shape renders; this catches one sitting
     in a branch no shape happens to reach. Comments are stripped first, because
     the rule itself is written down in several of them and a check that fails on
     the note explaining it is a check nobody keeps. */
  const codeOnly = html
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  ok(!/pays for itself|payback period|breaks? even|break-even|return on investment/i.test(codeOnly),
     'no ROI, breakeven or payback framing anywhere in the file');
}

/* ======================================= PR6 §1.1 — dashes in output ======== */
section('PR6 §1.1 — no em-dash in output, every range en-dash intact');
{
  /* Two assertions that have to be made together. The em-dash was the release's
     most common copy fault and stripping it is mechanical; the en-dash is not
     punctuation at all here but the range marker in every figure the blended
     band produces, and one regex loose enough to catch the first would take out
     the second and silently break every figure on the page. So: em-dashes are
     asserted absent, en-dashes are asserted present AND asserted to be doing
     the job they are there for, which is sitting between two numbers.

     Run over the rendered output of every shape the suite knows, not over the
     file: a dash in a code comment is not copy, and a dash reachable only on a
     branch no fixture renders is exactly what a file-level grep misses. */
  const shapes = [
    ...corpus(), ...boundaryShapes(), ...straddleShapes(), ...contractorShapes(),
    ...suppressionShapes(), ...singularShapes(), ...corroborationShapes(),
    /* PR14 §2. These render copy no other shape does — the nil-NI branch, and
       a divisor at two decimal places — so a dash rule that did not read them
       would be scoped past the only new prose in the change. */
    ...reproducibilityShapes(),
    ...currencyShapes(), ...budgetShapes(), ...loadedCostShapes(),
    { id: '8.A', ...FIXTURE_A }, { id: '8.B', ...FIXTURE_B }, { id: '8.C', ...FIXTURE_C },
    { id: '8.D', ...FIXTURE_D }, { id: '8.E', ...FIXTURE_E }, { id: '8.F', ...FIXTURE_F },
  ];
  const emSites = [];
  /* An en-dash that is not between two digits is not a range marker, and is
     the shape a careless em-dash replacement takes. */
  const looseEn = [];
  let ranges = 0, scanned = 0;
  for (const shape of shapes) {
    let cap;
    try { cap = capture(shape); } catch { continue; }
    if (!cap.ok) continue;
    scanned++;
    const t = allText(cap);
    for (let i = t.indexOf('—'); i >= 0; i = t.indexOf('—', i + 1)) {
      if (emSites.length < 6) emSites.push(`${shape.id}: ...${t.slice(Math.max(0, i - 70), i + 70)}...`);
    }
    for (let i = t.indexOf('–'); i >= 0; i = t.indexOf('–', i + 1)) {
      /* A range marker has a figure on each side of it. The endpoints carry
         units, so "14%–18%" and "£1.10m–£1.21m" put a % or an m against the
         dash rather than a digit: the test is a digit within three characters
         on each side, which no prose use of an en-dash would satisfy. */
      const near = (str) => /\d/.test(str);
      if (near(t.slice(Math.max(0, i - 3), i)) && near(t.slice(i + 1, i + 4))) ranges++;
      else if (looseEn.length < 6) looseEn.push(`${shape.id}: ...${t.slice(Math.max(0, i - 70), i + 70)}...`);
    }
  }
  ok(scanned > 600, `every shape rendered for the dash scan (${scanned})`);
  ok(emSites.length === 0, 'no em-dash appears anywhere in rendered output', emSites.join('\n     '));
  ok(looseEn.length === 0, 'every en-dash in output sits between two figures', looseEn.join('\n     '));
  ok(ranges > 0, `range en-dashes survive (${ranges} across the scan)`);

  /* The one place a dash is load-bearing and could be lost to a global edit:
     the band label and the money span both print a range. Pinned by value. */
  const a = capture({ id: 'dash-fixture', ...FIXTURE_A });
  ok(has(allText(a), '31–40%'), 'the band label still prints as a range');
  ok(has(allText(a), '6.2–8.0'), 'and so does an effective-FTE figure');

  /* The static printed copy is output too, and the file is where its dashes
     live. Comments stripped: the note explaining the rule is not the copy. */
  const flat = (s) => String(s).replace(/<[^>]*>/g, ' ')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–');
  const staticOut = flat(staticReportText());
  /* PR8 §5. The em-dash rule is a rule about output, and the web report is
     output. This read the printed half only. */
  const staticWebOut = flat(staticWebText());
  ok(!staticOut.includes('—'), 'and none in the static printed copy either');
  ok(!staticWebOut.includes('—'), 'and none in the static web copy either');
  ok(staticOut.includes('170–320'), 'while its own range survives');
}

/* ==================================== PR6 §1.2 — Your numbers stands alone == */
section('PR6 §1.2 — every Your numbers description is a sentence of its own');
{
  /* One row used to open "Of ongoing capacity" and finish its sentence only if
     you had already read the figure in the column beside it. That is a fragment
     to a screen reader, and in the printed report the figure sits BETWEEN the
     label and the description, so the sentence could not be reassembled at all.

     The rule: read the description with the figure column removed and it must
     still be a sentence. Checked structurally rather than by eye — a label that
     opens with a preposition, or a description that opens lower-case, is one
     that leans on its neighbour. */
  const OPENERS = /^(of|is|and|but|which|that|the same|these|those|it |they )\b/i;
  const rows = [];
  for (const shape of [{ id: '8.A', ...FIXTURE_A }, { id: '8.B', ...FIXTURE_B },
                       { id: '8.D', ...FIXTURE_D }, { id: '8.E', ...FIXTURE_E },
                       ...suppressionShapes(), ...contractorShapes(), ...singularShapes()]) {
    let cap;
    try { cap = capture(shape); } catch { continue; }
    if (!cap.ok) continue;
    /* Read out of the printed table, where label, figure and description are
       three separate cells and nothing joins them. */
    const cells = [...cap.print['pr-facts'].matchAll(
      /<tr><th[^>]*>([\s\S]*?)<\/th><td[^>]*><strong>([\s\S]*?)<\/strong><\/td><td>([\s\S]*?)<\/td><\/tr>/g)];
    ok(cells.length > 0, `${shape.id}: the numbers table renders rows`);
    for (const [, label, figure, note] of cells) {
      const L = label.replace(/<[^>]*>/g, '').trim();
      const N = note.replace(/<[^>]*>/g, '').trim();
      rows.push({ id: shape.id, L, N, figure });
    }
  }
  const badLabel = rows.filter((r) => OPENERS.test(r.L));
  const badOpen  = rows.filter((r) => !/^[A-Z£0-9]/.test(r.N));
  const badEnd   = rows.filter((r) => !/[.]$/.test(r.N));
  ok(badLabel.length === 0, 'no label opens mid-sentence',
     badLabel.slice(0, 4).map((r) => `${r.id}: "${r.L}"`).join('\n     '));
  ok(badOpen.length === 0, 'every description opens as a sentence does',
     badOpen.slice(0, 4).map((r) => `${r.id}: "${r.N.slice(0, 80)}"`).join('\n     '));
  ok(badEnd.length === 0, 'and closes as one does',
     badEnd.slice(0, 4).map((r) => `${r.id}: "...${r.N.slice(-60)}"`).join('\n     '));
  ok(rows.length > 40, `rows checked (${rows.length})`);

  /* The row this section exists for, named so a regression is legible. */
  const ticket = rows.find((r) => /ticket volume/.test(r.L));
  ok(!!ticket, 'the ticket row is among them');
  if (ticket) {
    ok(!/^Of\b/.test(ticket.L), 'the ticket label no longer opens "Of"');
    ok(!ticket.L.includes('—'), 'and carries no em-dash aside');
  }
}

/* ================================== PR6 — counts stated in static copy ====== */
section('PR6 — every count stated in prose matches what the report renders');
{
  /* "Four external figures appear in this report" was wrong on any report where
     the respondent skipped an optional question, and PR6 deleted the count
     rather than making it dynamic. Three other places still state a count.

     The four steps are the case where a count is legitimate: they are static
     markup, four <li> with no id, nothing in the script writes to them or
     hides them, and no branch can produce a fifth or drop one. So the count
     stays — and is pinned here, because a count that is true today is exactly
     what "Four external figures" was, and the way it goes wrong is somebody
     adding a step and not reading the prose around it. */
  const html = readFileSync(TOOL_PATH, 'utf8');
  const steps = between(html, '<ol class="p-steps">', '</ol>', '§2.5 printed steps list');
  const n = (steps.match(/<li>/g) || []).length;
  eq(n, 4, 'the printed report lists four steps');
  ok(/<h2[^>]*>Four steps, no software required<\/h2>/.test(html), 'and the heading says four');
  ok(/If you do these four things in a spreadsheet/.test(html), 'and the note below them says four');
  ok(/four things you can do about it that involve buying nothing/.test(html),
     'and the gate blurb promising four is describing those four');
  /* Nothing in the script reaches them, which is what makes the count safe. */
  const script = between(html, '<script>', undefined, '§2.5 tool script');
  ok(!/p-steps/.test(script), 'no script writes to the steps list');

  /* The count PR6 deleted stays deleted, and the unconditional sentence stays. */
  ok(!/Four external figures/.test(html), 'the external-figure count is gone');
  ok(/Every external figure is named where it is used/.test(html),
     'and the sentence that replaced it holds whatever the respondent skipped');
}

/* ============================= PR6 — planned commitment, never hours ======== */
section('PR6 §7 — the tool holds committed time and never claims to track it');
{
  /* The standing constraint: ProjexaR holds planned commitment, and no output
     may read as a claim that it measures where time actually went. The
     comparison table is the risk, because its right-hand column describes what
     a project plan would return and it now runs near the top of the report,
     where a skimmer meets it before the column header has done any work. */
  const TRACKING = [
    /where it actually go(es|ne)/i,
    /where the time (actually )?went/i,
    /actual hours/i,
    /time(-| )tracking/i,
    /hours (logged|recorded|tracked)/i,
    /timesheet/i,
  ];
  const shapes = [
    { id: '8.A', ...FIXTURE_A }, { id: '8.B', ...FIXTURE_B }, { id: '8.D', ...FIXTURE_D },
    { id: '8.E', ...FIXTURE_E }, { id: '8.F', ...FIXTURE_F },
    ...suppressionShapes(), ...budgetShapes(), ...corroborationShapes(),
  ];
  let scanned = 0;
  for (const shape of shapes) {
    let cap;
    try { cap = capture(shape); } catch { continue; }
    if (!cap.ok) continue;
    scanned++;
    const t = allText(cap);
    for (const re of TRACKING) {
      ok(!re.test(t), `${shape.id}: output makes no claim to track hours (${re.source})`,
         (t.match(re) || [''])[0]);
    }
  }
  ok(scanned > 10, `shapes scanned for tracking claims (${scanned})`);
  /* And the row this exists for says what the product actually holds. */
  const a = capture({ id: 'commitment', ...FIXTURE_A });
  ok(has(allText(a), 'Where it is committed: by person, by project, by week'),
     'the comparison row names committed time');
}

/* ================================================== the second route ========= */
section('PR7 §7.5 — one more route to the trial, additive and unpriced');
{
  /* §8.4 rejects MOVING the panel: PR5 placed it four days ago for a stated
     reason and one reader's report is not grounds for thrash. The observation
     behind the request is accepted instead — the panel lands where the problem
     still feels too large for a trial to touch — and answered by adding a door
     rather than moving one.

     Three constraints, each of which is a way this could go wrong: the panel
     must be untouched, the new route must not be a second panel, and the offer
     must be described in the panel's own words. Two different descriptions of
     one offer is the contradiction already open on /start, reproduced inside a
     single page. */
  const html = readFileSync(TOOL_PATH, 'utf8');
  const report = between(html, '<section id="report"', '<div id="printReport">', 'web report slice');

  /* PR15 §7.1. PR7 §7.5 barred a second conversion PANEL, not a second
     button, and the class list now carries the primary CTA's own style. The
     pattern names both classes rather than loosening to `class="[^"]*"`: a
     loose pattern here would go on passing if the button style were dropped
     again, which is the change this asserts against. */
  ok(/<p class="checks-cta"><a href="\/start\/" class="btn btn-primary cta-inline">Start free<\/a>/.test(report),
     '§7.5 — the second route exists and points at /start/');
  ok(/class="btn btn-primary cta-inline"/.test(report),
     '§7.1 — and it carries the primary CTA\'s style, not a text link\'s');
  /* Still not a panel: no ground, no border and no box of its own. The block
     keeps only the rule above it that separates it from the checks. */
  const ctaRule = (readFileSync(TOOL_PATH, 'utf8').match(/\n\.checks-cta\{[^}]*\}/) || [''])[0];
  ok(ctaRule.length > 0, '§7.1 — the .checks-cta rule is found before it is read');
  ok(!/background|box-shadow|border-radius/.test(ctaRule),
     '§7.1 — and the block is still not a second panel');
  /* Same offer wording as the panel, exactly.

     PR12 put a data-offer attribute on both elements, and these two patterns
     were anchored to a bare class attribute, so both stopped matching at once
     and the comparison below became eq(undefined, undefined): a pass, on a page
     where the two subs could by then have said anything. Master §0.16 in its
     text form. Both are now asserted to have matched before they are compared. */
  const panelSub = grab(report, /<p class="midcta-sub"[^>]*>([^<]+)<\/p>/, '§7.5 panel sub');
  const ctaSub = grab(report, /<span class="checks-cta-sub"[^>]*>([^<]+)<\/span>/, '§7.5 second-route sub');
  eq(ctaSub, panelSub, '§7.5 — the offer is described in the panel\'s own words, exactly');
  const panelBtn = grab(report, /id="trialCta">([^<]+)<\/a>/, '§7.5 panel button');
  const ctaBtn = grab(report, /class="btn btn-primary cta-inline">([^<]+)<\/a>/, '§7.5 second-route button');
  eq(ctaBtn, panelBtn, '§7.5 — and so is the action');

  /* Not a second panel, and no price beside it. */
  eq((report.match(/class="midcta"/g) || []).length, 1, '§7.5 — still exactly one conversion panel');
  const ctaBlock = between(report, '<p class="checks-cta">', undefined, '§7.5 second-route block').slice(0, 400);
  ok(!/£|priceLine|a month|a year/.test(ctaBlock),
     '§7.5 — no price beside the second route; the price is stated once, in the panel');

  /* It sits after the checks block — the point at which the reader has been
     shown something a spreadsheet could not do — and below the panel. */
  ok(report.indexOf('<p class="checks-cta">') > report.indexOf('id="checkList"'),
     '§7.5 — it sits after the checks');
  ok(report.indexOf('<p class="checks-cta">') > report.indexOf('class="midcta"'),
     '§7.5 — and lower on the page than the existing panel, which has not moved');
}

/* ==================================================== headings that name ===== */
section('PR7 item 4 — headings that name figures, counted');
{
  /* Eight headings named figures, numbers or workings, five of them across two
     consecutive print spreads. A reader landing on the Your numbers page met
     "Your numbers", then "The figures your position is built from", then "Your
     figures, as you entered them", and could not tell from any of them which
     table was which — the distinction that matters is what we worked out
     against what they typed, and no heading carried it.

     Three headings survive. The two tables take captions. This counts them, so
     a fourth cannot be added without the count failing. */
  const html = readFileSync(TOOL_PATH, 'utf8');
  const printBlock = between(html, '<div id="printReport">', '</main>', 'print report slice');

  const FIGURE_WORDS = /\b(figures?|numbers?|workings?)\b/i;
  const headings = [...printBlock.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1].trim());
  const figureHeadings = headings.filter((h) => FIGURE_WORDS.test(h));
  const runningHeads = [...printBlock.matchAll(/<div class="p-head"><span>([^<]+)<\/span>/g)]
    .map((m) => m[1].trim()).filter((h) => FIGURE_WORDS.test(h));

  /* Two running headers name the pages, and "Your capacity position" is not a
     figures heading. What must not come back is a stack of h2s all saying the
     same thing. */
  eq(figureHeadings.length, 0,
     'item 4 — no <h2> in the print report names figures; the running headers do that',
     figureHeadings.join(' | '));
  eq(runningHeads.length, 2,
     'item 4 — exactly two running headers name the figures pages', runningHeads.join(' | '));

  /* The captions carry the distinction the headings could not. */
  ok(/<p class="p-caption">From your answers<\/p>/.test(printBlock),
     'item 4 — the derived table is captioned');
  ok(/As you entered them<\/p>/.test(printBlock), 'item 4 — and the input table is captioned');
  /* Comments stripped: the note explaining this change quotes the old headings
     by name, which is the point of it. What must be gone is the rendered ones.

     PR8 §5. Scoped to the print block, these asserted the old headings were
     gone from the half of the file PR7 edited. An old heading coming back on
     the web side is the same defect and this could not see it. The scope is the
     whole file, comments stripped once for both. */
  const fileCopy = html.replace(/<!--[\s\S]*?-->/g, ' ');
  ok(!/The figures your position is built from/.test(fileCopy),
     'item 4 — the old heading is gone from the WHOLE file');
  ok(!/Your figures, as you entered them/.test(fileCopy),
     'item 4 — and so is its near-twin, on both sides');
  ok(!/<h2[^>]*>Every figure is arithmetic/.test(printBlock),
     'item 4 — the workings lead is a sentence, not a heading');
  ok(/Every figure here is arithmetic on something you supplied\./.test(printBlock),
     'item 4 — and it is still said');
}

/* =========================================== the spec matches what ships ==== */
section('PR7 §1.4 — master §2.11 and the shipped bands statement are the same words');
{
  /* This is the guard for the failure that cost this release a halted PR.

     PR1 changed the bands statement on the page — added a third item, then the
     Table S10 sentence — and nobody updated master §2.11. Five days later a
     brief written from the specification described a statement that had not
     shipped for five days, and a stop condition fired on the difference. The
     specification is in the repository now, so the two can be compared, and
     anything that edits one without the other fails here.

     Compared on normalised text: markdown emphasis, HTML tags, entities and
     whitespace all collapse, because the two carry the same sentences in
     different markup and only the sentences are the contract. */
  const SPEC = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'claude', 'capacity-check-change-spec-sep-2026.md');
  let spec = null;
  try { spec = readFileSync(SPEC, 'utf8'); } catch { /* not checked out */ }
  if (!spec) {
    ok(true, '§1.4 — specification not present in this checkout, comparison skipped');
  } else {
    const norm = (t) => t
      .replace(/<[^>]+>/g, ' ')
      .replace(/&ndash;/g, '–').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
      .replace(/[*_>]/g, ' ')
      .replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"')
      .replace(/\s+/g, ' ').trim();

    /* The statement in the spec is the blockquote beginning "These bands are". */
    const from = spec.indexOf('> These bands are ProjexaR');
    ok(from > 0, '§1.4 — master §2.11 carries the statement');
    const end = spec.indexOf('\n\n', spec.indexOf('confidence interval.', from));
    const specText = norm(spec.slice(from, end));
    const shipped = norm(loadTool().api.bandsStatement(''));

    /* Prefix, not equality: §2.11 prescribes the statement, and the page wraps
       it with the §2.12 citation and the §3.2 scoping sentence, neither of
       which belongs to §2.11. Every word §2.11 does specify must match, in
       order, which is what actually drifted. */
    ok(shipped.startsWith(specText),
       '§1.4 — the page carries master §2.11 word for word',
       shipped.startsWith(specText) ? '' : (() => {
         let i = 0; while (i < specText.length && specText[i] === shipped[i]) i++;
         return `\n   diverges at ${i}\n   spec:    ...${specText.slice(Math.max(0, i - 80), i + 120)}` +
                `\n   shipped: ...${shipped.slice(Math.max(0, i - 80), i + 120)}`;
       })());
    /* And what the page adds is only the citation and the §3.2 sentence. */
    const extra = shipped.slice(specText.length).trim();
    ok(/^Colicev, A\., Hakkarainen/.test(extra),
       '§1.4 — what the page adds after it starts with the citation');
    ok(/No published study sits behind them\.$/.test(extra),
       '§1.4 — and ends with the §3.2 scoping sentence');

    /* And the intent clause is gone from both, not just from the page. */
    ok(!/deliberately: we would rather understate/.test(specText),
       '§1.4 — the withdrawn intent clause is gone from the specification too');
    /* The register records it as withdrawn rather than silently dropping it. */
    ok(/WITHDRAWN 9 Sep/.test(spec), '§1.4 — and §11 records the withdrawal');
    ok(!/UNVERIFIED\s+— one read only/.test(spec),
       '§1.4 — the stale Table S10 register row is gone');
  }
}

/* ================================================== fixture 8.G, §4.1 ======== */
section('Fixture 8.G — two contractors, and exactly one figure is allowed to move');
{
  /* §10. 8.C already reaches the contractor branch at six, so 8.G is not about
     coverage. It is the gate on §4.1, which proposes moving contractors into the
     licence basis and would make this the one place in the suite where a number
     moves.

     §4.1 was NOT approved, so the licence basis stays BAU staff on projects plus
     project managers, exactly as master §3.2 row six specifies, and every figure
     here equals 8.A's. Asserted as equalities rather than as literals so that if
     §4.1 is approved later, the diff is one line and every other row of this
     block fails loudly if contractors leak anywhere else. */
  const ref = capture({ id: '8.A-ref', ...FIXTURE_A });
  const g = capture({ id: '8.G', ...FIXTURE_G });
  if (ok(g.ok, '8.G: renders', g.error)) {
    const R = ref.computed, G = g.computed;
    eq(G.at[0].bauEffectiveFte, R.at[0].bauEffectiveFte, '8.G: effective BAU FTE');
    eq(G.at[0].projectsPerFTE, R.at[0].projectsPerFTE, '8.G: BAU tile ratio');
    eq(g.sender.rag_bau, ref.sender.rag_bau, '8.G: BAU tile rating');
    eq(G.ceiling.value, R.ceiling.value, '8.G: growth ceiling');
    eq(G.at[0].internalEffortCost, R.at[0].internalEffortCost, '8.G: internal effort cost');
    eq(G.at[0].fullPortfolioCost, R.at[0].fullPortfolioCost, '8.G: full portfolio cost');
    eq(JSON.stringify(G.derivedRunShare), JSON.stringify(R.derivedRunShare), '8.G: derived run and change share');
    eq(G.itPercent, R.itPercent, '8.G: IT staff share');
    eq(G.at[0].internalProjectFte, R.at[0].internalProjectFte, '8.G: internal_project_fte stays permanent-only');

    /* The licence quote — the one figure §4.1 moves, and the reason this
       fixture exists. §4.1 was approved, so the basis is 20 BAU + 5 PMs + 2
       contractors = 27, not 25. Typed in by hand rather than derived from the
       inputs, so an arithmetic change in the basis has to be re-stated here
       deliberately instead of silently agreeing with itself. */
    eq(G.licenceCount, 27, '8.G: licence basis is 27 — BAU staff, PMs and contractors');
    eq(G.licenceCount, R.licenceCount + 2, '8.G: which is 8.A\'s basis plus the two contractors');
    eq(G.monthly, 270, '8.G: £270 a month');
    eq(G.yearly, 2700, '8.G: £2,700 a year on the annual plan');
    /* Recomputed from the basis actually used, not carried over from 8.A. */
    eq(roundN(G.spendPct, 2), 0.74, '8.G: share of reported spend recomputes from 27');
    ok(G.spendPct !== R.spendPct, '8.G: and is not 8.A\'s share');
    eq(roundN((G.yearly / FIXTURE_G.spend) * 100, 2), roundN(G.spendPct, 2),
       '8.G: the share is the annual price over the reported spend, and nothing else');

    /* And the one thing that IS different: the unrated figure, with §4.2's
       sentence beside it. */
    ok(G.at[0].deliveryPerFTE !== null, '8.G: the contractor-inclusive figure is computed');
    ok(R.at[0].deliveryPerFTE === null, '8.G: and 8.A has none, which is what makes it the difference');
    const t = allText(g);
    ok(/Live projects per delivery FTE, including contractors/.test(t), '8.G: rendered');
    ok(/Unrated/.test(t), '8.G: and unrated');
    ok(/This figure adds your contractors and carries no rating/.test(t), '8.G: with the §4.2 sentence');
    ok(/Your 2 contractors added to/.test(t), '8.G: naming the two contractors, in the plural');

    /* The whole point, stated as one assertion: the published number multiset
       gains the contractor figures and loses nothing. */
    const bag = (x) => { const m = new Map(); for (const n of numbersIn(allText(x))) m.set(n, (m.get(n) || 0) + 1); return m; };
    const A = bag(ref), B = bag(g);
    const lost = [...A.entries()].filter(([k, v]) => v > (B.get(k) || 0)).map(([k]) => k);
    /* Exactly two groups of tokens legitimately stop being published, and
       naming them is the whole assertion — anything else in this list is
       contractors leaking into a route §3.2 excludes them from.

       "0" is the contractor input 8.A echoes in "Your figures, as you entered
       them"; 8.G echoes "2" there instead. The rest are the licence quote and
       everything priced off it, which §4.1 moves on purpose: 25 people, £250 a
       month, £2,500 a year, 0.68% of reported spend, and the two endpoints of
       the share of full portfolio cost. */
    const EXPECTED_LOST = ['0', '0.21', '0.23', '0.68', '2500', '25', '250'];
    eq(JSON.stringify([...lost].sort()), JSON.stringify([...EXPECTED_LOST].sort()),
       '8.G: the only figures 8.A published and 8.G does not are the contractor echo and the licence quote');
    /* And the replacements are there, so this cannot pass by the quote having
       been dropped rather than recomputed. */
    const t8g = allText(g);
    for (const n of ['27', '270', '2,700', '0.74']) {
      ok(t8g.includes(n), `8.G: publishes ${n}`);
    }
    ok(/Contractors and outsourced staff working on projects/.test(allText(g)),
       '8.G: and that echo is the input table row, which renders at every count');
  }
}

/* ============================================= the qualification pointer ===== */
section('PR7 §3.5 — the pointer points somewhere the reader can actually go');
{
  /* The run-work check told the reader that two things qualify the comparison
     and that "the workings page sets both out". The workings page is
     pr-derivations, which lives inside #printReport — display:none outside
     @media print, and behind the email gate on top of that. On screen the
     sentence pointed at nothing.

     The caveats stay where PR6 §3 put them. Naming them here instead was the
     other option in the brief and it is the wrong one: the second is that the
     figures are quoted against different populations, and PR6 moved that
     sentence out of this block precisely because it sat beside "this is the
     same population your projects draw from" and read as a contradiction.

     The count is the second half. It was the literal word "Two" over a list
     whose length depends on whether a ticket proportion was published. */
  const two = capture({ id: '§3.5-two', ...FIXTURE_A });
  ok(two.computed.ticketFtePercent !== null, '§3.5 — the two-qualification branch is reached');
  ok(has(two.screen.checkList, 'Two things qualify the comparison, and the full report sets both out.'),
     '§3.5 — two qualifications, counted and pointed at the report');

  /* Every IT person is a project manager, so nonPmStaff is 0, the ticket
     proportion suppresses and only one qualification is left. No fixture
     reached this branch, which is why a hardcoded "Two" survived. */
  const one = capture({ id: '§3.5-one', ...FIXTURE_A, staff: 5, pms: 5, bauStaff: 0 });
  ok(one.ok, '§3.5 — the one-qualification shape renders', one.error);
  ok(one.computed.ticketFtePercent === null, '§3.5 — and it does suppress the ticket proportion');
  ok(one.computed.runWorkGap !== null, '§3.5 — while still publishing the run-work check');
  ok(has(one.screen.checkList, 'One thing qualifies the comparison, and the full report sets it out.'),
     '§3.5 — one qualification, in the singular');
  ok(!has(one.screen.checkList, 'Two things qualify'),
     '§3.5 — and the plural does not render where only one qualification exists');

  for (const cap of [two, one]) {
    ok(!has(cap.screen.checkList, 'workings page'),
       '§3.5 — no on-screen pointer at a page the screen does not have');
  }
}

/* ================================================ the contractor figure ====== */
section('PR7 §4.2 — the unrated contractor figure says why it is unrated');
{
  /* The audit argued contractors belong inside rated delivery capacity, which
     §8.1 rejects: the growth ceiling's divisor has to be the tile's divisor, so
     moving contractors into the tile projects the portfolio forward on transient
     capacity. But the reader who made that argument had a contractor-inclusive
     figure on the page in front of them and appears not to have seen it. That is
     a finding about the page.

     Stated as what we exclude, never as what the respondent's budget contains —
     the audit's own wording asserted contractors were "already paid out of
     budget", which is in the unverified column. */
  const cap = capture({ id: '§4.2', ...FIXTURE_C });
  const t = allText(cap);
  ok(/The rated figure measures how far the portfolio leans on permanent BAU capacity/.test(t),
     '§4.2 — what the rated figure measures');
  ok(/This figure adds your contractors and carries no rating, because the bands are set against permanent capacity/
       .test(t), '§4.2 — and why the one beside it carries no rating');
  ok(!/already paid out of budget/i.test(t),
     '§4.2 — and it never states what the respondent\'s budget contains');

  /* Absent where there are no contractors to explain. */
  const none = allText(capture({ id: '§4.2-zero', ...FIXTURE_A }));
  ok(!/This figure adds your contractors/.test(none),
     '§4.2 — the sentence does not render where no contractors were reported');
}

/* ================================================== who makes the choice ===== */
section('PR7 §0.11 and §0.12 — we make the judgements, and we assert one thing at a time');
{
  /* §0.12. The report is an artefact and never the actor in a decision. "The
     check never counted them" attributes to software a choice a person made,
     and it reads as evasion the moment a reader notices — the whole point of
     the page is that somebody stands behind the numbers. Where an exclusion is
     stated, we state it as ours and give the reason.

     Scanned as a pattern, because the phrasing has three variants in the file
     already and would grow more. */
  const shapes = [
    { id: '8.A', ...FIXTURE_A }, { id: '8.B', ...FIXTURE_B }, { id: '8.E', ...FIXTURE_E },
    { id: '8.F', ...FIXTURE_F }, ...suppressionShapes(),
  ];
  const ARTEFACT_AS_ACTOR =
    /\b(the |this )?(check|report|tool|calculation)\s+(never|has not|does not|did not|cannot|will not)\s+(count|counted|include|included|ask|asked|consider|considered|decide|decided|choose|chose)\b/i;
  let scanned = 0;
  for (const shape of shapes) {
    let cap;
    try { cap = capture(shape); } catch { continue; }
    if (!cap.ok) continue;
    scanned++;
    const t = allText(cap);
    ok(!ARTEFACT_AS_ACTOR.test(t),
       `${shape.id}: the report never stands in for the person who made a choice`,
       (t.match(ARTEFACT_AS_ACTOR) || [''])[0]);
  }
  ok(scanned > 5, `shapes scanned for §0.12 (${scanned})`);

  /* And the positive form, on the shape where the exclusion is stated. */
  const a = allText(capture({ id: 'excl', ...FIXTURE_A }));
  ok(/We do not count them, because we did not ask who they are/.test(a),
     '§0.12 — the exclusion is stated as ours, with the reason');

  /* §0.11. At most one asserted inference per finding; the rest are conditional.
     "If that is happening, this is where it shows up" reads as expertise. Four
     assertions in a row about a department nobody has seen reads as a script,
     and an independent reader said so.

     There is no mechanical test for "asserted inference", so this pins the four
     the audit named. Three became conditionals and one was kept. The negations
     are what stop them drifting back, which is the failure mode: each of these
     was written by someone reaching for a stronger sentence. */
  const REVERTED = [
    [/almost certainly booked across several plans/i, 'the BAU finding asserts how people are booked'],
    [/quietly double-book the same person/i, 'the visibility finding asserts a double-booking'],
    [/decisions get made against a picture already out of date/i, 'the stale-assignment detail asserts a consequence'],
    [/every resourcing conflict[^.]*stays invisible/i, 'the no-visibility detail asserts every conflict'],
  ];
  for (const [re, why] of REVERTED) {
    ok(!re.test(a), `§0.11 — ${why}`, (a.match(re) || [''])[0]);
  }
  /* And the conditionals are actually there, so this cannot pass by the copy
     having been deleted rather than rewritten. */
  ok(/Where those people are booked across several plans, nothing here shows the overlap/.test(a),
     '§0.11 — the BAU finding states the condition');
  ok(/Where a decision is taken without that check/.test(a),
     '§0.11 — the stale-assignment detail states the condition');
  ok(/Where two of those need the same person in the same week/.test(a),
     '§0.11 — the caseload clause states the condition');
  /* The one assertion each finding keeps. */
  ok(/is where delays start/.test(a), '§0.11 — the BAU finding keeps its one assertion');
}

/* ==================================================== the bands on screen ==== */
section('PR7 §3.1 — the bands statement reaches the reader on screen, from one source');
{
  /* pr-derivations and the caveat layer sit inside #printReport, which is
     display:none outside @media print. Everything in there is behind the email
     gate as well. So the justification for a red pill was reachable only by a
     reader who handed over an address and opened a PDF, while the pill itself
     was free. A reader deciding whether to believe a rating needs the reason
     beside the rating.

     One string feeds both reports. That is not tidiness: PR5 renamed a section
     on screen and not in the printed report, both versions shipped, and an
     independent reader quoted the stale one back at us. Two copies of a
     paragraph this load-bearing would be the same defect waiting to happen. */
  const cap = capture({ id: 'bands-web', ...FIXTURE_A });
  const web = cap.screen.bandsStatement || '';
  const print = cap.print['pr-bands'] || '';
  ok(web.length > 500, 'the bands statement renders into the web report', String(web.length));
  ok(print.length > 500, 'and into the printed report', String(print.length));

  const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&ndash;/g, '–').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
  /* PR15 §2.3 puts everything after the opening claim behind a <details> on
     screen, so the summary label now sits between the first paragraph and the
     rest and the printed statement is no longer a contiguous suffix of the
     screen's. The summary is removed by value before the comparison — by
     value, so a reworded label fails here rather than being absorbed by a
     pattern — and both original claims then hold unchanged. */
  const BANDS_SUMMARY = 'The research behind them, and what it does not cover';
  const summaryTag = '<summary class="bands-more-sum">' + BANDS_SUMMARY + '</summary>';
  ok(web.includes(summaryTag), '§2.3 — the screen carries the disclosure, with the label it was given');
  const webNoSummary = web.replace(summaryTag, ' ');
  ok(text(webNoSummary).endsWith(text(print)),
     '§3.1 — the two reports carry the same statement, word for word');
  ok(text(webNoSummary).replace(text(print), '').trim() === 'How the bands were set',
     '§3.1 — and the only thing the screen adds is its own heading');

  /* And the byte-level claim PR15 §2.3 required, made against the shared
     function rather than against a rendered node: the screen block is the
     printed string with a wrapper inserted at the end of its first paragraph,
     and not one character of the statement moved. Written out here from the
     specification, never read off the page, so a change to either side fails.

     This is the assertion the text comparison above cannot make. Two strings
     that flatten to the same words can still differ in the markup that decides
     what a reader sees, and "no word moved" was the whole permission PR6 §6
     gave this change. */
  {
    const api = loadTool().api;
    const whole = api.bandsStatement('');
    const cut = whole.indexOf('</p>');
    ok(cut > 0, '§2.3 — the statement has a first paragraph to cut at');
    eq(api.bandsDisclosure(),
       whole.slice(0, cut + 4)
       + '<details class="bands-more">' + summaryTag
       + '<div class="bands-more-body">' + whole.slice(cut + 4) + '</div></details>',
       '§2.3 — the screen block is the statement with a wrapper inserted, byte for byte');
    /* The opening claim stays out in the open. It is the claim; the rest is
       the evidence, which is what a disclosure is for. */
    ok(/^These bands are ProjexaR’s management controls\./
         .test(text(api.bandsDisclosure().slice(0, whole.indexOf('</p>')))),
       '§2.3 — and the claim itself is not what went behind the disclosure');
  }

  /* PR15 §2.3, the other half. A collapsed <details> prints collapsed in some
     browsers, which would put the sourcing back behind a gate in the artefact
     that gets forwarded — the opposite of what PR7 §3.1 did. The printed
     report carries no disclosure at all, which is a stronger guarantee than a
     print rule: there is no collapsed element on that surface to fail to open.
     Asserted on the rendered node, not on the function, because it is the node
     that goes into the PDF. */
  ok(!/<details/.test(print), '§2.3 — the printed report carries no disclosure to render collapsed');
  ok(!/<summary/.test(print), '§2.3 — and no summary either');
  ok(text(print).includes('confidence interval of 3.57'),
     '§2.3 — the printed statement still carries the evidence, expanded');

  /* It is on screen, which means outside the gated block. */
  const html = readFileSync(TOOL_PATH, 'utf8');
  const printStart = html.indexOf('<div id="printReport">');
  ok(html.indexOf('id="bandsStatement"') < printStart,
     '§3.1 — the web container sits outside #printReport, so it is not display:none');

  /* And it sits with the tiles it explains, not somewhere a reader has to hunt. */
  /* PR8 §5. This sliced to end of file, so it ran through the print report and
     the whole tool script, and it settled the question with an indexOf against
     a literal run of whitespace and a comment opener. Bounded at the print
     block, and read off the section's own closing tag. */
  const posAt = html.indexOf('<h2 class="section-title">Your capacity position</h2>');
  const nextSection = html.indexOf('<h2 class="section-title">', posAt + 1);
  const positionSection = html.slice(posAt, nextSection > 0 && nextSection < printStart ? nextSection : printStart);
  ok(positionSection.includes('id="bandsStatement"'),
     '§3.1 — and inside the section that publishes the ratings, which ends before the next one starts');
}

/* ================================================== dated copy, tenseless ==== */
section('PR7 §3.6 — nothing in output dates itself against a passing deadline');
{
  /* "Project Online retires 30 September 2026" is true until 30 September 2026
     and wrong the next morning, on a page whose whole argument is that its
     figures are current. The tenseless form needs no maintenance and no diary
     entry. The finding body was corrected earlier in the release; this is the
     Sources row, which was missed because it is built in a different function.

     Scanned as a class, not as one string: any future-tense verb beside a date
     already inside this release's window is the same defect. */
  const cap = capture({ id: 'msproject', ...FIXTURE_A, toolset: 'msproject' });
  const t = allText(cap);
  ok(/Project Online retirement, 30 September 2026/.test(t),
     '§3.6 — the Sources row states the retirement tenselessly');
  ok(!/retires 30 September/.test(t), '§3.6 — and the present-tense form is gone');
  const DATING = /\b(retires|will retire|is retiring|expires|will expire|ends|will end)\b[^.]{0,40}\b(20\d\d)\b/i;
  ok(!DATING.test(t), 'no output sentence dates itself against a deadline', (t.match(DATING) || [''])[0]);
}

/* ==================================================== ticket vocabulary ===== */
section('PR7 item 2 — one word for the service desk, and it is the sources\' word');
{
  /* Both anchors publish "technician": HDI/MetricNet on desktop support
     technicians, Jitbit on 21 per technician per day. The standing rule is that
     a source is quoted in its own terms, so output says technician and never
     agent. The page used to say both — "tickets-per-technician window" and
     "tickets-per-agent window", two lines apart in the same paragraph — and an
     independent reader caught it.

     The internal constants stay TICKETS_PER_AGENT_*, so this scans rendered
     output and the static report copy, never the source. */
  const shapes = [
    { id: '8.A', ...FIXTURE_A }, { id: '8.B', ...FIXTURE_B }, { id: '8.D', ...FIXTURE_D },
    { id: '8.E', ...FIXTURE_E }, { id: '8.F', ...FIXTURE_F },
  ];
  let scanned = 0;
  for (const shape of shapes) {
    let cap;
    try { cap = capture(shape); } catch { continue; }
    if (!cap.ok) continue;
    scanned++;
    const t = allText(cap);
    ok(!/\bagents?\b/i.test(t), `${shape.id}: output never says "agent"`, (t.match(/\bagents?\b/i) || [''])[0]);
  }
  ok(scanned === shapes.length, `shapes scanned for the ticket vocabulary (${scanned})`);
  /* And the static methodology copy, which is where the two words collided. */
  const staticCopy = staticReportText().replace(/<[^>]+>/g, ' ').replace(/&ndash;/g, '–').replace(/\s+/g, ' ');
  ok(!/\bagents?\b/i.test(staticCopy), 'static report copy never says "agent"',
     (staticCopy.match(/.{0,60}\bagents?\b.{0,60}/i) || [''])[0]);
  ok(/tickets-per-technician window/.test(staticCopy),
     'the methodology names the window in the sources\' own word');
  ok(/170–320 tickets-per-technician window/.test(staticCopy),
     'and the ProjexaR-set window is labelled with it too');
}

/* ======================================================= source orphans ===== */
section('Sources — every retained source is attached to a surviving claim');
{
  /* Each source, and the output it is cited in support of. A source listed
     without its claim rendering is an orphan; a claim rendering without its
     source is an uncited assertion. Both are failures.

     §3.8 consolidates seven findings into four. Panko and the three Microsoft
     first-party sources were attached to the toolset finding, which is now one
     of the three adverse conditions inside finding 2 — so their anchor is
     unchanged and none of them is orphaned. */
  const ANCHORS = [
    ['Concurrent projects and project performance', (cap) => cap.computed.pmLoad !== null,
      'the concurrent-projects tile'],
    ['Project overload in multi-project settings', (cap) => cap.computed.pmLoad !== null,
      'the concurrent-projects tile'],
    ['Lower anchor, published per month', (cap) => cap.computed.ticketFTE !== null,
      'the ticket FTE range'],
    ['Upper anchor, published per day', (cap) => cap.computed.ticketFTE !== null,
      'the ticket FTE range'],
    ['The divisor we apply, in both units', (cap) => cap.computed.ticketFTE !== null,
      'the ticket FTE range'],
    /* §4. Travels with the anchors it qualifies, so a report that names them
       cannot omit what they do not measure. */
    ['What the two anchors do not tell you', (cap) => cap.computed.ticketFTE !== null,
      'the ticket FTE range'],
    /* "Tickets per employee per month by sector" is gone. §2 removed the claim
       it supported, so leaving the source listed would orphan it. HDI/MetricNet
       is not orphaned by that removal: it is cited independently, above, for
       the 87 to 133 desktop support figures, which is a different claim from a
       different edition and is quoted as published. */
    ['Run against growth spend', (cap) => cap.values.bauSplitEstimate !== null, 'the BAU/change split figure'],
    /* §1. Both salary sources are attached to the cost figures, so the currency
       gate takes them off the page along with what they supported. A UK salary
       survey cited beside no UK figure is an orphan. */
    ['Median IT salary', (cap) => cap.computed.at[0].internalEffortCost !== null, 'the cost figures'],
    ['Employer National Insurance', (cap) => cap.computed.at[0].internalEffortCost !== null, 'the cost figures'],
    /* PR15 addendum §1.4. This was anchored to the ANSWER — toolset ===
       'excel' — rather than to the sentence that cites the source. That is
       weak in the §0.17 sense and it was demonstrated rather than argued
       during PR15: the main brief considered cutting the citing sentence, and
       had it been cut this row would have gone on passing while supporting
       nothing at all. It reads the rendered claim now, so the source and the
       sentence stand or fall together. */
    ['Spreadsheet error rates',
      (cap) => /Spreadsheet error rates are comparable to those in other complex human tasks/
        .test(allText(cap)),
      'the spreadsheet mechanism in finding 2'],
    ['Microsoft Project capabilities', (cap) => cap.values.toolset === 'msproject',
      'the MS Project mechanism in finding 2'],
    ['Project Online retirement', (cap) => cap.values.toolset === 'msproject',
      'the MS Project mechanism in finding 2'],
    ['Microsoft Planner', (cap) => cap.values.toolset === 'planner', 'the Planner mechanism in finding 2'],
  ];
  const seen = new Set();
  const probes = [FIXTURE_A, FIXTURE_B, FIXTURE_C, FIXTURE_D, FIXTURE_E, FIXTURE_F,
    { ...FIXTURE_A, toolset: 'excel' }, { ...FIXTURE_A, toolset: 'msproject' },
    { ...FIXTURE_A, toolset: 'planner' }, { ...FIXTURE_A, ticketsPerMonth: 50 },
    { ...FIXTURE_A, pms: 0 }, { ...FIXTURE_A, bauSplitEstimate: null },
    { ...FIXTURE_A, ticketsPerMonth: null }, { ...FIXTURE_A, bauStaff: 0 }];
  for (const shape of probes) {
    const cap = capture({ id: 'orphan-probe', ...shape });
    if (!ok(cap.ok, 'orphan-probe: renders', cap.error)) continue;
    const listed = new Set(cap.print['pr-sources'].match(/<th[^>]*>([^<]+)<\/th>/g)
      ?.map((m) => m.replace(/<[^>]*>/g, '')) || []);
    for (const [title, anchor, claim] of ANCHORS) {
      const cited = listed.has(title);
      const shown = !!anchor(cap);
      if (cited) seen.add(title);
      ok(cited === shown, `source "${title}" tracks ${claim}`,
         cited ? 'cited with no claim rendering (orphan)' : 'claim renders with no source cited');
    }
  }
  for (const [title] of ANCHORS) ok(seen.has(title), `source "${title}" is reachable at all`);
  /* Nothing may cite the two the spec bars. */
  const capAll = capture({ id: 'bar', ...FIXTURE_A });
  const t = allText(capAll);
  ok(!/Bendoly|Delisle/.test(t), 'no barred citation appears');
  /* §2. The removal takes one claim off the page and must not take its
     publisher with it: HDI/MetricNet is cited independently for the 87 to 133
     desktop support figures, which is what keeps it from being orphaned. */
  ok(has(capAll.print['pr-sources'], 'HDI/MetricNet'),
     'HDI/MetricNet survives the removal, cited for the lower anchor');
  ok(has(capAll.print['pr-sources'], `${HDI_LO} to ${HDI_HI}`),
     'and for the figures it actually publishes');
  ok(!/Rumburg, 2012/.test(t), 'the 2012 edition is no longer cited for anything');
  ok(!/Zika-Wiktorsson/.test(t), 'publisher spelling Zika-Viktorsson, not Zika-Wiktorsson');
  ok(/24\(5\), 385–394/.test(capAll.print['pr-sources']), 'Zika-Viktorsson volume, issue and pages');
  ok(/44\(2\), 610–636/.test(capAll.print['pr-sources']), 'Colicev volume, issue and pages');
}

/* ================================================= §4.4 link preview ======== */
section('§4.4 — the link preview tags, and the one asset they point at');
{
  /* Static markup, so this reads the file rather than a capture. The report is
     rendered client-side and a shared permalink previews from these tags alone;
     there is no per-result generation and none is wanted. */
  const html = readFileSync(TOOL_PATH, 'utf8');
  const meta = (attr, name) => {
    const m = html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`, 'i'));
    return m ? m[1] : null;
  };
  const og = (name) => meta('property', name);

  for (const tag of ['og:type', 'og:url', 'og:title', 'og:description', 'og:image', 'og:image:alt']) {
    ok(og(tag) !== null, `${tag} is present`);
  }
  eq(meta('name', 'twitter:card'), 'summary_large_image', 'twitter:card is summary_large_image');

  /* Absolute, because a relative og:image fails on most platforms and fails
     silently — which is how a relative path survives review. */
  ok(/^https:\/\//.test(og('og:image') || ''), 'og:image is an absolute URL', og('og:image'));
  ok((og('og:image:alt') || '').trim().length > 0, 'og:image:alt is non-empty');

  const canonical = grab(html, /<link rel="canonical" href="([^"]*)"/, '§4.4 canonical');
  eq(og('og:url'), canonical, 'og:url is the canonical page, not a per-result URL');
  eq(og('og:title'), grab(html, /<title>([^<]*)<\/title>/, '§4.4 page title'),
     'og:title matches the page title');
  /* Generic by construction: the same string the page already publishes as its
     description. These tags are identical on every shared URL, permalinks
     carrying a respondent's own answers included, so a description written
     about a result would be wrong on all of them. */
  eq(og('og:description'), meta('name', 'description'),
     'og:description is the page description, and describes the check rather than a result');

  /* The asset itself. Resolved from the repo rather than from TOOL_PATH, which
     may point at a copy of the tool taken from another commit. */
  const PUBLIC = fileURLToPath(new URL('../../public/', import.meta.url));
  const imagePath = (og('og:image') || '').replace(/^https:\/\/projexar\.com\//, '');
  ok(imagePath && !imagePath.startsWith('http'), 'og:image is served from projexar.com', og('og:image'));
  let bytes = null;
  try { bytes = readFileSync(join(PUBLIC, imagePath)); } catch (e) { bytes = null; }
  if (ok(bytes !== null, 'the og:image file exists in public/', imagePath)) {
    ok(bytes.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
       'the og:image is a PNG');
    const w = bytes.readUInt32BE(16), h = bytes.readUInt32BE(20);
    eq(`${w}x${h}`, '1200x630', 'the og:image is 1200x630');
    /* Fetched by crawlers rather than by the page, so this is a ceiling check
       against the platform limits, not a page-weight budget. */
    ok(bytes.length < 5 * 1024 * 1024,
       'the og:image is inside every platform limit', `${Math.round(bytes.length / 1024)}KB`);
  }
  /* One new asset, not two. A stray export left beside it would be published. */
  const dir = fileURLToPath(new URL('../../public/capacity-check/', import.meta.url));
  const listed = readdirSync(dir).filter((f) => !f.startsWith('.')).sort();
  ok(listed.length === 2 && listed.includes('index.html') && listed.includes('capacity-check-og.png'),
     'public/capacity-check/ carries the page and exactly one image', listed.join(', '));
}

/* ============================================ PR5 §5 band-track branches ==== */
section('§5 — the band track, on every branch the corpus holds still');
{
  /* §0.3. The corpus reports in sterling with no contractors and holds the
     process profile still, which is exactly how three defects reached
     production in this release. These are the branches it does not take, and
     every one of them is a side of a conditional this PR touches.

     Measured, not assumed: the sets below reach the scale floor and the 1.25x
     headroom, a point value and a two-ended range, all three mark colours, an
     unrated tile beside a rated one, and each rated tile suppressed on its
     own. */
  const branches = [...contractorShapes(), ...suppressionShapes().filter((x) => !x.rejects),
                    ...boundaryShapes(), ...straddleShapes()];
  const seen = { floor: 0, headroom: 0, point: 0, range: 0, unrated: 0,
                 healthy: 0, atrisk: 0, over: 0, noPm: 0, noBau: 0 };

  for (const shape of branches) {
    const cap = capture(shape);
    if (!ok(cap.ok, `${shape.id}: renders`, cap.error || '')) continue;
    assertBars(shape.id, cap.screen.tileGrid);

    const rendered = tilesOf(cap.screen.tileGrid);
    if (!rendered.some((t) => t.label.startsWith('Concurrent projects per PM'))) seen.noPm++;
    if (!rendered.some((t) => t.label.startsWith('Live projects per effective BAU FTE'))) seen.noBau++;
    for (const t of rendered) {
      if (t.rag === 'unrated') { seen.unrated++; continue; }
      if (!t.bar) continue;
      const isPm = t.label.startsWith('Concurrent projects per PM');
      const shown = shownSpan(t.value);
      /* shownSpan returns null on a figure it cannot read as a number or a
         range, which is what a lost range en-dash produces: "6.2-8.0" is one
         unparseable part rather than two. Reported rather than thrown, so the
         run reaches its own failure list and the dash assertions above are
         legible instead of buried in a stack trace. */
      if (!ok(shown !== null, `${shape.id}: the ${isPm ? 'PM' : 'BAU'} tile figure reads as a figure or a range`,
              String(t.value))) continue;
      seen[shown[1] * BAR.HEADROOM > (isPm ? BAR.MIN_PM : BAR.MIN_FTE) ? 'headroom' : 'floor']++;
      seen[shown[0] === shown[1] ? 'point' : 'range']++;
      seen[t.rag]++;
    }
  }

  /* A branch nothing reaches is a branch nothing checks. This fails rather
     than reporting a count, because the count is the whole point. */
  for (const [name, n] of Object.entries(seen)) {
    ok(n > 0, `§5: a shape reaches the "${name}" branch`, `reached ${n} times`);
  }

  /* A point value still renders as a visible mark. The BAU tile at
     contractors-0 prints one figure only where both endpoints round the same;
     the PM tile always does, so it is the case that is always there. */
  const pointBar = tilesOf(capture({ id: 'bar-point', ...FIXTURE_A }).screen.tileGrid)
    .find((t) => t.label.startsWith('Concurrent projects per PM')).bar;
  eq(pointBar.width, BAR.MIN_MARK, 'a point value renders at the minimum mark width');
  eq(pointBar.left, 75, '9.0 on a scale floored at 12 marks at 75%');
  eq(JSON.stringify(pointBar.ticks),
     JSON.stringify([{ at: 41.67, label: '5.0' }, { at: 58.33, label: '7.0' }]),
     'the PM ticks sit at 5/12 and 7/12 of the track');

  /* The contractor tile: a figure, a chip that is not a rating, and no track.
     Asserted here rather than only inside assertBars, because the tile is the
     one this PR could most easily have drawn a band on. */
  const withContractors = tilesOf(capture({ id: 'bar-unrated', ...FIXTURE_C }).screen.tileGrid);
  eq(withContractors.length, 3, 'six contractors put a third tile on the grid');
  const third = withContractors[2];
  eq(third.rag, 'unrated', 'the third tile is the unrated one');
  eq(third.bar, null, 'the unrated tile carries no band track');
  eq(withContractors.filter((t) => t.bar).length, 2, 'two tracks on the grid, not three');
}

/* ================================================ PR5 §2 section order ====== */
section('§2 — the promoted block sits after the growth ceiling, and is renamed');
{
  const html = readFileSync(TOOL_PATH, 'utf8');
  const report = between(html, '<section id="report"', '<div id="printReport">', 'web report slice');

  /* Document order, read off the markup. The screen capture cannot see this:
     SCREEN_NODES is a fixed list and allText() joins it in its own order, so a
     reorder is invisible to every digest in this file. */
  const order = [...report.matchAll(/<(?:h2 class="section-title"|div class="(hero-area|midcta|closing)")[^>]*>([^<]*)/g)]
    .map((m) => m[1] || m[2].trim())
    .filter(Boolean);
  eq(JSON.stringify(order), JSON.stringify([
    'Your capacity position',
    'hero-area',
    'What your plans would show instead',
    'midcta',
    'What your answers show',
    'Checks on your answers',
    'Your numbers',
    'closing',
  ]), '§2.1 — the comparison table and the conversion box moved up together');

  /* §2.2. Only the promoted section is renamed.

     PR7 item 5. This assertion used to read `has(report, ...)`, and `report` is
     the WEB slice — everything from <section id="report"> up to the print
     block. So it asserted the old name was gone from the half of the file PR5
     edited, and was structurally blind to the half PR5 missed. The old name
     survived in the print report's running header for two releases, and an
     independent reader working from the PDF reported it. The scope moves to
     `html`: the whole file, comments included. */
  ok(!has(html, 'What your answers can show you'),
     '§2.2 — the old name is gone from the WHOLE file, print report and comments included');
  ok(has(report, '<h2 class="section-title">What your answers show</h2>'),
     '§2.2 — the findings section keeps the name it had');

  /* §3. Three copy strings, and all three live in static markup outside every
     captured node — so without these the text diff cannot see them at all. */
  /* PR15 §5.2 supersedes the wording PR12 §2 settled. "Free for five" beside
     "14 days" reads as five days, which is why the longer form was confirmed;
     it had never reached the constant. */
  ok(has(report, '<p class="midcta-sub" data-offer="short">Free for up to five people. 14 days unlimited to start.</p>'),
     '§3.2 — the offer line, in the short form PR15 §5.2 confirmed');
  ok(!has(html, 'Free for five. 14 days'),
     '§3.2 — and the short form it replaced is gone from the whole file');
  ok(!has(html, 'Two projects free, forever'), '§3.2 — the old trial line is gone');
  /* §5.3 of PR6 settled the three routes to the report on one verb. The old
     label is asserted absent so the vocabulary cannot drift back apart. */
  ok(has(report, '>Get the full report &darr;</a>'), '§3.3 — the report button label');
  ok(!has(html, 'Download the full report'), 'PR6 §5.3 — the old download vocabulary is gone');
  ok(!has(html, 'Or take the full report first'), 'PR6 §5.3 — and so is the third label');

  /* §6. The anchor resolves to an element that exists, on this page. */
  const href = grab(report, /<p class="tile-cta"><a [^>]*href="#([^"]+)"/, '§6 tile-cta anchor');
  eq(href, 'getReport', '§6 — the download button anchors to the report section');

  /* The print report's own markup, bounded at </main>. Slicing to end of file
     sweeps in the tool's script, whose comments name these sections — which
     made the orphan check below pass on a file where the rename had been
     reverted. A guard that cannot fail is not a guard. */
  const printBlock = between(html, '<div id="printReport">', '</main>', 'print report slice');

  /* PR8 §0.14. The offer is a web-page element and the printed report is
     ask-agnostic, so this is one of the few claims that is genuinely about one
     half — and it is asserted in both directions rather than left as a presence
     check that a copy pasted into the print report would still pass. */
  ok(!has(printBlock, 'Unlimited 14-day trial'), '§0.14 — the trial line stays off the printed report');
  ok(!has(printBlock, 'Start free'), '§0.14 — and so does the trial action');

  /* PR7 item 3 — the running headers extract as text, with a separator.

     Every .p-head holds two halves. Strip the tags, as copying out of the PDF
     and every screen reader does, and without a separator they concatenate:
     "Your numbersProjexaR Capacity Check", which is the string the audit
     quoted. Assert on the STRIPPED text, because that is the failure mode —
     asserting on the markup would pass a file where the separator rendered but
     carried no character. */
  {
    const heads = [...printBlock.matchAll(/<div class="p-head">([\s\S]*?)<\/div>/g)].map((m) => m[1]);
    ok(heads.length === 6, 'all six running headers found', String(heads.length));
    /* Detect the concatenation itself rather than guessing at it from casing:
       "ProjexaR" contains a lowercase-then-uppercase pair of its own, so a
       /[a-z][A-Z]/ probe reports every header as broken. Take the first and
       last span's text and assert they are not adjacent in the stripped
       output. Heads whose second half is written at render time (page one
       carries the date) have nothing to compare statically and are covered by
       the separator assertion below. */
    const runTogether = heads.filter((h) => {
      const spans = [...h.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)]
        .map((m) => m[1].replace(/<[^>]+>/g, '').trim());
      const a = spans[0], b = spans[spans.length - 1];
      if (!a || !b || a === b) return false;
      const stripped = h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      return stripped.includes(a + b);
    }).map((h) => h.replace(/<[^>]+>/g, '').trim());
    ok(runTogether.length === 0,
       'no running header extracts as two headings run together',
       runTogether.join(' | '));
    /* The separator must carry an actual character, not be an empty element. */
    const empty = heads.filter((h) => /class="sep">\s*<\/span>/.test(h));
    ok(empty.length === 0, 'every running-header separator carries a character', String(empty.length));
  }

  /* PR7 item 5 — the class, not the instance.

     A rename that lands on screen and not in #printReport is a shape of defect,
     not a one-off: the two reports are separate markup, they are edited from
     the web report's side, and the print report is the artefact that gets
     forwarded. Every web section name must appear somewhere in the print
     report, as a running header or a heading. This is deliberately one-way —
     the print report carries pages the web report has no section for, and it
     should — so it catches drift without forbidding structure. */
  const webSections = [...report.matchAll(/<h2 class="section-title">([^<]+)<\/h2>/g)].map((m) => m[1].trim());
  ok(webSections.length >= 5, 'the web report still has its section titles to compare', String(webSections.length));
  const orphans = webSections.filter((name) => !printBlock.includes(name));
  ok(orphans.length === 0,
     'every web report section name also appears in the print report — no rename lands on one side only',
     orphans.join(' | '));
  ok(has(html, `id="${href}"`), '§6 — the anchor target exists in the markup');
  /* And it is where the spec puts it: in the first block of output tiles. */
  const firstBlock = between(report, '<section id="report"', '<div class="hero-area"', '§2 first report block');
  ok(has(firstBlock, 'class="tile-cta"'), '§6 — it sits in the first block of output tiles');
}

/* ================================================== PR5 §4 alignment ======== */
section('§4 — one width for the navy cards, the numbers grid and the CTA box');
{
  const css = readFileSync(TOOL_PATH, 'utf8');

  /* §4.1. The measure belongs to the container. Auto inline margins on a flex
     item cancel the cross-axis stretch, which is what left each .ceiling
     shrink-to-fit against its own content and the two cards different widths.
     Asserting the absence is the point: this is a fault that comes back. */
  ok(/\.hero-area\{[^}]*max-width:var\(--container-narrow\)/.test(css),
     '§4.1 — the width sits on .hero-area');
  const ceiling = (css.match(/\n\.ceiling\{[^}]*\}/) || [''])[0];
  ok(!/max-width/.test(ceiling), '§4.1 — .ceiling carries no width of its own');
  ok(!/margin:[^;]*auto/.test(ceiling), '§4.1 — and no auto inline margins to cancel the stretch');
  ok(/\.ceiling\{[\s\S]*?padding:var\(--space-8\) var\(--space-7\)/.test(css),
     '§4.1 — one padding, on the one rule both cards match');

  /* §4.2. A fixed first column, so every description starts at the same x —
     and a stacked one below the breakpoint, where a fixed track would leave
     the description a few words wide. */
  ok(/\.fact\{[^}]*grid-template-columns:var\(--fact-figure-col\) minmax\(0,1fr\)/.test(css),
     '§4.2 — Your Numbers is a two-column grid with a fixed first column');
  ok(/--fact-figure-col:\d+px/.test(css), '§4.2 — the track width is a token');
  ok(/@media \(max-width:600px\)\{\s*\.fact\{ grid-template-columns:minmax\(0,1fr\)/.test(css),
     '§4.2 — and it stacks at the mobile breakpoint');

  /* §4.3. One content width inside the conversion box; heading and button
     centred, prose left-aligned. */
  ok(/\.midcta > \*\{ max-width:var\(--midcta-measure\); margin-inline:auto; \}/.test(css),
     '§4.3 — one content width for every child of the box');
  ok(/\.midcta #ctaBody,\.midcta \.price-note\{ text-align:left; \}/.test(css),
     '§4.3 — the two prose blocks are left-aligned');
  /* Anchored on the line start: ".midcta .price-note{" is also a substring of
     the shared text-align rule above it, and matching that one instead would
     make this assertion pass on any width at all. */
  const priceNote = (css.match(/\n\.midcta \.price-note\{[^}]*\}/) || [''])[0];
  ok(!/max-width/.test(priceNote), '§4.3 — the pricing paragraph carries no width of its own');
  const midctaP = (css.match(/\n\.midcta p\{[^}]*\}/) || [''])[0];
  ok(!/max-width/.test(midctaP), '§4.3 — and neither does the prose rule');
  ok(/\.midcta\{[^}]*text-align:center/.test(css), '§4.3 — heading and button stay centred');
}

/* ============================================================== §6 Sender === */
section('§6 Sender — no new fields, and the RAG values read the adverse endpoint');
{
  const cap = capture({ id: 'sender', ...FIXTURE_A });
  if (cap.ok) {
    const KEYS = ['email', 'name', 'firstname', 'lastname', 'company', 'it_staff', 'bau_staff',
      'licence_count', 'effective_fte', 'pm_load', 'projects_per_fte', 'rag_pm', 'rag_bau',
      'headroom', 'toolset', 'budget_tracking', 'permalink', 'turnstile_token', 'ack'];
    eq(Object.keys(cap.sender).sort().join(','), KEYS.slice().sort().join(','),
       'the Sender payload gains no field and loses none');
    const o = evaluate(cap.values);
    eq(cap.sender.rag_bau, o.at[0].ragBAU, 'rag_bau is computed from the adverse endpoint');
    eq(cap.sender.effective_fte, round1(o.at[0].bauEffectiveFte),
       'effective_fte carries the adverse endpoint, and is a number rather than NaN');
    eq(cap.sender.projects_per_fte, round1(o.at[0].bauRatio), 'projects_per_fte likewise');
    ok(Number.isFinite(cap.sender.effective_fte), 'effective_fte is finite');
    ok(Number.isFinite(cap.sender.headroom), 'headroom is a signed integer');
  }
}

/* ================================================ PR8 §2 — the forwardable == */
section('PR8 §2 — the printed report, in the order a forwarded document is read');
{
  const html = readFileSync(TOOL_PATH, 'utf8');
  const printBlock = between(html, '<div id="printReport">', '</main>', 'print report slice');
  const sections = printBlock.split('<section class="page').slice(1);

  /* §2 — seven sections, asserted BY POSITION rather than by presence. A
     presence check passes on a document whose pages are in any order at all,
     and the order is most of what this section changed: provenance before the
     summary, the summary before the findings, the product last. Each section is
     identified by the first thing in it that names it — the running header
     where there is one, and the cover by the fact that it has none. */
  eq(sections.length, 7, '§2 — seven sections in the printed report');
  const nameOf = (sec) => {
    const head = sec.match(/<div class="p-head"><span>([^<]+)<\/span>/);
    return head ? head[1].trim() : '(cover)';
  };
  eq(JSON.stringify(sections.map(nameOf)), JSON.stringify([
    '(cover)',
    'Where the numbers come from',
    'In summary',
    'What your answers show',
    'What to do next',
    'Your numbers, and how they were worked out',
    'See this on your own plans',
  ]), '§2 — and they are in this order, read off the document');

  /* §2.1 — the cover carries a title and one line and nothing else. No figure,
     no rating, no ProjexaR claim. The date is the only number on it. */
  const cover = sections[0];
  ok(/^ p-cover"/.test(cover), '§2.1 — the first section is the cover');
  ok(!/<div class="p-head">/.test(cover), '§2.1 — and carries no running header');
  eq((cover.match(/<h1>/g) || []).length, 1, '§2.1 — one title');
  eq((cover.match(/<p /g) || []).length, 1, '§2.1 — and one line under it');
  ok(!/p-figure|p-table|p-rag/.test(cover), '§2.1 — no figure, no table and no rating on the cover');
  ok(!/ProjexaR/.test(cover.replace(/<!--[\s\S]*?-->/g, ' ')),
     '§2.1 — and no ProjexaR claim');

  /* PR8 §6 — the rename. "What you told us" named a verdict rather than a set
     of figures and collided with "Your numbers" two blocks up. It appeared
     twice, once on each side, and PR5's rename landing on one side only is the
     defect §5 exists for — so both sides are asserted, and the old name is
     asserted gone from the whole file rather than from either half. */
  ok(/<h2>Where you stand<\/h2>/.test(printBlock), '§6 — the printed report carries the new name');
  ok(/<h2>Where you stand<\/h2>/.test(between(html, '<section id="report"', '<div id="printReport">', '§6 web report slice')),
     '§6 — and so does the web report');
  eq((html.replace(/<!--[\s\S]*?-->/g, ' ').match(/Where you stand/g) || []).length, 2,
     '§6 — twice in the file, which is once on each side');
  ok(!has(html, 'What you told us<'), '§6 — and the old name is gone from the WHOLE file');

  /* §2.5 — the four steps are unchanged, down to the wording. */
  const stepsBlock = between(printBlock, '<ol class="p-steps">', '</ol>', '§2.5 printed steps block');
  eq((stepsBlock.match(/<li>/g) || []).length, 4, '§2.5 — still four steps');

  /* §2.7 — the product page is last and it is the only place in the report that
     says what ProjexaR does or what it costs.

     The word itself cannot be the test. The running headers carry the
     document's own name on every page, the bands statement names ProjexaR as
     the author of its own controls (PR6 §6, not one word of it may move), and
     the licence-basis sentence names it because PR7 §4.1 put contractors in
     that basis. What must appear once is the CLAIM: the price, and the
     statement of what the product does. */
  const productClaims = sections.map((sec, i) => ({
    i, priced: /id="pr-price"/.test(sec),
    pitch: /ProjexaR is being designed so that each line manager/.test(sec),
  })).filter((x) => x.priced || x.pitch);
  eq(productClaims.length, 1, '§2.7 — the product claim appears in exactly one section');
  eq(productClaims[0].i, 6, '§2.7 — and that section is the last one');

  /* PR11 §2 — the claim is written as design intent, not as a description of a
     product that exists. The copy rule cannot see this: it detects words and
     not tense, so the present-tense original is pinned absent BY VALUE, from
     the whole file rather than from the printed block, and the phrase that
     carries the intent is pinned present. A tense guard was considered and
     rejected in the PR11 report; this is the assertion that stands in for it,
     and it only ever catches this one sentence coming back. */
  ok(!has(html, 'ProjexaR works from your actual projects'),
     '§2 — the present-tense product claim is gone from the WHOLE file');
  /* Written to catch the "is set and owned" variant too. The first draft of
     this assertion pinned the report's exact words, passed, and left the screen
     CTA saying the same thing with one extra verb in the middle. */
  ok(!/commitment (is )?set and owned by their line manager/.test(html),
     '§2 — and so is the set-once framing of the BAU declaration, in either voice');

  /* The screen said it twice more than the printed report did, on both branches
     of the mid-page CTA and in its body. Pinned absent by value on the whole
     file, and the design-intent forms pinned present, because these are written
     into the script rather than the markup and no capture reaches both CTA
     branches on one shape. */
  for (const gone of ['ProjexaR works from the actual commitments',
                      'ProjexaR works from the plans themselves',
                      'Nothing needs to be built and nothing needs to be migrated',
                      /* PR15 §5.3. PR11 made this future tense to get out of a
                         present-tense claim about a product that has not
                         shipped, and the future tense turned it into a flat
                         promise instead — one the §5 feature-gating guard's
                         phrase list could not see, because it looks for
                         phrases and not for tense. The subject moves to the
                         design, which is the register the two sentences after
                         it already use, so it is neither a promise nor a claim
                         about a shipped product. */
                      'Nothing will need to be built and nothing will need to be migrated',
                      'every project plan obeys it']) {
    ok(!has(html, gone), `§2 — the present-tense CTA claim is gone: "${gone}"`);
  }
  for (const kept of ['ProjexaR is being designed to work from the actual commitments',
                      'ProjexaR is being designed to work from the plans themselves',
                      'The design needs nothing built and nothing migrated',
                      'project plan reading from that record']) {
    ok(has(html, kept), `§2 — and the design-intent form stands: "${kept}"`);
  }
  ok(/ProjexaR is being designed so that each line manager keeps the\s+BAU commitment of each person in their team up to date, and every project plan that depends on it reads\s+from that record\./
       .test(sections[6]),
     '§2 — the product page states design intent, in a form that keeps the record time-phased');

  /* §2.7 and §0.14 — no ask, anywhere in the body. */
  const printCopy = printBlock.replace(/<!--[\s\S]*?-->/g, ' ');
  for (const ask of ['Start free', 'Unlimited 14-day trial', 'Get the full report', 'free trial',
                     'book a', 'get in touch', 'talk to us', 'contact us']) {
    ok(!new RegExp(ask, 'i').test(printCopy), `§0.14 — no ask in the printed report: "${ask}"`);
  }

  /* §2.4 — the bands statement and the citation sit in the findings section,
     at the point the threshold is used, rather than in an appendix. */
  const findings = sections[3];
  ok(/id="pr-bands"/.test(findings), '§2.4 — the bands statement renders inside the findings');
  ok(findings.indexOf('id="pr-tiles"') < findings.indexOf('id="pr-bands"'),
     '§2.4 — and after the table that applies the threshold, not before it');
  ok(/id="pr-cards"/.test(findings) && /id="pr-checks"/.test(findings),
     '§2.4 — the findings and the checks are in the same section');

  /* §2.2 — provenance, and the range posture, on page one of the body. */
  const prov = sections[1];
  ok(/Every figure here is arithmetic on something you supplied\./.test(prov),
     '§2.2 — the provenance passage leads the section');
  ok(/Every external figure is named where it is used/.test(prov),
     '§2.2 — and names where the external figures come from');
  ok(/Every figure drawn from a banded answer is shown as a range and rated on the less\s+favourable end\./.test(prov.replace(/\s+/g, ' ')),
     '§2.2 — the range posture, first sentence');
  ok(/Where we could have picked a single flattering number, we did not\./.test(prov),
     '§2.2 — and the second');
  /* It is said once. It used to close the caveat paragraph six pages later. */
  eq((printCopy.match(/Where we could have picked a single flattering number/g) || []).length, 1,
     '§2.2 — and it is said once in the report, not twice');

  /* PR8 §2. No output copy names a physical page. The printed report is seven
     sections and eleven to thirteen pages depending on the shape, nothing in
     the tool knows which, and "on page 1" was a cross-reference that the
     reorder made false and that was never safe to make. Sections have names;
     pages do not.

     Read over the RENDERED output as well as the static markup — the sentence
     that carried this fault lives in pr-price, which the page writes at render
     time, so a scan of the static block alone would have passed on the file
     that shipped it. That is the §5 mistake, made once more while writing the
     guard against it. */
  const PAGE_REF = /\bon page \d|\bpages? \d+ (?:of|and)\b|\boverleaf\b/i;
  ok(!PAGE_REF.test(printCopy), '§2 — no static copy cross-references a page number');
  for (const fx of [FIXTURE_A, FIXTURE_B, FIXTURE_C, FIXTURE_D, FIXTURE_E, FIXTURE_F, FIXTURE_G]) {
    const c = capture({ id: 'pageref', ...fx });
    if (c.ok) ok(!PAGE_REF.test(renderedText(c)), '§2 — nor does anything the report renders');
  }

  /* §2.6 — the workings keep every table and every source. */
  const workings = sections[5];
  for (const id of ['pr-facts', 'pr-inputs', 'pr-formulas', 'pr-derivations', 'pr-sources',
                    'pr-costexclusions', 'pr-flexeranote', 'pr-fxnote']) {
    ok(new RegExp(`id="${id}"`).test(workings), `§2.6 — the workings still carry ${id}`);
  }

  /* PR8 §4 — the two protected epigrams survive, and the two cut ones are gone.
     Asserted over the whole file: an epigram restored on either side is the
     same regression, and §5 is the reason this is not scoped to one half. */
  /* Whitespace-normalised: these sentences are wrapped across source lines in
     the markup and across string concatenations in the script, and a guard that
     only matches the one-line form is a guard that stops working the next time
     the line reflows. */
  const fileCopy = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    /* Script and stylesheet comments too. The notes explaining these cuts quote
       the sentences they cut, which is the point of them, and a guard that
       fails on its own explanation is a guard somebody deletes. */
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'\s*\n\s*\+ '/g, '').replace(/\s+/g, ' ');
  ok(/The internal figure is a floor, not a total\./.test(fileCopy),
     '§4 — the protected epigram about the floor is still there');
  ok(/which ledger it lands in/.test(fileCopy),
     '§4 — and so is the one about which ledger it lands in');
  ok(!/read together rather than one at a time/.test(fileCopy),
     '§4 — the first cut epigram is gone');
  ok(!/keeping it current once the portfolio starts moving/.test(fileCopy),
     '§4 — and so is the second');
  /* Neither cut took a limitation with it: the claim each one sat on stays. */
  ok(/Nothing in the right-hand column requires a new system to be built\./.test(fileCopy),
     '§4 — the claim the first epigram closed is still made');
  ok(/If you do these four things in a spreadsheet and they hold, you do not need us\./.test(fileCopy),
     '§4 — and so is the concession the second one closed');

  /* PR8 §3 — the two cuts, asserted as absences of the exact strings. */
  ok(!/they compound: the fewer of them hold/.test(fileCopy),
     '§3.1 — the closing generalisation on the no-single-current-view finding is gone');
  ok(!/Two readings fit it and both are worth having/.test(fileCopy),
     '§3.2 — and the scaffolding around the ticket composition');
  ok(!/Which of the two it is changes what you would do/.test(fileCopy), '§3.2 — all of it');
  /* And neither cut took the limitation with it. */
  ok(/composition, not a deficiency/.test(fileCopy), '§3.2 — the limitation stays');
}

/* ============================================== PR8 §2.1 — the cover line === */
section('PR8 §2.1 — the cover attributes the estimates, and invents nothing');
{
  const named = capture({ id: 'cover-named', ...FIXTURE_A, }, { name: 'Jane Okonjo' });
  const anon = capture({ id: 'cover-anon', ...FIXTURE_A }, { name: null });
  if (named.ok && anon.ok) {
    /* Both branches are reachable: both name fields are optional and the gate
       validates the email and the consent box only. */
    ok(has(named.coverAfterGate, 'Prepared from estimates provided by Jane Okonjo, '),
       '§2.1 — with a name, the cover attributes the estimates to them', named.coverAfterGate);
    ok(/A directional check, not an audit\.$/.test(named.coverAfterGate),
       '§2.1 — and closes on what the document is');
    ok(/^Prepared from estimates provided on \d/.test(anon.coverAfterGate),
       '§2.1 — with no name, it attributes them to the date alone', anon.coverAfterGate);
    ok(!has(anon.coverAfterGate, 'provided by'), '§2.1 — and says "by" nobody');

    /* Do not invent an organisation name. The gate collects a company field and
       sends it to Sender; the cover must not read it, because the respondent's
       own typing is not a verified organisation and the report is a document
       they forward inside it. */
    ok(!has(named.coverAfterGate, 'Example Ltd'),
       '§2.1 — the company field does not reach the cover');
    ok(!has(named.coverAfterGate, 'reader@example.com') && !has(named.coverAfterGate, 'example.com'),
       '§2.1 — and neither does the email domain');

    /* Before the gate the name does not exist yet, so the render produces the
       no-name line rather than a blank or the word "undefined". */
    ok(/^Prepared from estimates provided on \d/.test(named.coverBeforeGate),
       '§2.1 — the line is complete before the gate runs, on the no-name branch',
       named.coverBeforeGate);
    ok(!/undefined|null|\[name\]|, \./.test(named.coverBeforeGate + anon.coverAfterGate),
       '§2.1 — neither branch leaves a placeholder on the page');
  }
}

/* ========================================== PR8 §2.3 — executive summary ==== */
section('PR8 §2.3 — three figures, money first, computed, agreeing with the findings');
{
  const cap = capture({ id: 'exec', ...FIXTURE_A });
  if (cap.ok) {
    /* Three slots, and the order is fixed: full portfolio cost, the gap to the
       sustainable pace, the internal staff cost. Money first. */
    eq(cap.print['pr-sum1head'], 'The full cost of your portfolio', '§2.3 — slot 1 is the portfolio cost');
    eq(cap.print['pr-sum2head'], 'Portfolio growth ceiling', '§2.3 — slot 2 is the growth-ceiling gap');
    eq(cap.print['pr-sum3head'], 'What the internal time on your projects costs',
       '§2.3 — slot 3 is the internal staff cost');

    /* No capacity ratio on this page. They are the mechanism and the mechanism
       belongs to the findings. */
    /* No capacity ratio is PUBLISHED here. Master §2.6 still requires the
       ceiling note to name which of the two measures binds first, and that
       names a mechanism rather than printing a figure — what must not appear is
       either rated value, or a rating word, on the page a reader reads
       standing up. */
    const summary = ['pr-sum1', 'pr-sum2', 'pr-sum3']
      .map((k) => `${cap.print[k + 'head']} ${cap.print[k + 'figure']} ${cap.print[k + 'note']}`)
      .join(' ').replace(/<[^>]*>/g, ' ');
    const ratios = tilesOf(cap.screen.tileGrid).filter((t) => t.bar).map((t) => t.value);
    ok(ratios.length > 0, '§2.3 — the shape publishes rated ratios somewhere, so this is a real test');
    for (const r of ratios) {
      ok(!has(summary, r), `§2.3 — the rated value ${r} does not appear in the summary`);
    }
    for (const w of ['Healthy', 'Watch', 'At risk']) {
      ok(!has(summary, w), `§2.3 — and neither does the rating word "${w}"`);
    }

    /* Every figure is computed, and each agrees with its appearance further in.
       A range is one figure and carries both ends. */
    /* Every figure is computed, and each agrees with the same figure where the
       report publishes it again. Compared as rendered strings: the summary
       prints the portfolio cost the way the report prints it everywhere else,
       and a figure that agrees to the penny but disagrees on the page is still
       two figures to the reader. */
    eq(cap.print['pr-sum1figure'], cap.screen.costFigure,
       '§2.3 — the portfolio cost is the same figure the cost block publishes');
    eq(cap.print['pr-sum2figure'], cap.screen.ceilingFigure,
       '§2.3 — the growth-ceiling gap is the same figure the ceiling block publishes');
    ok(has(cap.print['pr-sum1note'], cap.print['pr-sum3figure']),
       '§2.3 — and the internal staff cost is the same figure the portfolio cost is built from',
       cap.print['pr-sum3figure']);

    /* And each appears in the workings, to the endpoint, so a reader can check
       the arithmetic behind every figure on the summary page. */
    const c = cap.computed;
    const money = (lo, hi) => (lo === hi ? [lo] : [lo, hi]);
    const workings = cap.print['pr-formulas'].replace(/<[^>]*>/g, ' ').replace(/,/g, '');
    for (const n of money(c.at[0].fullPortfolioCost, c.at[1].fullPortfolioCost)) {
      ok(has(workings, String(Math.round(n))), `§2.3 — portfolio cost endpoint ${n} is in the workings`);
    }
    for (const n of money(c.at[0].internalEffortCost, c.at[1].internalEffortCost)) {
      ok(has(workings, String(Math.round(n))), `§2.3 — internal cost endpoint ${n} is in the workings`);
    }

    /* None of the three is written as a constant. Different inputs, different
       summary — on all three slots, not merely on the blob. */
    const other = capture({ id: 'exec-other', ...FIXTURE_A, live: FIXTURE_A.live + 3,
                            spend: FIXTURE_A.spend + 250000, bauStaff: FIXTURE_A.bauStaff + 4 });
    if (other.ok) {
      ok(other.print['pr-sum1figure'] !== cap.print['pr-sum1figure'],
         '§2.3 — different inputs move the portfolio cost');
      ok(other.print['pr-sum2figure'] !== cap.print['pr-sum2figure'],
         '§2.3 — and the growth-ceiling gap');
      ok(other.print['pr-sum3figure'] !== cap.print['pr-sum3figure'],
         '§2.3 — and the internal staff cost');
    }
  }

  /* A suppressed slot states the reason and does not carry the heading of a
     figure the report does not have. */
  const usd = capture({ id: 'exec-usd', ...FIXTURE_A, currency: 'USD' });
  if (usd.ok) {
    eq(usd.print['pr-sum1figure'], 'Not computed', '§2.3 — a suppressed slot says so');
    ok(has(usd.print['pr-sum1note'], 'UK data'), '§2.3 — and gives the same reason the screen gives');
    ok(!has(usd.print['pr-sum1head'], 'full cost of your portfolio'),
       '§2.3 — without claiming the figure in its heading');
  }
}

/* ================================ PR9 §4.1 — the covering note ============== */
section('PR9 §4.1 — the covering note carries the report’s own figures');
{
  /* The point of the note is that it is forwarded, and every figure in it is a
     figure the reader can check against the document it arrives with. So each
     one is asserted equal to its counterpart INSIDE the report, on every
     fixture, rather than assumed equal because the same object produced both.
     "Written from fc" is how it is built; "equals what the report published" is
     what has to be true. */
  const FIXTURES = [['8.A', FIXTURE_A], ['8.B', FIXTURE_B], ['8.C', FIXTURE_C], ['8.D', FIXTURE_D],
                    ['8.E', FIXTURE_E], ['8.F', FIXTURE_F], ['8.G', FIXTURE_G]];
  for (const [name, shape] of FIXTURES) {
    const cap = capture({ id: `note-${name}`, ...shape });
    if (!ok(cap.ok, `${name}: renders`, cap.error)) continue;
    const note = String(cap.screen.coverNote || '');
    ok(note.length > 0, `${name}: a covering note is written`);

    /* 1. The reported spend, as the printed inputs table gives it. */
    if (shape.spend !== null && shape.spend !== undefined) {
      const spend = String(cap.print['pr-inputs'].match(/<td>([^<]*\d[^<]*)<\/td>/g)
        .map((m) => m.replace(/<[^>]*>/g, ''))
        .find((x) => /^[^\d]*367,000$|^[^\d]*180,000$/.test(x)) || '');
      ok(spend !== '', `${name}: the report prints the reported spend`);
      ok(has(note, spend), `${name}: the note carries the same spend the report prints`, `${spend} | ${note}`);
    }

    /* 2. The internal staff cost. The printed executive summary's third slot is
       the counterpart, and it is a figure the reader sees on page three. */
    const internal = String(cap.print['pr-sum3figure'] || '');
    if (internal && internal !== 'Not computed') {
      ok(has(note, internal),
         `${name}: the note carries the internal cost the report publishes (${internal})`, note);
    } else {
      ok(!/staff time behind the same work/.test(note),
         `${name}: no internal-cost sentence where the report computed none`, note);
    }

    /* 3. The gap to the sustainable pace. The counterpart is the second
       executive-summary slot, which is the growth ceiling's own figure. Both
       state the same count of projects; the note states it in the sender's
       first person, so the COUNT is what is compared, not the sentence. */
    const ceiling = String(cap.print['pr-sum2figure'] || '');
    const gapNums = (ceiling.match(/\d[\d,]*/g) || []);
    const noteGap = note.match(/(?:We are running|Our band spans|We have room for)[^.]*\./);
    if (gapNums.length && /running|Room to grow|band spans/.test(ceiling)) {
      ok(!!noteGap, `${name}: the note carries a sentence about the pace`, note);
      if (noteGap) {
        const noteNums = (noteGap[0].match(/\d[\d,]*/g) || []);
        eq(noteNums.join(','), gapNums.join(','),
           `${name}: and the same figures the growth ceiling publishes`);
      }
    }
  }

  /* Named nowhere, asked for nothing. Both across the whole corpus, because a
     branch nothing renders is exactly what a fixture sweep misses. */
  let notes = 0, product = 0, ask = 0, dashes = 0, banned = 0;
  const ASK = /\b(book a|get in touch|contact us|sign up|start a trial|free trial|talk to us|arrange a)\b/i;
  for (const shape of corpus()) {
    const cap = capture(shape);
    if (!cap.ok) continue;
    const note = String(cap.screen.coverNote || '');
    if (!note) continue;
    notes++;
    if (/ProjexaR/i.test(note)) product++;
    if (ASK.test(note)) ask++;
    if (copyRuleViolations(note).length) banned++;
    /* Both dash characters. Em-dashes are barred outright; an en-dash is
       allowed only where it is doing the job it is there for, between the ends
       of a range. The endpoints carry units, so "£1.10m–£1.21m" puts an m
       against the dash rather than a digit: the same test the PR6 scan makes,
       a digit within three characters on each side. */
    if (note.includes('—')) { dashes++; continue; }
    for (let i = note.indexOf('–'); i >= 0; i = note.indexOf('–', i + 1)) {
      const near = (str) => /\d/.test(str);
      if (!(near(note.slice(Math.max(0, i - 3), i)) && near(note.slice(i + 1, i + 4)))) { dashes++; break; }
    }
  }
  ok(notes === 603, `a covering note renders on every corpus shape (${notes})`);
  eq(product, 0, 'no covering note names the product');
  eq(ask, 0, 'no covering note makes an ask');
  eq(banned, 0, 'no covering note carries a banned hedge or a price comparison');
  eq(dashes, 0, 'no covering note carries a dash aside');

  /* PR9 §5 — the note is inside the scope of the rules, not in a third blind
     spot. PR8 re-scoped the copy rule and both dash rules to read the web
     report as well as the printed one; a surface those rules do not reach is
     the same defect wearing a new name. The test is that the note's own text is
     genuinely in the blob those rules read. */
  const cap = capture({ id: 'note-scope', ...FIXTURE_A });
  const scanned = allText(cap);
  const forCopy = allText(cap, { forCopyRule: true });
  ok(has(scanned, String(cap.screen.coverNote)), 'the covering note reaches allText()');
  ok(has(forCopy, String(cap.screen.coverNote)), 'and it reaches the blob the copy rule reads');
  ok(has(scanned, String(cap.print['pr-link'] || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      .slice(0, 40)), 'and so does the printed result link');
  /* And out of the digest, which is the one comparison they are excluded from. */
  ok(!has(allText(cap, { exDigest: true }), String(cap.screen.coverNote)),
     'while the digest blob excludes it');
}

/* ================================ PR9 §4.2 — the result link =============== */
section('PR9 §4.2 — the link is issued with the report, printed in it, and round-trips');
{
  const cap = capture({ id: 'link', ...FIXTURE_A });
  const link = cap.permalink;

  /* On the confirmation screen, beside the note. */
  eq(cap.screen.noteLink, link, 'the saved link is issued on the confirmation screen');
  /* And in the printed report, as an anchor rather than as text: printed to PDF
     it stays clickable, which is the only reason it is worth printing. */
  const printed = String(cap.print['pr-link'] || '');
  ok(has(printed, `href="${link.replace(/&/g, '&amp;')}"`),
     'the printed report carries the link as an anchor', printed);
  ok(has(printed, 'produced from the answers this address carries'),
     'and says what it is for');
  /* One URL, from one function. The Sender payload, the screen and the PDF
     cannot disagree because there is nothing for them to disagree with. */
  eq(cap.sender.permalink, link, 'and the Sender payload carries the same URL');

  /* The precondition PR7 §7.4 set: the link must not drop an input. Reopened
     through the tool's own PARAMS mapping, every answer comes back and
     compute() returns an identical object. */
  const PARAMS = { companyHeadcount: 'ch', staff: 'st', pms: 'm', live: 'l', annual: 'a', spend: 'sp',
    currency: 'cu', bauStaff: 'bs', bauPercent2: 'bp', pmPercent2: 'pp', contractors: 'ct',
    ticketsPerMonth: 'tk', bauSplitEstimate: 'sx', loadedSalary: 'lc', toolset: 'tl',
    resourceVisibility: 'rv', budgetTracking: 'bt', assignmentKnowledge: 'ak' };
  const q = new URLSearchParams(link.split('?')[1]);
  eq([...q.keys()].sort().join(','), Object.values(PARAMS).sort().join(','),
     'the link carries every input the tool reads, and no more');
  const reopened = loadTool();
  for (const [id, key] of Object.entries(PARAMS)) {
    const val = q.get(key);
    if (val !== null) reopened.node(id).value = val;
  }
  const back = reopened.api.readAndValidate();
  ok(back.ok, 'the reopened link validates');
  eq(JSON.stringify(back.values), JSON.stringify(cap.values), 'every answer comes back unchanged');
  eq(JSON.stringify(reopened.api.compute(back.values)), JSON.stringify(cap.computed),
     'and compute() returns an identical object');
}

/* ================================ PR9 §3.1 — focus on a rejected gate ====== */
section('PR9 §3.1 — a rejected gate moves focus to the first failing field');
{
  /* The harness recorded focus() as a no-op until this PR, so this is a claim
     the suite could not previously read at all. Three shapes: a bad address, an
     unticked box, and both wrong at once — the last is what fixes the ORDER,
     which is the part of "first failing field" that can silently regress. */
  const CASES = [
    ['a rejected email', { email: 'not-an-address', ack: true }, 'email'],
    ['an unticked consent box', { email: 'reader@example.com', ack: false }, 'ack'],
    ['both wrong at once', { email: 'nope', ack: false }, 'email'],
  ];
  for (const [what, entry, want] of CASES) {
    const tool = loadTool();
    for (const [k, v] of Object.entries(FIXTURE_A)) tool.node(k).value = String(v);
    tool.fire('calcForm', 'submit');
    tool.focused.length = 0;
    tool.node('email').value = entry.email;
    tool.node('ack').checked = entry.ack;
    tool.fire('gateBtn', 'click');
    eq(tool.focused[0], want, `${what}: focus moves to #${want}`);
    eq(tool.sender.length, 0, `${what}: and nothing is posted to Sender`);
  }

  /* And an accepted submission moves focus nowhere and does post. */
  const tool = loadTool();
  for (const [k, v] of Object.entries(FIXTURE_A)) tool.node(k).value = String(v);
  tool.fire('calcForm', 'submit');
  tool.focused.length = 0;
  tool.node('email').value = 'reader@example.com';
  tool.node('ack').checked = true;
  tool.fire('gateBtn', 'click');
  eq(tool.focused.length, 0, 'an accepted gate moves focus nowhere');
  eq(tool.sender.length, 1, 'and posts once');
  ok(tool.node('noteBlock').hidden === false, 'and reveals the covering note');

  /* §3.2, the client half. The Worker-side cap is the control and is asserted
     separately; these are the attributes that stop a paste overflowing a field
     whose end the respondent cannot see. */
  const html = readFileSync(TOOL_PATH, 'utf8');
  for (const [id, max] of [['email', 254], ['fname', 100], ['lname', 100], ['company', 200]]) {
    const tag = (html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`)) || [''])[0];
    ok(has(tag, `maxlength="${max}"`), `#${id} carries maxlength="${max}"`, tag);
  }
  /* §3.1's other half: the message is associated with the control, not merely
     placed near it. */
  ok(/<span class="error" id="email-error">/.test(html), 'the gate’s error slot names itself');
  ok(/<input type="checkbox" id="ack" aria-describedby="ackError">/.test(html),
     'and the consent box points at its own message');
  ok(/<p id="ackError" role="alert">/.test(html), 'which announces when it appears');
}

/* ============================== PR9 §2, §3.2, §3.3 — the Worker ============ */
section('PR9 — /api/capacity-report: Turnstile, the length caps, and the comment');
{
  const WORKER = fileURLToPath(new URL('../../src/worker.js', import.meta.url));
  const src = readFileSync(WORKER, 'utf8');

  /* §3.3. The comment at worker.js:225 described the PM-tile toolset escalation
     that PR1 removed, which is how the next reader learns something false about
     the system. Master §0.8 is the rule it contradicted. */
  ok(!/the tool escalates an amber PM tile to red/.test(src),
     '§3.3 — the comment no longer states that the tool escalates on toolset');
  /* Flattened first: the sentence wraps across comment lines, and a regex
     written against one particular wrap is a regex that fails on a reflow. */
  const flatSrc = src.replace(/\n\s*\/\/ ?/g, ' ');
  ok(/PR1 removed the escalation/.test(flatSrc),
     '§3.3 — and it records that the behaviour is gone rather than deleting the paragraph');
  ok(/no toolset input reaches rag_pm/.test(flatSrc),
     '§3.3 — restating master §0.8 where the field it governs is assembled');

  /* PR11 §4 — three comment corrections in this file, none of them a behaviour
     change. Each is asserted as the false statement ABSENT and the true one
     PRESENT: absence alone passes on a deleted paragraph, and a deleted
     paragraph is how the next reader learns nothing instead of something
     false. Read off the flattened source, for the reflow reason above. */

  /* 4.1 — the segment rules. The old text named values the Worker has never
     posted, so a Sender condition written from it matches nobody. */
  ok(!/rag_pm is 'red'/.test(flatSrc) && !/both are 'green'/.test(flatSrc),
     '§4 — the segment rules are no longer stated in red, amber and green');
  ok(/rag_pm is 'At risk'/.test(flatSrc) && /both are 'Healthy'/.test(flatSrc),
     '§4 — they are stated in the words the Worker actually posts');
  ok(/No such value has ever been posted/.test(flatSrc),
     '§4 — and the correction records why the old rules matched nobody');
  ok(!/The segment rules above are stated in RAG terms/.test(flatSrc),
     '§4 — the mapping caveat is gone, because there is nothing left to map');

  /* 4.2 — headroom. Signed and unclamped since PR1: zero means one thing, and
     blank is the value carrying two. The old comment had those the wrong way
     round. It is also named as an adverse-endpoint field, which is what stops
     a future segment rule being written against it. */
  ok(!/It reads 0 both when a tile is already past its red/.test(flatSrc),
     '§4 — the clamped-headroom description is gone');
  ok(/headroom is an ADVERSE-ENDPOINT field/.test(flatSrc),
     '§4 — headroom is named as an adverse-endpoint field, as the tool payload already implies');
  ok(/signed and unclamped/i.test(flatSrc), '§4 — recorded as signed and unclamped');
  ok(/Zero means one thing/.test(flatSrc) && /Blank is the value\s+carrying two meanings/.test(flatSrc),
     '§4 — zero means one thing and blank means two, which is the way round the code has it');

  /* 4.3 — the cost-blind rule. 'tracked' is the option's value attribute and is
     never posted; the payload carries the option's display text. */
  ok(!/value other than 'tracked'/.test(flatSrc),
     "§4 — the cost-blind rule is no longer given as the bare word 'tracked'");
  ok(/Internal BAU time is budgeted and tracked/.test(flatSrc),
     '§4 — it names the display text the tool actually sends');
  ok(/The behaviour was\s+always right; only this description of it was wrong/.test(flatSrc),
     '§4 — and says explicitly that this was a comment fault, not a behaviour one');

  /* PR11 §3.2 — the consent field's destination is documented where the value
     is assembled. It had none until 10 Sep; it has one now, and the comment
     moved with the fact rather than being left to describe the old world,
     which is the whole point of §4. */
  ok(/The Sender custom field with this code was created on 10 September/.test(flatSrc),
     '§3.2 — the consent field now has a destination, recorded where the value is assembled');
  ok(!/No Sender custom field named `report_consent` exists/.test(flatSrc),
     '§3.2 — and the comment no longer says it has none');


  /* §2. One verification path in this Worker, not two: the same helper, the
     same secret binding and the same caller IP on both endpoints. */
  eq((src.match(/await verifyTurnstile\(/g) || []).length, 2,
     '§2 — both endpoints verify through the one helper');
  eq((src.match(/env\.TURNSTILE_SECRET/g) || []).length, 2, '§2 — off the same secret binding');
  ok(/return false;\s*\n\s*const body = new FormData\(\)/.test(src)
     || /if \(!token \|\| !secret\) return false;/.test(src),
     '§2 — verification fails closed on an absent token or secret');
}


/* PR11 §4.4 — the fourth comment correction, in the tool rather than the
   Worker. The straddle example named its two words in the opposite order to the
   one RAG_ORDER produces, and the code beneath it is correct. Asserted against
   the ORDERING ITSELF as well as the comment, so the two cannot drift apart
   again: whichever way the comment reads, the table has to agree with it. */
{
  const TOOL = process.env.CAPACITY_CHECK_HTML
    || fileURLToPath(new URL('../../public/capacity-check/index.html', import.meta.url));
  const src = readFileSync(TOOL, 'utf8');

  ok(!/a straddling range reads "Watch to At risk"/.test(src.replace(/\s+/g, ' ')),
     '§4 — the straddle example no longer states the opposite order to the code');
  ok(/a straddling range reads "At risk to Watch"/.test(src.replace(/\s+/g, ' ')),
     '§4 — it states the order RAG_ORDER actually produces');

  /* The code, read back. RAG_ORDER ranks the adverse end higher and ragSpan
     puts the higher rank first, so "At risk to Watch" is what a Watch/At risk
     straddle renders and "Watch to Healthy" is what the audit's own render test
     expects. Typed in from the specification, never read off the page. */
  const ORDER = { healthy: 0, atrisk: 1, over: 2 };
  const WORD = { over: 'At risk', atrisk: 'Watch', healthy: 'Healthy' };
  const span = (a, b) => (a === b ? WORD[a]
    : ORDER[a] > ORDER[b] ? `${WORD[a]} to ${WORD[b]}` : `${WORD[b]} to ${WORD[a]}`);
  eq(JSON.stringify([...src.matchAll(/var RAG_ORDER = \{ healthy:(\d), atrisk:(\d), over:(\d) \};/g)]
       .map((m) => m.slice(1, 4).join(','))[0], null), '"0,1,2"',
     '§4 — RAG_ORDER still ranks the adverse end highest');
  eq(span('atrisk', 'over'), 'At risk to Watch', '§4 — and a Watch/At risk straddle reads adverse end first');
  eq(span('healthy', 'atrisk'), 'Watch to Healthy', "§4 — matching the audit's own straddle render test");
}

/* The Worker itself, run. `cloudflare:email` does not resolve outside the
   Workers runtime, so the module is loaded with that one import replaced by a
   local stub — nothing on the capacity-report path touches it. Everything else
   is the shipped file, byte for byte.

   The Turnstile verification endpoint is MOCKED. It has to be: a real token is
   issued to a browser by Cloudflare and cannot be minted here, which is why §2
   says the last step before merge is manual and names it. What is asserted
   below is the Worker's own behaviour on each of the two answers the real
   endpoint can give. */
{
  const dir = mkdtempSync(join(tmpdir(), 'cc-worker-'));
  const WORKER = fileURLToPath(new URL('../../src/worker.js', import.meta.url));
  const stub = 'class EmailMessage { constructor(from, to, raw) { this.from = from; this.to = to; this.raw = raw; } }';
  const path = join(dir, 'worker.mjs');
  writeFileSync(path, readFileSync(WORKER, 'utf8')
    .replace('import { EmailMessage } from "cloudflare:email";', stub));
  const worker = (await import(pathToFileURL(path).href)).default;

  const env = {
    TURNSTILE_SECRET: 'test-secret',
    SENDER_API_TOKEN: 'test-token',
    SENDER_GROUP_ID: 'test-group',
    ASSETS: { fetch: async () => new Response('assets') },
  };

  const realFetch = globalThis.fetch;
  let verifies = true;
  let calls = [];
  globalThis.fetch = async (url, init) => {
    const href = String(url);
    calls.push({ url: href, init });
    if (href.includes('challenges.cloudflare.com')) {
      return new Response(JSON.stringify({ success: verifies }), { status: 200 });
    }
    return new Response(JSON.stringify({ id: 'sub_1' }), { status: 200 });
  };

  const base = capture({ id: 'worker', ...FIXTURE_A }).sender;
  const post = async (payload) => {
    calls = [];
    const res = await worker.fetch(new Request('https://projexar.com/api/capacity-report', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }), env);
    return { res, sender: calls.filter((c) => c.url.includes('api.sender.net')) };
  };
  const good = { ...base, turnstile_token: 'a-token' };

  section('PR9 §2 — Turnstile fails closed, and no Sender post is made');
  {
    verifies = false;
    const a = await post(good);
    eq(a.res.status, 403, 'a failed verification answers 403');
    eq(a.sender.length, 0, 'and nothing reaches Sender');
    eq(JSON.stringify(await a.res.clone().json()), '{"ok":false}', 'and the body says so');

    /* An absent token is the blocked-widget case, and it must take the same
       route: a control that waves through on its own failure is decoration. */
    verifies = true;
    const b = await post({ ...base, turnstile_token: '' });
    eq(b.res.status, 403, 'an absent token answers 403 too');
    eq(b.sender.length, 0, 'and nothing reaches Sender');

    const c = await post(good);
    eq(c.res.status, 200, 'a passing verification answers 200');
    eq(c.sender.length, 1, 'and posts to Sender exactly once');
    const body = JSON.parse(c.sender[0].init.body);
    eq(Object.keys(body).sort().join(','), 'email,fields,firstname,groups,lastname',
       'with the subscriber shape unchanged');

    /* §6. The Sender field contract is byte-identical: the same fifteen
       placeholders, none added, none removed, none renamed.

       This cited §0.15 until that number was withdrawn on 10 September — it was
       scoped to PR9 and was never a standing constraint. The assertion outlives
       it, and matters more now than it did: the Sender reconciliation is live
       rather than deferred, so this field set is the thing under audit, and an
       audit wants a fixed point to measure drift against. The decision it
       actually rests on is §6 of the master, which is where it now points. */
    const FIELDS = ['{{company}}', '{{it_staff}}', '{{bau_staff}}', '{{licence_count}}',
      '{{effective_fte}}', '{{pm_load}}', '{{projects_per_fte}}', '{{rag_pm}}', '{{rag_bau}}',
      '{{headroom}}', '{{toolset}}', '{{budget_tracking}}', '{{report_permalink}}',
      '{{report_consent}}', '{{report_requested_at}}'];
    eq(Object.keys(body.fields).sort().join(','), FIELDS.slice().sort().join(','),
       '§6 — the custom-field set gains nothing and loses nothing');
    eq(body.fields['{{report_permalink}}'], base.permalink, 'and the permalink survives the origin check');
    ok(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(body.fields['{{report_requested_at}}']),
       'the timestamp is in the format Sender documents, not ISO 8601');
  }

  section('PR11 §3 — a request without consent is rejected, and nothing is sent');
  {
    verifies = true;

    /* The gate the Worker did not have. `report_consent` recorded "yes" or "no"
       and the subscriber was created either way, so a crafted request without
       the tick joined the nurture group exactly like one with it.

       Absent and false are asserted separately: absent is the field simply not
       sent, false is the tick deliberately cleared, and a check written as a
       truthiness test on a missing key passes one of those and fails the other.
       Each has to answer 400 AND post nothing — the status alone would pass on
       a Worker that wrote the subscriber and then returned an error. */
    for (const [label, payload] of [
      ['absent', (() => { const p = { ...good }; delete p.ack; return p; })()],
      ['false', { ...good, ack: false }],
      /* The values a crafted request reaches for. All truthy, none of them the
         boolean the page sends, so a `!body.ack` check would wave all three
         through. This is why the Worker tests `!== true`. */
      ['the string "false"', { ...good, ack: 'false' }],
      ['the string "no"', { ...good, ack: 'no' }],
      ['0', { ...good, ack: 0 }],
      ['null', { ...good, ack: null }],
    ]) {
      const r = await post(payload);
      eq(r.res.status, 400, `consent ${label}: rejected with 400`);
      eq(r.sender.length, 0, `consent ${label}: and NOTHING reaches Sender`);
      eq(JSON.stringify(await r.res.clone().json()), '{"ok":false}',
         `consent ${label}: in the same shape as the other rejections`);
    }

    /* And the tick still gets through, recorded as the value Sender is meant to
       store. A gate that also turned away consenting respondents would satisfy
       every assertion above it. */
    const yes = await post(good);
    eq(yes.res.status, 200, 'consent given: accepted');
    eq(yes.sender.length, 1, 'and posts to Sender exactly once');
    eq(JSON.parse(yes.sender[0].init.body).fields['{{report_consent}}'], 'yes',
       'and the consent is recorded as "yes"');

    /* The rejection happens before the token is spent. Nothing is verified on a
       request that will not be served, which also means the assertions above
       are not quietly relying on Turnstile to do this job. */
    const none = await post((() => { const p = { ...good }; delete p.ack; return p; })());
    eq(none.res.status, 400, 'consent absent: still 400 with a valid token present');
    eq(calls.filter((c) => c.url.includes('challenges.cloudflare.com')).length, 0,
       'and no Turnstile verification is spent on it');
  }

  section('PR9 §3.2 — oversize is rejected by the Worker, never truncated');
  {
    verifies = true;
    /* Every capped field, one at a time, one character over. Rejection is 400
       and — the part that matters — no Sender post at all: a truncating cap
       would answer 200 and write a subscriber whose address does not exist. */
    const CAPS = {
      email: 254, firstname: 100, lastname: 100, company: 200, name: 200,
      it_staff: 64, bau_staff: 64, licence_count: 64, effective_fte: 64, pm_load: 64,
      projects_per_fte: 64, rag_pm: 64, rag_bau: 64, headroom: 64, toolset: 64,
      budget_tracking: 64, turnstile_token: 2048,
    };
    for (const [field, max] of Object.entries(CAPS)) {
      /* An oversize email still has to be a valid address, or it would be
         turned away by the format check above the caps and this would assert
         nothing about the cap. */
      const over = field === 'email'
        ? `${'a'.repeat(max - 16)}@very-long-example.com`
        : 'x'.repeat(max + 1);
      const r = await post({ ...good, [field]: over });
      eq(r.res.status, 400, `${field}: one character over the cap is rejected`);
      eq(r.sender.length, 0, `${field}: and nothing is sent to Sender`);

      const at = field === 'email'
        ? `${'a'.repeat(max - 22)}@very-long-example.com`
        : 'x'.repeat(max);
      const ok200 = await post({ ...good, [field]: at });
      eq(ok200.res.status, 200, `${field}: exactly at the cap is accepted`);
      eq(ok200.sender.length, 1, `${field}: and reaches Sender whole`);
      if (ok200.sender.length) {
        const sent = JSON.parse(ok200.sender[0].init.body);
        const seen = field === 'email' || field === 'firstname' || field === 'lastname'
          ? sent[field] : (field === 'name' ? at : sent.fields[`{{${field}}}`]);
        if (field !== 'name' && field !== 'turnstile_token') {
          eq(String(seen).length, at.length, `${field}: the value is not truncated on the way through`);
        }
      }
    }

    /* An object where a string belongs. Inside every cap by String() length,
       and "[object Object]" is not a value any of these fields can hold. */
    const obj = await post({ ...good, toolset: { evil: true } });
    eq(obj.res.status, 400, 'a nested object is rejected rather than stringified into the record');
    eq(obj.sender.length, 0, 'and nothing is sent');

    /* The permalink keeps its own rule: blanked, not rejected. The subscriber
       record and the consent still matter; only the link is lost. */
    const foreign = await post({ ...good, permalink: 'https://projexar.com.evil.com/x' });
    eq(foreign.res.status, 200, 'a foreign permalink does not reject the submission');
    eq(JSON.parse(foreign.sender[0].init.body).fields['{{report_permalink}}'], '',
       'and is blanked instead');
    const longLink = await post({ ...good, permalink: `https://projexar.com/${'x'.repeat(2100)}` });
    eq(longLink.res.status, 200, 'an oversize permalink does not reject it either');
    eq(JSON.parse(longLink.sender[0].init.body).fields['{{report_permalink}}'], '',
       'and takes the same remedy as a foreign one');
  }

  globalThis.fetch = realFetch;
}

/* ================================================= categorised text diff ==== */
const beforePath = process.argv[2];
if (beforePath) {
  section('Categorised text diff against the supplied baseline');
  const before = JSON.parse(readFileSync(beforePath, 'utf8')).shapes;
  let copyOnly = 0, numeric = 0, unchanged = 0, unexpected = 0, barOnly = 0;
  const unexpectedIds = [];
  for (const shape of shapes) {
    const b = before[shape.id], a = after[shape.id];
    if (!b || !a) { unexpected++; unexpectedIds.push(`${shape.id} (missing capture)`); continue; }
    /* The comparison that carries the PR5 invariant. A baseline written before
       the §5 track has textExBar === text, so this is a like-for-like read of
       everything that existed on both commits. */
    const bBare = b.textExBar || b.text, bBareNums = b.numbersExBar || b.numbers;
    if (bBare !== a.textExBar) {
      if (bBareNums === a.numbersExBar) copyOnly++; else numeric++;
      continue;
    }
    unchanged++;
    /* Unchanged everywhere else, and different once the track is put back:
       that is the band track and nothing else. */
    if (b.text !== a.text) barOnly++;
  }
  /* Unexpected means: a number the oracle did not account for, banned copy, or
     a NaN. Numeric change alone is not unexpected — this PR changes numbers on
     purpose, and every one of them was asserted against the oracle above. */
  unexpected += oracleMismatch + copyViolations + nanShapes;
  console.log(`  unchanged ................. ${unchanged}`);
  console.log(`  expected copy change ...... ${copyOnly}   (text differs, every number identical)`);
  console.log(`  expected numeric change ... ${numeric}   (asserted against the oracle)`);
  console.log(`  of the unchanged, gained a §5 band track ... ${barOnly}`);
  console.log(`  UNEXPECTED ................ ${unexpected}`);
  if (unexpectedIds.length) console.log('   ', unexpectedIds.join('\n    '));
}

/* The epsilon case, which 8.A used to carry and does not any more.

   PR13 moved 8.A's full portfolio cost off £1,095,000, which is what carried
   "the epsilon case does not render £1.09m". Chasing that assertion to a new
   home showed it had never been one: 1095000/1e6 multiplies to exactly 109.5,
   so it rendered £1.10m with the epsilon and without it, and the negative
   passed for a reason unrelated to its own label. Removing `+ 1e-9` from the
   tool left the entire suite green.

   £1,005,000 is a real epsilon case and is pinned here. The mutation now fails,
   which is the only evidence that an assertion about an epsilon is one. */
section('The epsilon case, pinned to a value that is actually one');
{
  const cap = capture(epsilonShape());
  if (ok(cap.ok, 'epsilon: renders', cap.error)) {
    eq(cap.computed.at[0].fullPortfolioCost, 1005000, 'epsilon: the full portfolio cost is exactly £1,005,000');
    ok(has(cap.screen.costFigure, '£1.01m'), 'epsilon: which renders as £1.01m', cap.screen.costFigure);
    ok(!/£1\.00m/.test(allText(cap)), 'epsilon: and never as £1.00m');
  }

  /* PR14 §3. The £1,005,000 case is a real one, and it is also ONE call site:
     roundN(x, 2) inside gbpBig(), reached through a salary nobody would type.
     A second case, structurally different, so that "the epsilon is pinned"
     means the epsilon rather than that one value.

     round1() on a ratio, on whole-number answers, moving a RATED tile figure.
     Seven BAU staff at the top of the 71-80% band is 5.6 effective FTE, which
     in IEEE 754 is 5.6000000000000005, so 77 ÷ 5.60 comes out
     13.749999999999998. Without the epsilon the tile publishes 13.7, where a
     reader dividing 77 by the 5.60 the workings print beside it gets 13.75 and
     rounds to 13.8. The mutation fails on this shape too, at a different call
     site and on a different kind of figure. */
  const ratio = capture(epsilonRatioShape());
  if (ok(ratio.ok, 'epsilon: the ratio case renders', ratio.error)) {
    eq(ratio.computed.at[1].bauEffectiveFte, 5.6000000000000005,
       'epsilon: 7 staff at 80% is the float a hair above 5.6');
    eq(ratio.computed.at[1].projectsPerFTE, 13.749999999999998,
       'epsilon: so the ratio lands a hair below the half');
    ok(has(ratio.screen.tileGrid, '13.8–15.5'),
       'epsilon: and the tile publishes 13.8, which is what 77 ÷ 5.60 rounds to',
       String(ratio.screen.tileGrid).replace(/<[^>]*>/g, ' '));
    ok(!has(ratio.screen.tileGrid, '13.7'), 'epsilon: never 13.7');
    ok(has(ratio.print['pr-formulas'], '77 ÷ 4.97–5.60'),
       'epsilon: with the divisor printed at the precision the division used',
       String(ratio.print['pr-formulas']).replace(/<[^>]*>/g, ' ').slice(0, 200));
  }
}

/* ========= PR13 §4 — the workings add up from the figures the page prints === */
section('PR13 §4 — every sum the workings publish reproduces from the displayed figures');
{
  /* §9.1 is the criterion this release exists for: no figure the tool publishes
     may be contradicted by another. The workings put three sums on the page,
     and until PR13 all three held by luck of the fixture values rather than by
     construction — every fixture happened to produce a whole tenth of an FTE.

     A banded project-manager share does not: five managers at 91% is 4.55.
     Left raw, the page would have printed "4.6 + 6.2" against 10.75 and
     "10.8 x £65,000" against £698,750, on fixture 8.A, which is the worked
     example the whole specification is built on. The quantities are rounded at
     source instead, per §2.3's rule, and the three sums are asserted here on a
     population wide enough that a fixture value cannot carry them.

     The BAU tile's own ratio is deliberately not in this list. It divides by the
     RAW effective FTE, so "45 ÷ 4.9" can print 9.1 where the displayed division
     gives 9.2 — a pre-existing case of the same class, reachable today on the
     straddle shapes. PR13 §5 forbids moving the BAU tile ratio, so it is
     reported rather than changed. */
  const population = [...corpus(), ...pmShareInvarianceShapes(), ...contractorShapes(),
                      ...straddleShapes(), ...boundaryShapes(), ...currencyShapes(),
                      ...budgetShapes(), ...loadedCostShapes(), ...notationShapes(),
                      ...corroborationShapes(), ...singularShapes(),
                      ...suppressionShapes().filter((x) => !x.rejects)];
  let sums = 0, checked = 0;
  for (const shape of population) {
    const cap = capture(shape);
    if (!cap.ok) continue;
    checked++;
    for (const e of [0, 1]) {
      const a = cap.computed.at[e];
      if (a.internalProjectFte === null) continue;
      sums++;
      /* 1. The internal FTE row: its two components, added. */
      const pmPart = a.pmProjectFte;
      const bauPart = a.bauEffectiveFte === null ? 0 : round1(a.bauEffectiveFte);
      eq(a.internalProjectFte, roundN(pmPart + bauPart, 1),
         `${shape.id}[${e}]: internal FTE is its two displayed components added`);
      eq(a.internalProjectFte, round1(a.internalProjectFte),
         `${shape.id}[${e}]: and is itself a displayed figure`);
      /* 2. The cost row: that figure, multiplied by the loaded cost. */
      if (a.internalEffortCost !== null) {
        eq(a.internalEffortCost, a.internalProjectFte * cap.computed.loaded.total,
           `${shape.id}[${e}]: the cost is the displayed FTE times the loaded cost`);
      }
      /* 3. The run row: "100% − <change>", on the displayed change share. */
      if (a.derivedChangeShare !== null) {
        eq(roundN(a.derivedChangeShare + a.derivedRunShare, 1), 100,
           `${shape.id}[${e}]: the displayed change and run shares add to 100`);
      }
    }
  }
  /* §0.17. A loop that ran zero times asserts nothing, and this one is filtered
     twice. Both counts are stated. */
  ok(checked > 600, 'PR13 §4: the population rendered', `${checked} shapes`);
  ok(sums > 1200, 'PR13 §4: and the sums were reached', `${sums} endpoints`);
}

/* ==================== PR13 §3 — links issued before the question existed ==== */
section('PR13 §3 — a link with no project-manager share renders what it still can');
{
  /* Links in printed reports and in Sender records carry no `pp`, because they
     were made before there was one to carry. A decoded link with no share is
     not a link answering zero and it is not one answering 100%, and treating it
     as either silently is the thing this input exists to stop. It is treated as
     unanswered: the figures that read internal project FTE are suppressed per
     master §1.1, and everything else on the link still publishes.

     Driven through the real boot path, because the form cannot reach this state
     — on the form the answer is required where it is asked. */
  const issued = capture({ id: 'pm-link', ...FIXTURE_A });
  const full = issued.permalink.split('?')[1];
  ok(/(^|&)pp=91(&|$)/.test(full), '§3 — a link issued now carries the share', full);

  const SHAPES = {
    absent: full.replace(/&pp=91/, ''),
    empty: full.replace(/&pp=91/, '&pp='),
    present: full,
    /* Not a band value. `permalink()` never writes one, so it is a hand-edited
       or truncated link; mapping it onto the nearest band would put a figure
       nobody gave into the cost calculation. */
    notaband: full.replace(/&pp=91/, '&pp=45'),
  };
  ok(SHAPES.absent !== full && SHAPES.empty !== full && SHAPES.notaband !== full,
     '§3 — the three altered links actually differ from the issued one');

  const opened = {};
  for (const [name, query] of Object.entries(SHAPES)) {
    const tool = loadTool(TOOL_PATH, { search: `?${query}` });
    const back = tool.api.readAndValidate({ reopened: true });
    opened[name] = { tool, back, c: back.ok ? tool.api.compute(back.values) : null };
    ok(back.ok, `§3 — the ${name} link renders rather than erroring`, back.firstBad || '');
    eq(tool.node('report').hidden, false, `§3 — the ${name} link shows the report`);
  }

  /* Present: nothing is suppressed and the figure is the one 8.A publishes. */
  eq(opened.present.c.noPmShare, false, '§3 — present: the share is read');
  eq(opened.present.c.at[0].internalProjectFte, 10.8, '§3 — present: internal project FTE is 8.A\'s');
  eq(opened.present.c.at[0].internalEffortCost, 702000, '§3 — present: and so is the cost');

  /* Absent, empty and a non-band value are one state: unanswered. */
  for (const name of ['absent', 'empty', 'notaband']) {
    const c = opened[name].c;
    eq(opened[name].back.values.pmPercent2, '', `§3 — ${name}: reads as no answer`);
    eq(c.noPmShare, true, `§3 — ${name}: the share is absent`);
    eq(c.at[0].pmProjectFte, null, `§3 — ${name}: no project manager FTE is invented`);
    eq(c.at[0].internalProjectFte, null, `§3 — ${name}: internal project FTE suppressed`);
    eq(c.at[0].internalEffortCost, null, `§3 — ${name}: internal effort cost suppressed`);
    eq(c.at[0].fullPortfolioCost, null, `§3 — ${name}: full portfolio cost suppressed`);
    eq(c.at[0].reportedShare, null, `§3 — ${name}: the reported share suppressed`);
    eq(c.fullCostPct, null, `§3 — ${name}: ProjexaR's share of full cost suppressed`);
    eq(c.corroboration, null, `§3 — ${name}: the corroboration check suppressed`);

    /* And nothing that does not read it goes with them. A reader following an
       old link sees what the tool can still tell them. */
    eq(c.pmLoad, 9, `§3 — ${name}: the PM tile still publishes`);
    eq(c.ragPM, 'over', `§3 — ${name}: with its rating`);
    eq(c.at[0].bauEffectiveFte, 6.2, `§3 — ${name}: the BAU tile still publishes`);
    eq(c.ragFTE, 'atrisk', `§3 — ${name}: with its rating`);
    eq(c.ceiling.value, -17, `§3 — ${name}: the growth ceiling still publishes`);
    eq(c.licenceCount, 25, `§3 — ${name}: the licence basis still publishes`);
    eq(c.yearly, 2500, `§3 — ${name}: and the quote`);
    eq(roundN(c.spendPct, 2), 0.68, `§3 — ${name}: and its share of reported spend`);
    eq(round1(c.itPercent), 3.8, `§3 — ${name}: and the IT share of the company`);
    eq(c.typicalDurationMonths, 7.2, `§3 — ${name}: and the typical project duration`);

    /* §1.1: a suppressed figure says why, where it would have been. */
    const note = opened[name].tool.node('pmShareNote');
    eq(note.hidden, false, `§3 — ${name}: the reason is shown where the cost block was`);
    ok(has(note.innerHTML, 'saved before we asked'), `§3 — ${name}: and says what is missing`);
    ok(has(note.innerHTML, 'no longer assume all of it'),
       `§3 — ${name}: and that the assumption it replaced is gone`);
    ok(has(opened[name].tool.node('pr-formulas').innerHTML, 'this link was saved before we asked for'),
       `§3 — ${name}: the workings state it too`);
    ok(has(opened[name].tool.node('pr-inputs').innerHTML, 'saved before we asked'),
       `§3 — ${name}: and the input echo does not report it as an omission`);
  }

  /* On a link that does carry the share, none of that appears. */
  eq(opened.present.tool.node('pmShareNote').hidden, true,
     '§3 — present: no missing-share note on a link that carries one');

  /* No NaN, no banned copy, on any of the four. */
  for (const name of Object.keys(SHAPES)) {
    /* `pr-inputs` is exempt from the copy rule and only from it, exactly as it
       is in allText(): it echoes the input labels and the options the
       respondent picked, and the only way to make "Estimated total IT staff"
       pass would be to misreport their answer. */
    const nodes = [...SCREEN_NODES, ...PRINT_NODES].filter((id) => id !== 'pr-inputs');
    const t = nodes
      .map((id) => opened[name].tool.node(id).innerHTML || opened[name].tool.node(id).textContent || '')
      .join(' ').replace(/<[^>]*>/g, ' ');
    ok(!badNumbers(t), `§3 — ${name}: no NaN, Infinity or undefined reaches the page`,
       (t.match(/.{0,50}(NaN|Infinity|undefined).{0,50}/) || [''])[0]);
    ok(copyRuleViolations(t).length === 0, `§3 — ${name}: copy rule`);
    /* PR6's two dash rules. This prose reaches a reader on no shape the corpus
       renders, so it is scanned here or nowhere. */
    ok(!/—/.test(t), `§3 — ${name}: no em-dash`, (t.match(/.{0,40}—.{0,40}/) || [''])[0]);
    const enDash = t.match(/.{0,3}–.{0,3}/g) || [];
    ok(enDash.every((x) => /\d.{0,3}–.{0,3}\d/.test(x)),
       `§3 — ${name}: every en-dash sits between two figures`, enDash.join(' | '));
  }
}


/* ============ PR14 §1 — the corroboration row's two outcomes ================

   The check, its branches and its card copy were right on both sides from PR7.
   The two labels in the workings row were not: a stated figure ABOVE the window
   read "Below the window" and one below it read "Above the window, stated not
   rated", on every shape, from PR1 until PR14. Measured on fixtures 8.E and
   8.F, where the window is 68.1% to 79.0% and the stated figures are 82% and
   60%.

   That is the worst place in the report for it. The cell prints the window and
   the respondent's own figure three characters apart, so a reader who accepted
   the card and turned to the workings to see how we got there found us
   contradicting ourselves about a comparison they can make in their head. It is
   §9.1's criterion exactly: a figure the tool publishes contradicted by another
   figure the tool publishes.

   DERIVED, not pinned. A pinned string would have passed against the inverted
   labels for as long as they stayed inverted, which is what every existing
   assertion over this row did for thirteen PRs. What is asserted here is that
   the direction word agrees with the comparison the same cell prints, read out
   of the cell: the window, the stated figure, and which side of it that figure
   falls on. Invert the labels again and every one of these fails. */
section('PR14 §1 — the corroboration workings row agrees with the comparison it prints');
{
  const population = [...corroborationShapes(), ...corpus(), ...pmShareInvarianceShapes(),
                      ...boundaryShapes(), ...straddleShapes(), ...budgetShapes(),
                      { id: '8.A', ...FIXTURE_A }, { id: '8.B', ...FIXTURE_B },
                      { id: '8.E', ...FIXTURE_E }, { id: '8.F', ...FIXTURE_F },
                      { id: '8.H', ...FIXTURE_H }];
  /* Every branch has to be reached, or a label could be inverted on the branch
     nothing renders. Counted per side rather than in total. */
  const seen = { above: 0, below: 0, inside: 0 };
  let rows = 0;
  for (const shape of population) {
    const cap = capture(shape);
    if (!cap.ok) continue;
    const cell = grab(cap.print['pr-formulas'],
      /<th>Corroboration window, ±3 points on the derived range<\/th><td>([\s\S]*?)<\/td><td><strong>([\s\S]*?)<\/strong>/,
      `${shape.id}: the corroboration row`, 0);
    if (cell === undefined) continue;
    const m = /<td>([\d.]+)% to ([\d.]+)%, against your ([\d.]+)%<\/td><td><strong>([^<]*)<\/strong>/.exec(cell);
    if (!ok(m !== null, `${shape.id}: the corroboration cell reads as a window and a stated figure`, cell)) continue;
    rows++;
    const [, loS, hiS, statedS, label] = m;
    const lo = Number(loS), hi = Number(hiS), stated = Number(statedS);

    /* The comparison, made on the two figures the row itself printed. */
    const above = stated > hi, below = stated < lo;
    eq(/\bAbove the window\b/.test(label), above,
       `${shape.id}: "Above the window" iff the stated ${stated}% is above ${hi}%`);
    eq(/\bBelow the window\b/.test(label), below,
       `${shape.id}: "Below the window" iff the stated ${stated}% is below ${lo}%`);
    eq(/\bInside the window\b/.test(label), !above && !below,
       `${shape.id}: "Inside the window" iff it is neither`);

    /* And the check itself lands the same way round, which is the half that was
       never wrong and is asserted so that "fixing" the row by moving the check
       fails instead of passing. */
    const state = cap.computed.corroboration;
    eq(state, above ? 'watch' : (below ? 'note' : 'healthy'),
       `${shape.id}: and the check assigns the branch the same comparison does`);

    /* §2.9's asymmetry, on the same row. Below the window is the side the
       derivation's blind spot lands on, so it carries no rating; above it is
       the Watch. The row says "stated not rated" on exactly one of them. */
    eq(/stated not rated/.test(label), below,
       `${shape.id}: the unrated qualifier sits on the below branch and only there`);

    /* The card copy, untouched and agreeing with the row. Two surfaces, one
       comparison: the defect this section exists for was the two disagreeing,
       so the assertion is that they cannot. */
    const checks = String(cap.screen.checkList) + String(cap.print['pr-checks']);
    eq(has(checks, 'We derive more change effort than you reported'), above,
       `${shape.id}: the card says we derive MORE only above the window`);
    eq(has(checks, 'We derive less change effort than you reported'), below,
       `${shape.id}: and LESS only below it`);
    eq(has(checks, 'Your two answers about the same department agree'), !above && !below,
       `${shape.id}: and that they agree only inside it`);

    if (above) seen.above++; else if (below) seen.below++; else seen.inside++;
  }
  console.log(`  corroboration rows read ... ${rows}`);
  console.log(`  above / below / inside .... ${seen.above} / ${seen.below} / ${seen.inside}`);
  /* §0.18. Generated coverage states and floors its own size. */
  ok(rows > 400, 'PR14 §1: the row rendered on a population, not on a fixture', `${rows} rows`);
  for (const [side, n] of Object.entries(seen)) {
    ok(n > 0, `PR14 §1: the ${side} branch is reached`, `${n} shapes`);
  }

  /* §1. The check is not touched. Pinned as source, because the whole defect
     was that the report could be made self-consistent by inverting the check
     instead of the labels, and that would have been the wrong repair: §2.9's
     asymmetry is deliberate and the branch assignment has been right since PR7.
     A rewrite of this expression fails here and has to be argued for. */
  const src = readFileSync(TOOL_PATH, 'utf8');
  ok(/c\.corroboration = v\.bauSplitEstimate > c\.corroborationHi \? 'watch'\s*\n\s*: \(v\.bauSplitEstimate < c\.corroborationLo \? 'note' : 'healthy'\);/
     .test(src), 'PR14 §1: the check still reads stated > hi as the Watch and stated < lo as the note');
  ok(/c\.corroborationLo\s*= round1\(c\.derivedRunShare\[0\] - CORROBORATION_TOLERANCE\);/.test(src),
     'PR14 §1: and the window is still the derived range widened outward from each endpoint');
  ok(/c\.corroborationHi\s*= round1\(c\.derivedRunShare\[1\] \+ CORROBORATION_TOLERANCE\);/.test(src),
     'PR14 §1: at both ends');

  /* §1. The WIDTH of the window, which is a different claim from which side of
     it a figure falls on, and which nothing asserted.

     CORROBORATION_TOLERANCE survived being changed from 3 to 4 with the whole
     suite green. It is not the same kind of thing as the two defensive epsilons
     §11 lists beside it: it sets the width of a window the report publishes,
     and widening it makes the check MORE permissive. The one check whose job is
     to catch us being wrong could have been quietly weakened by one character,
     and the tool and the oracle each carry their own copy of the number, so
     changing both together would have passed as well.

     8.A's derived run share is 71.1% to 76.0%, so at a tolerance of 3 the
     window is 68.1 to 79.0. The four shapes sit one point outside and one point
     inside each end, which is the only place a one-point drift is visible: the
     existing corroboration shapes state 50, 72, 90 and 95 and land the same way
     at any tolerance from 0 to 12.

     The expected outcomes are typed in from that arithmetic, not read off
     either constant. */
  {
    let edges = 0;
    for (const shape of corroborationToleranceShapes()) {
      const cap = capture(shape);
      if (!ok(cap.ok, `${shape.id}: renders`, cap.error)) continue;
      edges++;
      eq(cap.computed.derivedRunShare.join('–'), '71.1–76',
         `${shape.id}: the derived run share is the one this window is measured from`);
      eq(cap.computed.corroborationLo, 68.1, `${shape.id}: the window floor is three points below it`);
      eq(cap.computed.corroborationHi, 79, `${shape.id}: and the ceiling three points above`);
      eq(cap.computed.corroboration, shape.expect,
         `${shape.id}: stated ${shape.stated}% is ${shape.edge}, so ${shape.expect}`);
    }
    eq(edges, 4, 'PR14 §1: all four window edges were rendered');
    /* And the constant itself, so a change has to be made deliberately in both
       places and then still face the four shapes above. */
    ok(/var CORROBORATION_TOLERANCE = 3;/.test(readFileSync(TOOL_PATH, 'utf8')),
       'PR14 §1: the window is three points wide, stated in the tool');
    eq(CORROBORATION_TOLERANCE, 3, 'PR14 §1: and in the oracle, independently');
  }
}


/* ===== PR14 §2 — every printed calculation reproduces from its own operands ==

   The workings exist so a sceptical reader can redo our arithmetic. A row whose
   printed operands do not produce its printed result is therefore worse than a
   wrong figure in the body: it is the section written to be checked, failing
   the check.

   PR13 §4 asserted the three SUMS the workings publish. This asserts every
   calculation of any shape, and it found four more rows the sums assertion had
   no reach into:

     the BAU tile's own ratio      divided by the RAW effective FTE and printed
                                   the display rounding, so "45 ÷ 5.0" sat
                                   beside 9.1 where 45 ÷ 4.96 is 9.1 and
                                   45 ÷ 5.0 is 9.0. Recorded in §11 at PR13 and
                                   left, because PR13 §5 forbade moving the
                                   tile. The tile has not moved: what moved is
                                   what the row prints its divisor as.
     the contractor companion      the same divisor, one row down, named
                                   nowhere. Found by the assertion, not by
                                   reading.
     the internal effort cost      "10.8–13.0 × £69,251" against a product
                                   computed from £69,251.40. The loaded cost is
                                   1.4 × salary − 750, so four ordinary
                                   whole-pound salaries in five carry pence.
     employer NI below the         "15% × (4,000 − 5,000)" beside £0. The
     secondary threshold           arithmetic printed there answers −£150, and
                                   the floor that makes it nil was not stated.

   And one row where the result, not the operands, was wrong: the full portfolio
   cost rounded the internal effort cost with Math.round while the display
   rounded it with roundN, and at a salary of £50,001 the cost lands on
   519,385.49999999994, which the two disagree about. The page printed
   "£519,386 + £367,000" and the total beside it read £886,385.

   HOW IT WORKS, and why it is a table rather than a parser. Each row label maps
   to a regex that captures that row's own printed operands and to the
   arithmetic the cell states, written here FROM THE CELL and never from the
   tool, on oracle.mjs's rule. Rows that state rather than compute are named
   with the reason they carry no arithmetic. A label in neither list FAILS, so a
   row added later cannot arrive unchecked, and a row whose wording changes
   fails at its own regex rather than passing over an empty match (§0.17).

   Comparison is at the precision the row published, read off the printed figure
   itself: three decimals where it printed three, millions where it printed an
   m. That is the claim being made — not that our float matches theirs, but that
   a reader doing the sum on the page arrives at the figure on the page. */
section('PR14 §2 — every printed calculation in the workings reproduces from its own operands');
{
  const N = (x) => Number(String(x).replace(/[£,\s]/g, ''));
  /* Capture groups as numbers, undefined preserved: an optional group is a
     range that collapsed to one figure, which is a real state, not a miss. */
  const ops = (m) => m.slice(1).map((x) => (x === undefined ? undefined : N(x)));
  /* Half-up on the decimal value, which is what a reader does. roundN's
     epsilon is the same intent; §11 records what it is and is not for. */
  const R = (x, dp) => { const p = 10 ** dp; return Math.round(x * p + 1e-9) / p; };

  /* Every numeric literal a cell published, each with the precision and unit it
     was published in. */
  const shown = (cell) => {
    const out = [];
    const re = /(-?)£?(-?)(\d[\d,]*(?:\.\d+)?)(m)?/g;
    let m;
    while ((m = re.exec(cell))) {
      const raw = m[3], dot = raw.indexOf('.');
      out.push({ v: (m[1] || m[2] ? -1 : 1) * N(raw), dp: dot < 0 ? 0 : raw.length - dot - 1, m: !!m[4] });
    }
    return out;
  };
  const agrees = (x, s) => R(s.m ? x / 1e6 : x, s.dp) === s.v;

  const STATED = Symbol('stated');
  /* label -> [how, calc] for a calculation, or [STATED, why] for a row that
     does not carry one. `set` marks the one row whose printed figures are two
     differences in branch order rather than an ordered pair. */
  const ROWS = new Map([
    ['Effective project manager capacity on projects',
     [/^(\d[\d,]*) × (\d+)–(\d+)%$/, (o) => [o[0] * o[1] / 100, o[0] * o[2] / 100]]],
    ['Effective BAU capacity on projects',
     [/^(\d[\d,]*) × (\d+)–(\d+)%$/, (o) => [o[0] * o[1] / 100, o[0] * o[2] / 100]]],
    ['Concurrent projects per PM', [/^(\d[\d,]*) ÷ (\d[\d,]*)$/, (o) => [o[0] / o[1]]]],
    /* The row this section was written for. The divisor is printed at the
       precision the division used, so the larger divisor gives the smaller
       ratio and both ends come out. */
    ['Live projects per effective BAU FTE',
     [/^(\d[\d,]*) ÷ ([\d.,]+)(?:–([\d.,]+))?$/, (o) => [o[0] / (o[2] ?? o[1]), o[0] / o[1]]]],
    ['Live projects per delivery FTE, including contractors (unrated)',
     [/^(\d[\d,]*) ÷ \(([\d.,]+)(?:–([\d.,]+))? \+ (\d[\d,]*)\)$/,
      (o) => [o[0] / ((o[2] ?? o[1]) + o[3]), o[0] / (o[1] + o[3])]]],
    ['Typical project duration',
     [/^\((\d[\d,]*) ÷ (\d[\d,]*)\) × (\d+)$/, (o) => [o[0] / o[1] * o[2]]]],
    ['Capacity needed for tickets alone',
     [/^(\d[\d,]*) ÷ (\d[\d,]*) to (\d[\d,]*) ÷ (\d[\d,]*) a month$/, (o) => [o[0] / o[1], o[2] / o[3]]]],
    ['Run work you reported', [/^(\d[\d,]*) × (\d+)%$/, (o) => [o[0] * o[1] / 100]]],
    ['Run work that is not ticket-shaped',
     [/^([\d.,-]+) − ([\d.,]+) to ([\d.,-]+) − ([\d.,]+)$/, (o) => [o[0] - o[1], o[2] - o[3]]]],
    ['The size of your IT department, against the company',
     [/^(\d[\d,]*) ÷ (\d[\d,]*)$/, (o) => [o[0] / o[1] * 100]]],
    /* The two red thresholds print the INPUTS the divisor was built from, not
       the divisor, so a reader multiplies the same raw quantity the tool did.
       That is why these two never had the BAU tile's fault. */
    ['Red threshold, projects per PM',
     [/^([\d.]+) × (\d[\d,]*), rounded up$/, (o) => [Math.ceil(o[0] * o[1] - 1e-9)]]],
    ['Red threshold, projects per BAU FTE',
     [/^([\d.]+) × \((\d[\d,]*) × (\d+)–(\d+)%\), rounded up, at each end of the band$/,
      (o) => [Math.ceil(o[0] * (o[1] * o[2] / 100) - 1e-9), Math.ceil(o[0] * (o[1] * o[3] / 100) - 1e-9)]]],
    ['The same threshold across a year, per PM',
     [/^\((\d[\d,]*) − 1\) × \((\d[\d,]*) ÷ (\d[\d,]*)\), rounded down, \+ 1$/,
      (o) => [Math.floor((o[0] - 1) * (o[1] / o[2]) + 1e-9) + 1]]],
    ['The same threshold across a year, per BAU FTE',
     [/^\((\d[\d,]*) − 1\) and \((\d[\d,]*) − 1\), each × \((\d[\d,]*) ÷ (\d[\d,]*)\), rounded down, \+ 1$/,
      (o) => [Math.floor((o[0] - 1) * (o[2] / o[3]) + 1e-9) + 1,
              Math.floor((o[1] - 1) * (o[2] / o[3]) + 1e-9) + 1]]],
    /* The ceiling prints two sustainable paces against one annual pace, and the
       value column states the two gaps in branch order: above the pace first
       where the band straddles. Compared as a set for that reason and for that
       reason only. */
    ['Portfolio growth ceiling',
     [/^([\d.,]+)(?: to ([\d.,]+))? a year − your ([\d.,]+) a year$/,
      (o) => [Math.abs(o[0] - o[2]), Math.abs((o[1] ?? o[0]) - o[2])], 'set']],
    /* Built on the DISPLAYED components per §2.3, which is what PR13 corrected
       and what this assertion now holds in place from the other side. */
    ['Change effort implied by the staff you named',
     [/^(?:\(([\d.,]+)(?:–([\d.,]+))? \+ ([\d.,]+)(?:–([\d.,]+))?\)|([\d.,]+)(?:–([\d.,]+))?) ÷ (\d[\d,]*), on the (?:two )?time bands? you gave us$/,
      (o) => (o[0] !== undefined
        ? [(o[0] + o[2]) / o[6] * 100, ((o[1] ?? o[0]) + (o[3] ?? o[2])) / o[6] * 100]
        : [o[4] / o[6] * 100, (o[5] ?? o[4]) / o[6] * 100])]],
    ['Run effort implied by the same figures',
     [/^100% − ([\d.,]+)%(?:–([\d.,]+)%)?$/, (o) => [100 - (o[1] ?? o[0]), 100 - o[0]]]],
    /* Two branches, because below the secondary threshold the subtraction is
       negative and the figure beside it is nil: the floor is the rule, so the
       branch states the rule instead of printing arithmetic that contradicts
       its own answer. */
    ['Employer National Insurance',
     [/^(?:(\d+)% × \(([\d.,]+) − ([\d.,]+)\), the 2026\/27 secondary rate and threshold|nothing is due: your figure does not reach the 2026\/27 secondary threshold of £(5,000)), gov\.uk$/,
      (o) => (o[0] === undefined ? [0] : [o[0] / 100 * (o[1] - o[2])])]],
    ['Overhead, ProjexaR’s judgement rather than a sourced figure',
     [/^(\d+)% × ([\d.,]+), for workspace, equipment, licences, training and management$/,
      (o) => [o[0] / 100 * o[1]]]],
    ['Loaded cost per head', [/^([\d.,]+) \+ ([\d.,]+) \+ ([\d.,]+)$/, (o) => [o[0] + o[1] + o[2]]]],
    ['Internal project FTE, permanent staff only',
     [/^(?:([\d.,]+)(?:–([\d.,]+))? effective project manager FTE \+ )?(?:no project managers were reported, so )?([\d.,]+)(?:–([\d.,]+))? effective BAU FTE(?: alone)?$/,
      (o) => [(o[0] ?? 0) + o[2], (o[1] ?? o[0] ?? 0) + (o[3] ?? o[2])]]],
    /* The loaded cost carries its pence here and nowhere else, because this is
       the one row that multiplies by it. */
    ['Cost of the internal time on your projects',
     [/^([\d.,]+)(?:–([\d.,]+))? × £([\d.,]+)$/, (o) => [o[0] * o[2], (o[1] ?? o[0]) * o[2]]]],
    /* Four figures published: the pair in pounds, then the same pair in the
       notation the report uses for it. Both are checked, each at its own
       precision, which is how "one notation per figure" is held from this side. */
    ['Full portfolio cost',
     [/^£([\d.,]+) \+ £([\d.,]+) to £([\d.,]+) \+ £([\d.,]+)$/,
      (o) => [o[0] + o[1], o[2] + o[3], o[0] + o[1], o[2] + o[3]]]],
    ['Your reported spend as a share of it',
     [/^£([\d.,]+) ÷ £([\d.,]+)(?:–£([\d.,]+))?$/,
      (o) => [o[0] / (o[2] ?? o[1]) * 100, o[0] / o[1] * 100]]],
    ['ProjexaR as a share of your reported project spend',
     [/^\((\d[\d,]*) × £(\d+) × (\d+), the annual plan paid upfront\) ÷ ([\d.,]+)$/,
      (o) => [o[0] * o[1] * o[2] / o[3] * 100]]],
    ['ProjexaR as a share of your full portfolio cost',
     [/^([\d.,]+) ÷ £([\d.,]+)(?:–£([\d.,]+))?$/,
      (o) => [o[0] / (o[2] ?? o[1]) * 100, o[0] / o[1] * 100]]],

    /* Rows that state rather than compute. Each is named with why it carries no
       arithmetic a reader could redo, because "it has no rule" and "nobody
       wrote one" are the same thing to a passing run. */
    ['The divisor window, and where it sits',
     [STATED, 'the value column is ProjexaR’s declared control, not a result; the conversion its '
            + 'how column states is pinned against WORKING_DAYS in the §3.6 section']],
    ['Sustainable annual pace',
     [STATED, 'its operands are the two threshold rows above it, named rather than reprinted; the '
            + 'value is asserted against the oracle on every corpus shape']],
    ['Which measure binds first', [STATED, 'a selection between two routes; the value is a measure name']],
    ['Corroboration window, ±3 points on the derived range',
     [STATED, 'the value column is a verdict, and the comparison behind it is asserted in PR14 §1']],
    ['Median IT salary', [STATED, 'the respondent’s own figure, echoed back rather than derived']],
    ['Whether this is added to your reported spend',
     [STATED, 'the branch the budgets answer took, stated in prose']],
    ['Run and change corroboration', [STATED, 'a §1.1 suppression row: nothing was computed']],
  ]);

  const population = [...corpus(), ...reproducibilityShapes(), ...boundaryShapes(),
                      ...straddleShapes(), ...contractorShapes(), ...singularShapes(),
                      ...corroborationShapes(), ...currencyShapes(), ...budgetShapes(),
                      ...loadedCostShapes(), ...notationShapes(), ...pmShareInvarianceShapes(),
                      ...toolsetInvarianceShapes(), ...suppressionShapes().filter((x) => !x.rejects),
                      { id: '8.A', ...FIXTURE_A }, { id: '8.B', ...FIXTURE_B }, { id: '8.C', ...FIXTURE_C },
                      { id: '8.D', ...FIXTURE_D }, { id: '8.E', ...FIXTURE_E }, { id: '8.F', ...FIXTURE_F },
                      { id: '8.G', ...FIXTURE_G }, { id: '8.H', ...FIXTURE_H }, epsilonShape()];

  const strip = (x) => String(x).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  const labelsSeen = new Set();
  const bad = [];
  let shapes = 0, checked = 0, statedRows = 0, suppressed = 0;

  for (const shape of population) {
    const cap = capture(shape);
    if (!cap.ok) continue;
    shapes++;
    /* The copy rule, over a population the corpus does not contain. The nil-NI
       branch is the only wholly new sentence in this change and no other
       section renders it. */
    const violations = copyRuleViolations(allText(cap, { forCopyRule: true }));
    ok(violations.length === 0, `${shape.id}: no banned hedge or price comparison`, violations.join(', '));
    const table = String(cap.print['pr-formulas']);
    const rows = [...table.matchAll(
      /<tr><th>([\s\S]*?)<\/th><td>([\s\S]*?)<\/td><td><strong>([\s\S]*?)<\/strong><\/td><\/tr>/g)];
    /* §0.17. The rows are the operands of everything below; a table that stops
       matching must fail here, not pass silently at every row that never ran. */
    if (!ok(rows.length > 0, `${shape.id}: the workings table renders rows`, table.slice(0, 120))) continue;

    for (const [, L, H, V] of rows) {
      const label = strip(L), how = strip(H), value = strip(V);
      labelsSeen.add(label);
      const rule = ROWS.get(label);
      if (!ok(rule !== undefined, `PR14 §2: the workings row "${label}" is accounted for`,
              'every row is either a calculation with a rule or named as stated')) continue;
      if (rule[0] === STATED) { statedRows++; continue; }
      if (!/\d/.test(value) || /Not computed|Not summed/.test(value)) { suppressed++; continue; }

      const m = rule[0].exec(how);
      if (!ok(m !== null, `${shape.id}: "${label}" reads as the calculation it states`, how)) continue;
      const want = rule[1](ops(m));
      /* A division by an unanswered quantity is a suppression, not a row. */
      if (want.some((x) => !isFinite(x))) continue;
      checked++;
      const got = shown(value);
      if (/^under 0\.01%$/.test(value)) {
        ok(want.every((w) => w < 0.01), `${shape.id}: "${label}" is under the printing floor`, want.join());
        continue;
      }
      /* spanText prints one figure where both ends DISPLAY the same, so the
         collapse is judged on the displayed figure and never on the raw one. */
      const seen = [];
      for (const w of want) {
        const key = got[0] ? R(got[0].m ? w / 1e6 : w, got[0].dp) : w;
        if (!seen.some((x) => x.key === key)) seen.push({ key, w });
      }
      const list = seen.length === got.length ? seen.map((x) => x.w) : want;
      if (!ok(list.length === got.length,
              `${shape.id}: "${label}" publishes as many figures as its arithmetic produces`,
              `"${how}" => "${value}", computed ${want.join(' / ')}`)) continue;

      let wrong = null;
      if (rule[2] === 'set') {
        const pool = got.slice();
        for (const w of list) {
          const i = pool.findIndex((sm) => agrees(w, sm));
          if (i < 0) { wrong = `${w} is not among the figures published`; break; }
          pool.splice(i, 1);
        }
      } else {
        for (let i = 0; i < list.length; i++) {
          if (!agrees(list[i], got[i])) { wrong = `operands give ${list[i]}, the row published ${got[i].v}`; break; }
        }
      }
      if (!ok(wrong === null, `${shape.id}: "${label}" reproduces from its own printed operands`,
              `"${how}" => "${value}": ${wrong}`) && bad.length < 8) bad.push(`${label}: ${how} => ${value}`);
    }
  }

  console.log(`  shapes rendered ........... ${shapes}`);
  console.log(`  workings rows checked ..... ${checked}`);
  console.log(`  stated rather than computed ${statedRows}`);
  console.log(`  suppressed on the shape ... ${suppressed}`);
  console.log(`  distinct row labels ....... ${labelsSeen.size} of ${ROWS.size} in the table`);
  /* §0.18. Generated coverage states and floors its own size. */
  ok(shapes > 650, 'PR14 §2: the population rendered', `${shapes} shapes`);
  ok(checked > 14000, 'PR14 §2: and the calculations were reached', `${checked} rows`);
  /* A rule nothing reaches is a rule nobody has tested. Every label in the
     table must be produced by the population, or the table is describing rows
     that no longer render and the coverage it claims is imaginary. */
  for (const label of ROWS.keys()) {
    ok(labelsSeen.has(label), `PR14 §2: the population reaches the row "${label}"`);
  }

  /* §2. The BAU tile's RATED value is not what changed. PR13 §5 forbids moving
     it and master §2.6 ties the growth ceiling's divisor to it, so the ratio is
     still the live count over the UNROUNDED effective FTE; what changed is the
     precision the workings print that divisor at. Asserted on the shapes where
     the two are different numbers, which is the only place the claim has
     content. */
  let raw = 0;
  for (const shape of [...reproducibilityShapes(), ...straddleShapes(), ...boundaryShapes()]) {
    const cap = capture(shape);
    if (!cap.ok) continue;
    for (const e of [0, 1]) {
      const a = cap.computed.at[e];
      if (a.bauEffectiveFte === null || a.projectsPerFTE === null) continue;
      eq(a.projectsPerFTE, cap.values.live / a.bauEffectiveFte,
         `${shape.id}[${e}]: the BAU tile still divides by the unrounded effective FTE`);
      if (a.bauEffectiveFte !== round1(a.bauEffectiveFte)) {
        raw++;
        ok(a.projectsPerFTE !== cap.values.live / round1(a.bauEffectiveFte),
           `${shape.id}[${e}]: and the two divisors really are different numbers here`);
      }
    }
  }
  ok(raw > 0, 'PR14 §2: the unrounded-divisor case is reached', `${raw} endpoints`);
}

/* ============================ PR10 §2 — one reading column ================== */
section('PR10 §2 — one measure, on every prose block, in a unit that means it');
{
  const css = readFileSync(TOOL_PATH, 'utf8');

  /* The root cause §1.1 asked for, asserted as the rule rather than as the
     eight symptoms. Eight blocks carried max-width in ch at five values, and ch
     resolves against each element's own font-size, so the page rendered eight
     columns between 457px and 695px inside containers between 678px and 872px.
     One token now, in px, because a reading measure is a physical distance and
     the character count is only a proxy for it at body size. */
  ok(/--measure:\d+px;/.test(css), '§2 — the measure is one token, in px');

  /* No prose block may reintroduce a measure of its own, in any unit. This is
     the assertion that matters: every one of the eight was individually
     reasonable and the set was the fault. */
  const PROSE = ['.hero .lead', '.legend-note', '.section-sub', '.bands-note p',
                 '.ceiling .h-note', '.assumption .a-parts', '.check-item .c-body',
                 '.rag .detail > *', '.gate-sub', '.closing .verdict'];
  for (const sel of PROSE) {
    const rule = (css.match(new RegExp('\\n' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      + '\\{[^}]*\\}')) || [''])[0];
    ok(rule !== '', `§2 — ${sel} has a rule`);
    ok(/max-width:var\(--measure\)/.test(rule),
       `§2 — ${sel} takes the page's one measure`, rule.replace(/\s+/g, ' ').slice(0, 120));
  }

  /* Two rules keep a measure of their own, and neither is a reading measure.
     Named here so that "no ch anywhere" never becomes the rule by accident —
     a display headline balanced by line count is exactly what ch is for. */
  ok(/\.hero h1\{[\s\S]{0,200}max-width:19ch/.test(css),
     '§2 — the display headline keeps its line-count balance, in ch');
  ok(/--midcta-measure:\d+px;/.test(css),
     '§2 — and the conversion box keeps its alignment column, in px');

  /* The bands statement. §2 named it the case that matters most: PR7 moved it
     out from behind the email gate so a reader could see the sourcing behind a
     rating, and it was the longest block on the page set in the smallest type
     in the narrowest column — 12.5px at 60ch is 457px inside a 720px card. The
     size is the half of that the measure token cannot fix. */
  const bands = (css.match(/\n\.bands-note p\{[^}]*\}/) || [''])[0];
  ok(!/--text-caption-size/.test(bands),
     '§2 — the bands statement is no longer set at caption size', bands);
  ok(/font-size:var\(--text-body-sm-size\)/.test(bands),
     '§2 — it is set at the size the other supporting prose uses', bands);
  /* And not one word of it moved. PR6 §6 puts it out of bounds. */
  const cap = capture({ id: 'bands-measure', ...FIXTURE_A });
  ok(has(String(cap.screen.bandsStatement || ''),
         'These bands are ProjexaR’s management controls'),
     '§2 — and the statement itself is untouched');

  /* The print surface, audited on the same terms. Both of its measures were in
     em, which resolves the same way ch does: 22em at 26pt is 572pt and has
     never constrained the A4 text column, 30em at 11pt is 330pt and always has.
     Written as the distances they are, so a change of font-size no longer moves
     a column silently. */
  ok(!/max-width:\d+em/.test(css), '§2 — no font-relative measure survives in the print report');
  ok(/\.p-cover \.p-cover-line\{[^}]*max-width:\d+mm/.test(css),
     '§2 — the cover line states its width as a distance');
}

/* ======================== PR10 §4 — one notation per figure ================= */
section('PR10 §4 — one notation per figure, across all three surfaces');
{
  /* §1.3 asked whether the pounds/millions switch is one helper or several call
     sites formatting independently, because several would let a value near the
     threshold render two ways on a single shape. It is one: moneySpan() is the
     only magnitude-threshold formatter in the file, and the only formatter the
     two range-valued money quantities go through. So there is nothing to fix,
     and this is the assertion that keeps it that way — the fault it exists to
     catch is a future call site reaching for gbp() or gbpBig() directly.

     Asserted as an identity across surfaces rather than as a rule about the
     helper. The sender pastes the note into an email and attaches the PDF; the
     recipient must not meet the same number written two ways, whatever the
     implementation does. */
  const SHAPES = [['8.A', FIXTURE_A], ['8.B', FIXTURE_B], ['8.C', FIXTURE_C],
                  ['8.E', FIXTURE_E], ['8.F', FIXTURE_F], ['8.G', FIXTURE_G],
                  ...notationShapes().map((sh) => [sh.id, sh])];

  for (const [name, shape] of SHAPES) {
    const cap = capture({ id: `notation-${name}`, ...shape });
    if (!ok(cap.ok, `${name}: renders`, cap.error)) continue;

    /* The screen's cost callout carries ONE of the two quantities, and which one
       is stated by its own eyebrow: the full portfolio cost where the budget
       answer lets the two be summed, the internal effort cost alone where it
       does not. Reading the figure without reading the eyebrow is how 8.B, the
       whole non-summing path, would be compared against the wrong printed slot.
       The printed counterpart is named from the eyebrow for that reason. */
    const eyebrow = String(cap.screen.costEyebrow || '');
    const isFull = /full cost of your portfolio/i.test(eyebrow);
    const shown = String(cap.screen.costFigure || '');
    const full = isFull ? shown : '';
    if (shown && shown !== 'Not computed') {
      eq(String(cap.print[isFull ? 'pr-sum1figure' : 'pr-sum3figure'] || ''), shown,
         `${name}: the cost callout reads the same figure in the printed summary`);
      ok(has(String(cap.print['pr-compare'] || ''), shown),
         `${name}: and the same in the printed comparison`, shown);
      ok(has(String(cap.screen.compareRows || ''), shown),
         `${name}: and the same on screen below the tiles`, shown);
    }

    /* The internal staff cost. Printed summary slot three is its canonical
       rendering on every branch; the covering note is the one that leaves the
       document, and it is the surface with the most to lose from a second
       notation, because it is pasted into an email beside the attached PDF.

       On screen the internal figure moves with the budget answer, for the same
       reason the assertion above has to read the eyebrow: where the two costs
       are summed it sits inside the callout's note, and where they are not it
       IS the callout's figure. Both branches are asserted, neither is assumed. */
    const internal = String(cap.print['pr-sum3figure'] || '');
    if (internal && internal !== 'Not computed') {
      const note = String(cap.screen.coverNote || '');
      ok(has(note, internal),
         `${name}: the covering note reads the internal cost exactly as the report does`,
         `${internal} | ${note}`);
      if (isFull) {
        ok(has(String(cap.screen.costNote || ''), internal),
           `${name}: and so does the screen callout's note, under the summed figure`, internal);
        ok(has(String(cap.print['pr-sum1note'] || ''), internal),
           `${name}: and the printed summary's first note`, internal);
      } else {
        eq(shown, internal,
           `${name}: and on the non-summing path it is the callout's own figure`);
      }
    }

    /* No shape prints one quantity in two notations. Both forms of a figure
       appear together in exactly one place — the workings row that shows the
       exact pounds and then says "shown as" the rendered form — and that row is
       a deliberate, labelled disclosure of the rounding rather than a second
       notation. It is excluded by name, not by accident. */
    const surfaces = [String(cap.screen.costFigure || ''), String(cap.screen.costNote || ''),
                      String(cap.screen.compareRows || ''), String(cap.screen.coverNote || ''),
                      String(cap.print['pr-sum1figure'] || ''), String(cap.print['pr-sum1note'] || ''),
                      String(cap.print['pr-sum3figure'] || ''), String(cap.print['pr-compare'] || '')].join(' ');
    for (const q of [full, internal]) {
      if (!q || q === 'Not computed' || !/m\b/.test(q)) continue;
      /* A figure shown in millions must not also appear in whole pounds on any
         of those surfaces. Reconstructed from the raw endpoints rather than
         from the string, so this reads the arithmetic and not the output. */
      const key = q === full ? 'fullPortfolioCost' : 'internalEffortCost';
      const ends = [cap.computed.at[0][key], cap.computed.at[1][key]].filter((x) => typeof x === 'number');
      for (const raw of ends) {
        const asPounds = '£' + Math.round(raw).toLocaleString('en-GB');
        ok(!has(surfaces, asPounds),
           `${name}: ${key} in millions is not also printed in whole pounds`, asPounds);
      }
    }
  }

  /* The threshold itself, read off the pair that straddles it. The switch is on
     the DISPLAYED pound: a raw high endpoint of 999,999.54 rounds to £1,000,000
     and takes the whole range into millions, one penny of salary after a raw
     999,999.33 kept it in pounds. Round first, display, then choose the unit —
     the same rule §2.3 sets for rating a figure. */
  const [below, above] = notationShapes().map((sh) => capture({ id: sh.id, ...sh }));
  eq(String(below.print['pr-sum3figure']), '£826,666–£999,999',
     'PR10 §4 — below the threshold the internal cost prints in whole pounds');
  eq(String(above.print['pr-sum3figure']), '£0.83m–£1.00m',
     'PR10 §4 — a pound above it, the whole range moves to millions');
  eq(String(below.print['pr-sum1figure']), String(above.print['pr-sum1figure']),
     'PR10 §4 — and the full portfolio cost, far above the threshold, does not move with it');
  ok(!/£\d{3},\d{3}.*£\d\.\d\dm|£\d\.\d\dm.*£\d{3},\d{3}/.test(String(above.print['pr-sum3figure'])),
     'PR10 §4 — a range never mixes units');
  /* The one place both notations of one quantity are printed together, and the
     words that make it a disclosure rather than a contradiction. */
  ok(has(String(above.print['pr-formulas'] || ''), 'shown as'),
     'PR10 §4 — the workings row that pairs the two forms says which is which');
}

/* ================= PR10 §5 — where a reopened link lands =================== */
section('PR10 §5 — a reopened link lands on the results, with the form collapsed');
{
  /* PR9 printed the result link in the PDF, so this is the second reader's only
     route into the tool. Before this PR the link round-tripped every input and
     rendered the report, and then left the reader at the top of a fully
     expanded form with the figures 2,810px below.

     Driven through the real boot path. loadTool({search}) seeds location.search
     before the IIFE runs, which is the only way to reach prefill() at all —
     everything on that path happens during load. The existing §4.2 round-trip
     test sets the fields directly and never executes it. */
  const issued = capture({ id: 'landing', ...FIXTURE_A });
  const search = '?' + issued.permalink.split('?')[1];

  const reopened = loadTool(TOOL_PATH, { search });
  const shell = reopened.node('toolShell');
  const report = reopened.node('report');

  eq(report.hidden, false, '§5 — the report is rendered and shown');
  eq(shell.open, false, '§5.2 — the form above it is collapsed');
  ok('data-collapsible' in shell.attrs, '§5.2 — and carries the control that reopens it');
  /* Collapsed, not hidden, and still a live form: every answer is still in it,
     which is what makes the number movable rather than a picture of one. */
  eq(reopened.node('live').value, String(FIXTURE_A.live), '§5.2 — every answer is still in the form');
  const back = reopened.api.readAndValidate();
  ok(back.ok, '§5.2 — and the collapsed form still validates');
  eq(JSON.stringify(back.values), JSON.stringify(issued.values),
     '§5.2 — with the values the link carried');

  /* §5.1. Landed on, not merely rendered. Order is the assertion: scrolling
     before the collapse reads an offset off a page the reader never sees.

     `last` rather than an index, because the fault this section exists to catch
     is a path that does not scroll at all, and reading .behavior off the end of
     an empty log aborts the run with a stack trace instead of reporting it —
     the same way a lost range en-dash used to abort the §5 band-track section.
     It fails with a reason. */
  const last = (log) => log[log.length - 1] || { id: '(nothing was scrolled to)', behavior: '' };
  eq(last(reopened.scrolled).id, 'report', '§5.1 — the prefill path lands on the results');
  eq(last(reopened.scrolled).behavior, 'auto',
     '§5.1 — instantly, because the reader followed a link to a result');
  ok(shell.open === false, '§5.1 — and the collapse happened before the scroll was measured');

  /* The reopened analytics event still fires, and still on the same path. */
  ok(reopened.events.some(([n]) => n === 'capacity_check_reopened'),
     '§5 — the reopened event is unchanged');

  /* The manual path. Same reveal, same scroll, and the form is left exactly as
     the respondent left it: open. */
  const manual = loadTool();
  for (const [k, v] of Object.entries(FIXTURE_A)) manual.node(k).value = String(v);
  manual.fire('calcForm', 'submit');
  eq(manual.node('report').hidden, false, '§5 — manual submit still reveals the report');
  eq(manual.node('toolShell').open, true, '§5 — and leaves the form open, unchanged');
  eq(last(manual.scrolled).id, 'report', '§5 — manual submit still scrolls to the report');
  eq(last(manual.scrolled).behavior, 'smooth',
     '§5 — smoothly, which is the behaviour it has always had');
  ok('data-collapsible' in manual.node('toolShell').attrs,
     '§5 — and offers the same collapse control once there is something to collapse');

  /* A field nobody can see cannot be corrected. After a collapse, a rejected
     submission has to reopen the form before it moves focus into it — which is
     the PR9 §3.1 guarantee, on the one path that can now hide the field. */
  const rejected = loadTool(TOOL_PATH, { search });
  eq(rejected.node('toolShell').open, false, '§5 — collapsed after a reopen');
  rejected.node('live').value = '';
  rejected.fire('calcForm', 'submit');
  eq(rejected.node('toolShell').open, true, '§5 — a rejected submission reopens the form');
  eq(rejected.focused[rejected.focused.length - 1], 'live',
     '§5 — before moving focus to the failing field');

  /* Before this PR the summary was not in the markup at all, so the copy is
     pinned here: it sits above #report and staticWebText() does not reach it. */
  const html = readFileSync(TOOL_PATH, 'utf8');
  ok(/<details class="tool-shell" id="toolShell" open>/.test(html),
     '§5 — the form is inside a native details, open by default');
  ok(html.indexOf('<details class="tool-shell"') < html.indexOf('<section id="report"'),
     '§5 — and above the results, not below them');
  ok(has(html, 'Change any of them and run the check again'),
     '§5 — the control says the answers are still editable');
  ok(/\.tool-shell > summary\{ display:none; \}/.test(html),
     '§5 — and is not rendered until there is a report to collapse');
}


/* ============ §0.17 — the suite's own extractions are not silent ===========

   Two structural claims covering the whole capture-node population at once,
   rather than 88 converted call sites.

   `cap.print['pr-price']` is a plain property read. A node id that is not in
   PRINT_NODES yields undefined, and !has(undefined, x) is true, so a single
   mistyped id turns every claim about that node into a pass. A node that IS in
   the list but that render() never writes yields '', with the same effect —
   that exact case was caught once already, in the full-cost claim assertion
   PR8 §5 found passing vacuously.

   Both are asserted here by reading the suite's own source, which is the only
   place the set of ids actually used is written down. */
section('§0.17 — every node this suite reads exists, and is written by the tool');
{
  /* Comments are stripped before the scan. This section's own prose names
     cap.print['id'] to explain the hazard, and the first run of this check
     duly reported "id" as an unknown node. Comments discuss ids; they do not
     read them. (§0.14's ask-scan strips for the same reason; PR7 item 5 keeps
     comments IN scope, because a stale NAME in a comment is the copy someone
     reinstates. The two rules differ because the thing being looked for
     differs.) */
  const self = readFileSync(fileURLToPath(import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
  const known = new Set([...PRINT_NODES, ...SCREEN_NODES]);

  /* 1. Every id the suite names is a node the harness captures. Catches the
        typo, which is otherwise indistinguishable from an empty node. */
  const used = new Set();
  for (const m of self.matchAll(/\.(?:print|screen)\['([^']+)'\]/g)) used.add(m[1]);
  for (const m of self.matchAll(/\bcap\.screen\.([A-Za-z_$][\w$]*)/g)) used.add(m[1]);
  ok(used.size > 20, '§0.17 — the source scan found the node reads', `found ${used.size}`);
  for (const id of [...used].sort()) {
    ok(known.has(id), `§0.17 — "${id}" is a node the harness captures`);
  }

  /* 2. Every captured node is written by the tool on at least one shape. A node
        that is empty everywhere cannot fail a negative assertion, so a guard
        pointed at it is not a guard. Empty-on-purpose nodes are named, with the
        reason, rather than left to look like coverage. */
  const EMPTY_BY_DESIGN = {
    /* capture.mjs says so at the declaration: the stated reason where a
       suppressed cost block would have been, empty on every sterling shape.
       The currency shapes below are the ones that fill it. */
    costCurrencyNote: 'filled only on non-sterling shapes, which the corpus covers separately',
    /* Only a link saved before PR13 asked the project-manager share fills this,
       and no shape in this population is one — the form cannot produce the
       state. The PR13 §3 section drives it through the boot path and asserts
       the node's content, the copy rule and both dash rules on it there. */
    pmShareNote: 'filled only on a reopened link that predates the question, covered by PR13 §3',
  };
  /* The corpus is sterling-only, and several nodes exist precisely for the
     cases it does not carry: pr-fxnote is written only where the cost block is
     suppressed for currency. Scoping this to corpus() alone reported it as
     never written, which was the check being wrong rather than the node being
     dead. The special sets are small and each one unlocks a different branch. */
  const everWritten = new Set();
  const population = [...corpus(), ...currencyShapes(), ...contractorShapes(),
                      ...suppressionShapes(), ...loadedCostShapes(), ...budgetShapes(),
                      ...notationShapes(), ...singularShapes(), ...reproducibilityShapes()];
  ok(population.length > 600, '§0.17 — the population is the corpus plus the special sets',
     `${population.length} shapes`);
  let rendered = 0;
  for (const shape of population) {
    const cap = capture({ id: `n017-${shape.id}`, ...shape });
    if (!cap.ok) continue;
    rendered++;
    for (const id of PRINT_NODES) if (String(cap.print[id] || '').trim() !== '') everWritten.add(id);
    for (const id of SCREEN_NODES) if (String(cap.screen[id] || '').trim() !== '') everWritten.add(id);
  }
  /* §0.18. The population is generated — it is the 603-shape corpus plus the
     special sets — so its size is stated and floored. Counting what was
     CONSTRUCTED is not coverage: every shape here can fail validation together,
     and this loop skips on that, so a shrunk population would leave every
     "the tool writes this node" claim below resting on fewer shapes than it
     says. The two counts are different numbers and both are asserted. */
  console.log(`  §0.17 population rendered . ${rendered} of ${population.length}`);
  ok(rendered > 600, '§0.18 — the §0.17 population rendered, and states how much of it',
     `${rendered} of ${population.length}`);

  for (const id of [...known].sort()) {
    if (EMPTY_BY_DESIGN[id]) {
      ok(true, `§0.17 — "${id}" is empty by design: ${EMPTY_BY_DESIGN[id]}`);
      continue;
    }
    ok(everWritten.has(id), `§0.17 — the tool writes "${id}" on at least one shape`);
  }
}


/* ================= The specification index resolves, both ways ==============

   `claude/INDEX.md` is the map of the specification set, and its own first rule
   is that the copy in that directory is the only authoritative one. It has now
   fallen behind twice. `f8437b9` renamed the PR11 and PR12 briefs and did not
   touch the index, so two of its rows cited files that no longer existed; and
   two briefs were written without ever being placed in the directory at all.

   Nothing asserted it, because nothing in this suite had any reason to read a
   document. It is three lines and a readdir, so it is asserted now.

   WHAT THIS CATCHES: a file renamed or deleted without the index following, and
   a file added without an entry. Both directions, because a one-way check
   would have passed on the state PR14 found — every file existed, and two rows
   pointed at names that did not.

   WHAT IT CANNOT CATCH, and the PR13 brief is the standing example: a document
   that was never placed in the directory. An index can only be complete about
   the directory it describes, and a missing document leaves no trace in either.
   That is stated in INDEX.md itself and recorded in the master's §11, because a
   passing assertion here must not be read as "the set is complete". */
section('The specification index resolves, both ways');
{
  const DOCS = fileURLToPath(new URL('../../claude/', import.meta.url));
  const index = readFileSync(join(DOCS, 'INDEX.md'), 'utf8');

  /* §0.17. Both operands are extractions, and a table that stops matching would
     otherwise make every claim below true of two empty sets. */
  const onDisk = readdirSync(DOCS)
    .filter((f) => f.endsWith('.md') && f !== 'INDEX.md').sort();
  const listed = [...index.matchAll(/^\| `([^`]+\.md)` \|/gm)].map((m) => m[1]).sort();
  ok(onDisk.length > 15, 'the index directory holds the specification set', `${onDisk.length} documents`);
  ok(listed.length > 15, 'and INDEX.md lists a table of them', `${listed.length} rows`);

  for (const f of listed) {
    ok(onDisk.includes(f), `INDEX.md — the entry "${f}" resolves to a file that exists`);
  }
  for (const f of onDisk) {
    ok(listed.includes(f), `INDEX.md — the document "${f}" has an entry`);
  }
  /* No row twice. A rename half-applied leaves the old name beside the new one,
     and both would resolve for as long as the old file lingered. */
  eq(new Set(listed).size, listed.length, 'INDEX.md — no document is listed twice');
}

/* ================== PR12 §5 — one offer, stated once, everywhere ============

   The site has no build step and no partial. Every page carries its own copy,
   so nothing structural stops the next person editing one page and leaving the
   other eight contradicting it. That is what happened to the offer this PR
   replaces: the same sentence in nine places, corrected in none of them when
   the decision of 1 September changed it, and the Capacity Check ended up
   saying "Unlimited 14-day trial" beside a "Start free" link to a page
   promising two projects free forever.

   This section is the only thing that survives that next edit. It reads the
   shipped files off disk, not a captured render, because the failure it exists
   to catch is a hand edit to markup.

   Three claims, and the second and third are the ones the old suite could not
   have made:

   1. The retired offer does not come back, in any construction. The string
      list is built from the PR12 §1.1 sweep over every tracked file under
      public/, src/ and tools/, not from the seven surfaces the audit named:
      that sweep found nine, including a verbatim copy of the /product paid
      trigger on the home page and two "nobody is counted on the free plan"
      claims that the five-resource cap makes flatly false.

   2. Neither half is ever presented alone. This is the defect, not the old
      wording: "Unlimited 14-day trial" by itself reads as a trial that expires
      and "free forever" by itself understates day one, and a page carrying one
      half contradicts every page carrying the other. Asserted as: every
      mention of the fourteen days anywhere in output sits inside one of the
      canonical strings.

   3. The canonical statement is byte-identical to site.js's OFFER constant
      wherever it appears. site.js is as close to a shared source as a site
      with no build step has: it stamps [data-offer] elements at runtime. But
      the inline text is what a crawler and a reader with JavaScript off get,
      and on the Capacity Check, which does not load site.js, it is what
      everyone gets. So the inline text is the copy, and this is what stops it
      drifting from the constant that claims to govern it. */
section('PR12 §5 — the retired offer does not come back, on any page');
{
  const PUB = fileURLToPath(new URL('../../public/', import.meta.url));
  const PAGES = ['index.html', '404.html', 'start/index.html', 'pricing/index.html',
                 'product/index.html', 'contact/index.html', 'privacy/index.html',
                 'trust/index.html', 'solutions/index.html',
                 'solutions/project-online-migration/index.html',
                 'capacity-check/index.html', 'js/site.js'];

  /* The OFFER constant, read out of site.js rather than restated here. A copy
     of the wording in the suite is a second source for the thing this section
     exists to keep to one. */
  const siteJs = readFileSync(join(PUB, 'js', 'site.js'), 'utf8');
  const offerBlock = between(siteJs, 'var OFFER = {', 'var STORE_CURRENCY', '§5 OFFER constant');
  ok(offerBlock.length > 0, '§5 — the OFFER constant is found in site.js');
  const OFFER = {};
  for (const key of ['full', 'fullBilling', 'short', 'boundary']) {
    const m = offerBlock.match(new RegExp(key + ':((?:\\s*"(?:[^"\\\\]|\\\\.)*"\\s*\\+?)+)'));
    ok(m !== null, `§5 — OFFER.${key} is declared`);
    if (m) OFFER[key] = m[1].split('+').map(s => s.trim().replace(/^"|"$/g, '')).join('');
  }
  /* PR15 §5.2 supersedes PR12 §2 on this one string, and on nothing else.
     "Free for five" beside "14 days" reads as five days, which is why the
     longer form was confirmed; the confirmed wording had never reached this
     constant, so every surface taking OFFER.short was stating the short form
     that was replaced. The number this publishes is unchanged: "five" is a
     word, and 14 is still the only numeral. */
  eq(OFFER.short, 'Free for up to five people. 14 days unlimited to start.',
     '§5 — the short form is the wording PR15 §5.2 confirmed');
  ok(!/Free for five\. 14 days/.test(siteJs), '§5 — and the form it replaced is gone from the constant');
  ok(/five people with capacity recorded/.test(OFFER.full || ''),
     '§5 — the full statement uses people outside billing contexts, per PR7 §6.2');
  ok(/five managed resources/.test(OFFER.fullBilling || ''),
     '§5 — and the billing unit in them');
  /* Both halves, in both registers. A statement that lost one half would
     otherwise satisfy every assertion below. */
  for (const key of ['full', 'fullBilling']) {
    ok(/14 days of unlimited access/.test(OFFER[key] || ''), `§5 — OFFER.${key} carries the sandbox half`);
    ok(/stays free for up to five/.test(OFFER[key] || ''), `§5 — OFFER.${key} carries the free-tier half`);
  }
  const CANON = Object.values(OFFER);

  /* 1. The retired offer, in every construction the §1.1 sweep found, plus the
        constructions it would have found had they existed. "free forever" is
        banned outright: the canonical statement says "with no time limit", and
        an exception for one phrasing is how a second wording gets in. */
  const BANNED = [
    /\btwo projects\b/i, /\b2 projects\b/i, /\bfree forever\b/i, /\bforever free\b/i,
    /\btwo active projects\b/i, /\bmore than two\b/i, /\bneed a third\b/i,
    /\bnobody is counted\b/i, /\bno card until\b/i, /\bfree to start\b/i,
    /unlimited 14-day trial/i, /\b14-day trial\b/i, /\bfree for two\b/i,
    /* Feature gating, added once the free-tier position was settled: at MVP the
       free tier is the full product and the only limit is five managed
       resources. The paid plan differs by headcount, not by capability. These
       phrases are how the old model comes back, and it came back once already
       under a different axis — "unlimited projects" survived as a paid
       differentiator through the first pass of this PR because nobody was
       looking for a feature claim, only for the retired offer wording. */
    /part of the paid plan/i, /only (?:on|in) the paid/i, /paid plan only/i,
    /upgrade to (?:get|unlock)/i, /\bpaid[- ]only\b/i,
  ];

  /* Comments are IN scope. PR7 item 5 moved the stale-name assertion to the
     whole file for exactly this reason: a retired wording sitting in a comment
     is the copy the next person reinstates. The cost is that a comment cannot
     quote what it retired, and site.js's OFFER block describes the old offer
     rather than quoting it for that reason.

     Two exemptions, both named, both narrow, and neither about the offer. A
     new occurrence of either string still fails, because the allowlist matches
     the whole surrounding sentence, not the banned string. */
  const ALLOWED = [
    /* A tools-and-process card about one register read consistently. Nothing to
       do with the offer, and it predates it. */
    'so two projects can be read against each other.',
    /* Colicev's population, quoted as the paper publishes it. Caught only
       because "42 projects" ends in "2 projects"; the word boundary above
       handles it, and this stays as the record of why it was ever a hit. */
    'observations across 42 projects and 580 employees',
  ];
  for (const page of PAGES) {
    let text = readFileSync(join(PUB, page), 'utf8');
    for (const allowed of ALLOWED) text = text.split(allowed).join(' ');
    for (const banned of BANNED) {
      const hit = banned.exec(text);
      ok(hit === null, `§5 — ${page}: ${banned}`,
         hit === null ? '' : JSON.stringify(text.slice(Math.max(0, hit.index - 60), hit.index + 80)));
    }
  }

  /* 2. Neither half alone. Every mention of the fourteen days, on every page,
        sits inside a canonical string. Comments are stripped first: the
        rationale for the wording is allowed to discuss it. */
  const SANDBOX_HALF = /14 days of unlimited access|14 days unlimited to start/i;
  /* "free for up to five" covers both the confirmed short form (PR15 §5.2) and
     the full statement's "stays free for up to five"; "free for five" stays so
     the retired short form is still recognised as a free half wherever it
     survives, rather than letting its "14 days" read as an orphan. */
  const FREE_HALF = /free for up to five|free for five|free, with no time limit/i;
  for (const page of PAGES) {
    let text = readFileSync(join(PUB, page), 'utf8')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, ' ');

    /* site.js declares the canonical strings as a concatenation across three
       lines, so they do not appear contiguously in it. The block that defines
       them is not a surface that states the offer, and it is asserted above. */
    if (page === 'js/site.js') {
      const from = text.indexOf('var OFFER = {');
      const to = from < 0 ? -1 : text.indexOf('};', from);
      ok(from >= 0 && to > from, '§5 — the OFFER block is found before it is excised');
      if (from >= 0 && to > from) text = text.slice(0, from) + text.slice(to + 2);
    }

    /* A block marked data-offer-pair states the offer across several elements,
       so the guard reads it whole. It has to carry both halves to be removed;
       a block that carries one and claims the marker fails here. */
    const pair = /<(\w+)[^>]*\bdata-offer-pair\b[^>]*>([\s\S]*?)<\/\1>/g;
    let pm, pairs = 0;
    while ((pm = pair.exec(text)) !== null) {
      pairs++;
      ok(SANDBOX_HALF.test(pm[2]) && FREE_HALF.test(pm[2]),
         `§5 — ${page}: a data-offer-pair block carries both halves`,
         JSON.stringify(pm[2].replace(/\s+/g, ' ').trim().slice(0, 160)));
    }
    /* §0.17 again: a while loop over a regex that stops matching runs zero
       times and asserts nothing. The home page's stat tile is the only paired
       block on the site, so its count is stated rather than left implicit. */
    eq(pairs, page === 'index.html' ? 1 : 0, `§5 — ${page}: paired offer blocks`);
    text = text.replace(pair, ' ');

    /* The free half, page by page. Stated the other way round from the
       sandbox half above, because "free" on its own is an ordinary English
       word on these pages and cannot be scanned for: the free half is
       recognised by its offer phrasings, and a page carrying one of those has
       to carry the sandbox half somewhere too. The retired free-half
       constructions are handled by the banned list rather than here. */
    const whole = readFileSync(join(PUB, page), 'utf8').replace(/<!--[\s\S]*?-->/g, ' ');
    if (FREE_HALF.test(whole)) {
      ok(SANDBOX_HALF.test(whole), `§5 — ${page}: the free half is never stated alone either`);
    }

    for (const canon of CANON) text = text.split(canon).join(' ');
    const orphan = text.match(/\b14[ -]days?\b|\bfourteen days?\b/i);
    ok(orphan === null, `§5 — ${page}: the sandbox half is never stated alone`,
       orphan ? JSON.stringify(text.slice(Math.max(0, orphan.index - 70), orphan.index + 70)) : '');
  }

  /* 3. Every [data-offer] element's inline text is the constant it names. */
  let stamped = 0;
  for (const page of PAGES) {
    const text = readFileSync(join(PUB, page), 'utf8');
    const re = /<(\w+)[^>]*\bdata-offer="(\w+)"[^>]*>([\s\S]*?)<\/\1>/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      stamped++;
      const [, , key, inline] = m;
      ok(OFFER[key] !== undefined, `§5 — ${page}: data-offer="${key}" names a real constant`);
      eq(inline.replace(/\s+/g, ' ').trim(), OFFER[key], `§5 — ${page}: data-offer="${key}" is verbatim`);
    }
  }
  /* An exact count, not a floor. §0.17: a floor tolerates a surface losing its
     marker, which is the extraction failing, which is the thing being guarded
     against. Seven: one each on the home page, /start and /pricing, and four in
     the Capacity Check (two CTA subs, the printed statement, the boundary).
     Adding a surface means changing this number on purpose. */
  eq(stamped, 7, '§5 — the offer is stamped on exactly the surfaces that carry it');

  /* The two paid cards describe one plan, so they say one thing.

     This is PR12's own thesis one level up. The offer was corrected on nine
     surfaces and guarded, while the plan those surfaces sell was described two
     different ways on two pages: the home card listed three capabilities and
     the /pricing card listed five lines, and when the capabilities came off as
     feature gating the home card was left with two bullets under a "Most
     popular" badge. Nothing would have caught that, because every assertion in
     this suite reads one page at a time.

     The lists are compared, not the notes. The home note carries the offer and
     the /pricing note does not, which is a page difference rather than a plan
     difference: /pricing states the offer on the free card beside it. */
  {
    const cards = ['index.html', 'pricing/index.html'].map((page) => {
      const card = between(readFileSync(join(PUB, page), 'utf8'),
                           'pricing-card--featured', '</ul>', `§5 ${page} paid card`);
      return {
        page,
        desc: grab(card, /pricing-card__description"[^>]*>([\s\S]*?)<\/p>/, `§5 ${page} paid description`),
        items: [...card.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].replace(/\s+/g, ' ').trim()),
      };
    });
    ok(cards[0].items.length >= 4, '§5 — the home paid card has its feature list',
       `${cards[0].items.length} items`);
    eq(cards[0].items.join(' | '), cards[1].items.join(' | '),
       '§5 — both paid cards list the same plan, in the same order');
    eq(cards[0].desc, cards[1].desc, '§5 — and describe it in the same words');
  }

  /* The Capacity Check does not load site.js, so its copy is inline only. It is
     in PAGES above and therefore covered by all three claims; this names the
     reason, because a later reader may otherwise "tidy" it out of the list. */
  ok(!/src="\/js\/site\.js"/.test(readFileSync(join(PUB, 'capacity-check', 'index.html'), 'utf8')),
     '§5 — the Capacity Check still carries its offer copy inline, with no site.js to stamp it');

  /* PR12's numeric invariant, asserted rather than asserted-about.

     The offer statement is the first copy to put a number on the printed page
     that is not a citation figure or a control, and the printed report is a
     document a reader takes figures out of. Measured across the 603-shape
     corpus, this PR adds exactly one number to what the tool publishes, the
     offer's own 14, and removes none: the licence basis, the quote and the
     share-of-spend figures are untouched.

     Stated here as a property of the wording rather than as a baseline diff, so
     it holds on a fresh checkout with no before-capture to compare against. A
     second number in the offer copy, a resource count or a price, fails. */
  const PUBLISHES = { full: '14', fullBilling: '14', short: '14', boundary: '' };
  for (const [key, text] of Object.entries(OFFER)) {
    ok(PUBLISHES[key] !== undefined, `§5 — OFFER.${key} is accounted for in the numbers table`);
    eq(numbersIn(text).join(','), PUBLISHES[key],
       `§5 — OFFER.${key} publishes exactly the numbers accounted for`);
  }

  /* And the quote itself is untouched: the licence basis is still the whole
     count, which is what makes the boundary on the pricing page necessary. A
     free-tier subtraction spliced in here would be the one change PR12 forbids,
     and it would be invisible in copy review. */
  const tool = readFileSync(join(PUB, 'capacity-check', 'index.html'), 'utf8');
  ok(/c\.licenceCount = v\.bauStaff \+ v\.pms \+ v\.contractors;/.test(tool),
     '§5 — the licence basis is still the whole count, with no free five subtracted');
  ok(!/licenceCount\s*-\s*5|Math\.max\(0,\s*c\.licenceCount/.test(tool),
     '§5 — and nothing anywhere nets the free five off it');

  /* The offer never renders inside the price line. §4: the quoted organisation
     pays the quoted figure, and an offer sentence sharing that element is how a
     reader concludes otherwise. */
  ok(!/id="pr-price"[^>]*data-offer/.test(tool) && !/id="priceLine"[^>]*data-offer/.test(tool),
     '§5 — the offer is never stated inside the licence quote');
}

/* ============================================ PR15 — the review pass ========= */
section('PR15 §2.2 / §4.1 — no average is a fact about an individual, and one name per ratio');
{
  /* Both are sweeps over RENDERED output rather than over the file, for the
     reason PR6 gave the dash rules: a phrase on a branch no fixture reaches is
     exactly what a file-level grep misses, and a phrase in a comment is not
     copy. The probes below reach every branch that can print either
     construction — one and several project managers, each rating of the BAU
     tile, and the suppressions.

     §0.17: the probe set asserts that it rendered, so a shape the form starts
     rejecting cannot quietly empty this section. */
  const probes = [
    { id: 'pr15-a', ...FIXTURE_A }, { id: 'pr15-b', ...FIXTURE_B },
    { id: 'pr15-c', ...FIXTURE_C }, { id: 'pr15-e', ...FIXTURE_E },
    { id: 'pr15-f', ...FIXTURE_F }, { id: 'pr15-h', ...FIXTURE_H },
    { id: 'pr15-one-pm', ...FIXTURE_A, pms: 1 },
    { id: 'pr15-one-live', ...FIXTURE_A, live: 1 },
    { id: 'pr15-no-live', ...FIXTURE_A, live: 0 },
    /* The annual figure cannot sit below the live count, so a heavy portfolio moves both. */
    { id: 'pr15-heavy', ...FIXTURE_A, live: 300, annual: 400 },
    { id: 'pr15-no-bau', ...FIXTURE_A, bauStaff: 0 },
    { id: 'pr15-no-pm', ...FIXTURE_A, pms: 0 },
  ];

  /* §2.2. Each of these states a per-head or per-project average as a fact
     about one of them. The list is the constructions that were live plus the
     ones the same sentence would take if it came back reworded. */
  const AS_INDIVIDUAL = [
    /Each of your \d[\d.,]* project managers is carrying/i,
    /Each of your project managers is carrying/i,
    /Each project is getting/i,
    /Each unit of (that|your) capacity/i,
    /for each project manager\b/i,
    /\bEach \w+ is carrying \d/i,
  ];
  /* §4.1. Two names for one quantity within a screen. The tile's name is the
     one that stays, and it is asserted present so this cannot pass by the
     ratio disappearing altogether. */
  const RENAMED = [/unit of capacity/i, /unit of BAU capacity/i, /units of capacity/i];

  let rendered = 0, sawRatio = 0, sawCaseload = 0;
  for (const shape of probes) {
    const cap = capture(shape);
    if (!ok(cap.ok, `${shape.id}: renders`, cap.error)) continue;
    rendered++;
    const out = allText(cap);
    for (const re of AS_INDIVIDUAL) {
      const hit = re.exec(out);
      ok(hit === null, `§2.2 — ${shape.id}: no average stated as a fact about an individual: ${re}`,
         hit === null ? '' : JSON.stringify(out.slice(Math.max(0, hit.index - 70), hit.index + 90)));
    }
    for (const re of RENAMED) {
      const hit = re.exec(out);
      ok(hit === null, `§4.1 — ${shape.id}: "unit of capacity" appears nowhere: ${re}`,
         hit === null ? '' : JSON.stringify(out.slice(Math.max(0, hit.index - 70), hit.index + 90)));
    }
    /* The positive half. An absence sweep alone would pass on a report that
       stopped publishing either quantity, which is §0.17's negative-test
       shape: the ratio still has to be named, in the tile's words, and the
       caseload still has to be stated as an average where there is one. */
    if (cap.computed.at[0].projectsPerFTE !== null && cap.values.live > 0) {
      sawRatio++;
      ok(/live projects for every effective BAU FTE/.test(out),
         `§4.1 — ${shape.id}: the ratio is still published, under the tile's own name`);
    }
    if (cap.computed.pmLoad !== null && cap.values.live > 0 && cap.values.pms > 1) {
      sawCaseload++;
      ok(/between them, an average of/.test(out),
         `§2.2 — ${shape.id}: the caseload is still published, as an average`);
    }
  }
  eq(rendered, probes.length, '§2.2/§4.1 — every probe rendered');
  ok(sawRatio >= 6, '§4.1 — the ratio branch was reached', String(sawRatio));
  ok(sawCaseload >= 5, '§2.2 — the several-managers branch was reached', String(sawCaseload));

  /* The singular keeps its own sentence, because "an average of 9 each" of one
     manager is not a sentence anyone writes. PR3 §3.5's rule, applied to the
     wording PR15 introduced. */
  const one = capture({ id: 'pr15-one-pm-text', ...FIXTURE_A, pms: 1 });
  if (ok(one.ok, 'pr15-one-pm-text: renders', one.error)) {
    const t = allText(one);
    ok(/Your project manager is carrying/.test(t),
       '§2.2 — at one manager the singular takes its own opening');
    /* Scoped to the caseload sentence rather than to the whole report: "the
       gap between them" and "the 170-320 window between them" are unrelated
       and predate this. The pattern names the construction, not the words. */
    ok(!/managers are carrying|between them, an average of/.test(t),
       '§2.2 — and there is nothing for them to be carried between');
  }
}

section('PR15 §3.1 — the measure is centred inside every navy card, and the cap has not moved');
{
  const css = readFileSync(TOOL_PATH, 'utf8');

  /* The cap itself. PR10's root cause was five nominal measures across four
     type sizes producing eight columns, so a per-block exception here is that
     fault starting again — which is why this is pinned by value and the
     centring is asserted separately from it. */
  ok(/--measure:660px;/.test(css), '§3.1 — the cap is unchanged at 660px');

  /* The three navy grounds, and every prose block on them. Each rule is
     extracted first and asserted found (§0.17): a renamed selector would
     otherwise make all three of these pass over an empty string. */
  const NAVY = [
    ['.ceiling .h-note', 'the growth-ceiling and full-cost cards'],
    ['.assumption', 'the loaded-cost block inside the full-cost card'],
    ['.assumption .a-parts', 'the salary parts on it'],
    ['.closing .verdict', 'the closing verdict'],
  ];
  for (const [sel, what] of NAVY) {
    const rule = (css.match(new RegExp('\\n' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{[^}]*\\}')) || [''])[0];
    ok(rule.length > 0, `§3.1 — the ${sel} rule is found before it is read`);
    ok(/max-width:var\(--measure\)/.test(rule), `§3.1 — ${what} takes the one measure`);
    ok(/margin-inline:auto/.test(rule), `§3.1 — and centres it, so the slack falls equally either side`);
  }

  /* §3.1's second half. The rule and the salary input spanned the card while
     the text beside them spanned the measure, which is what made the
     asymmetry visible rather than merely present. They agree now because the
     measure sits on the block that carries all three. */
  const assumption = (css.match(/\n\.assumption\{[^}]*\}/) || [''])[0];
  ok(/border-top/.test(assumption) && /max-width:var\(--measure\)/.test(assumption),
     '§3.1 — the rule and the text it sits above share one width');

  /* And the printed report does not inherit any of it, which is asserted
     rather than assumed. #report is display:none in @media print, the print
     surface sets its columns as distances in mm and pt (PR10 §1.1), and the
     one mention of --measure past the @media print boundary is the comment
     saying the cover line is deliberately not on it. */
  const printAt = css.indexOf('@media print{');
  ok(printAt > 0, '§3.1 — the print block is found');
  const printCss = css.slice(printAt, css.indexOf('\n</style>', printAt));
  ok(!/max-width:var\(--measure\)/.test(printCss),
     '§3.1 — no printed rule takes the screen measure');
  ok(/#report\{ display:none !important;|\.hero,#tool,#report\{ display:none !important; \}/.test(printCss),
     '§3.1 — and the screen report, navy cards included, does not print at all');
}

section('PR15 §1.4 — the question count is computed, not written');
{
  const html = readFileSync(TOOL_PATH, 'utf8');
  /* The template and the fallback are both asserted: the fallback is what a
     reader with no script sees, so it has to be a true sentence today rather
     than a template with a placeholder in it. */
  ok(/data-count-template="[^"]*All \{n\} shape your report/.test(html),
     '§1.4 — the sentence is a template with the count substituted');
  ok(/id="toolsLegendNote"[^>]*>How that dependency is planned, seen and costed\. All four shape your report/.test(html),
     '§1.4 — and the no-script fallback states the count that is true today');
  /* Counted from the fields actually present, so a fifth question moves it. */
  const fieldset = between(html, '<fieldset class="fieldset" id="toolsFieldset">', '</fieldset>',
                           '§1.4 tools fieldset');
  ok(fieldset.length > 0, '§1.4 — the fieldset is found before its fields are counted');
  const fields = (fieldset.match(/class="field[ "]/g) || []).length;
  eq(fields, 4, '§1.4 — four questions today, which is what the fallback says');
  ok(/set\.querySelectorAll\('\.field'\)\.length/.test(html),
     '§1.4 — and the rendered count comes from the fields, not from a constant');
  ok(/if\(!tpl \|\| n < 1/.test(html),
     '§1.4 — with a count of nothing left alone rather than published (§0.17)');
}

section('PR15 addendum §1 — the Panko claim states only what the source supports');
{
  /* The claim we published was contradicted by the paper we hung it on, in the
     one place in the findings carrying an inline attribution, and in the
     direction that favoured our argument. The banned list is the retired claim
     plus the two neighbouring claims the source also refuses, because a
     correction that only pins the exact retired sentence is a regression guard
     for one string rather than a guard on the claim (PR11's lesson, §11). */
  const excel = capture({ id: 'panko', ...FIXTURE_A, toolset: 'excel' });
  if (ok(excel.ok, 'panko: renders', excel.error)) {
    const out = allText(excel);
    for (const banned of [
      /materially higher error rate/i,
      /more error[- ]prone than/i,
      /spreadsheets? (are|is) (inherently )?(more )?(error|unreliable)/i,
      /errors? feed (your |their )?decisions/i,
    ]) {
      const hit = banned.exec(out);
      ok(hit === null, `addendum §1 — the contradicted claim does not appear: ${banned}`,
         hit === null ? '' : JSON.stringify(out.slice(Math.max(0, hit.index - 80), hit.index + 100)));
    }
    /* And the two claims the paper does establish, both present. */
    ok(/error rates are comparable to those in other complex human tasks/.test(out),
       'addendum §1 — the comparability finding, which is what the paper concludes');
    ok(/unlike software, spreadsheets are rarely tested/.test(out),
       'addendum §1 — and the difference the paper actually draws, which is testing');
    ok(/Field audits since 1997 have found errors in the large majority/.test(out),
       'addendum §1 — the field-audit finding');
    ok(/generally believed\s+they were correct|generally believed they were correct/.test(out),
       'addendum §1 — and the overconfidence finding');

    /* One work, named the same way in both places, with a year in each. The
       inline attribution is the half a screen reader reaches: pr-sources is
       print-only. */
    ok(/\(Panko, University of Hawaii, 2000\)/.test(excel.screen.ragList || ''),
       'addendum §1.3.2 — the inline attribution carries a year, on screen');
    const row = excel.print['pr-sources'] || '';
    ok(/Spreadsheet Errors: What We Know\. What We Think We Can Do\./.test(row),
       'addendum §1.3.1 — the sources row names the paper that was read');
    ok(/EuSpRIG/.test(row) && /July 2000/.test(row) && /arXiv:0802\.3457/.test(row),
       'addendum §1.3.1 — with venue, date and a resolvable identifier');
    /* The retired citation described a different paper, whose figures belong
       to a revision nobody here has opened. Pinned absent so it cannot return
       alongside the one that was verified. */
    for (const gone of ['What We Know About Spreadsheet Errors', 'Journal of End-User Computing',
                        '94% of 88 audited spreadsheets']) {
      ok(!readFileSync(TOOL_PATH, 'utf8').includes(gone),
         `addendum §1.3.1 — the unread citation is gone from the file: "${gone}"`);
    }
  }
}

section('PR15 addendum §2.1 / §2.2 / §2.3 / §3 — the approved decisions');
{
  const css = readFileSync(TOOL_PATH, 'utf8');

  /* §2.1. One column per navy card: every child on the same measure, so the
     card has one left edge rather than two. The cap has still not moved. */
  ok(/--measure:660px;/.test(css), '§2.1 — the cap is still 660px');
  for (const sel of ['.ceiling .h-eyebrow', '.ceiling .h-figure', '.ceiling .h-note',
                     '.assumption', '.assumption .a-parts', '.closing h2', '.closing .verdict']) {
    const rule = (css.match(new RegExp('\\n' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{[^}]*\\}')) || [''])[0];
    ok(rule.length > 0, `§2.1 — the ${sel} rule is found before it is read`);
    ok(/max-width:var\(--measure\)/.test(rule) && /margin-inline:auto/.test(rule),
       `§2.1 — ${sel} shares the card's one centred column`);
  }

  /* §2.2, §2.3 and §3, on rendered output. */
  const cap = capture({ id: 'addendum', ...FIXTURE_A });
  if (ok(cap.ok, 'addendum: renders', cap.error)) {
    const out = allText(cap);
    ok(/This range comes from both time bands you picked\./.test(out),
       '§2.2 — the cost card says where its range comes from');
    ok(/on run work, the other side of the [\d.]+(–[\d.]+)? effective FTE on change above/.test(out),
       '§3 — the checks block names the two figures as one split');
  }

  /* §2.3. Both remaining branches of finding 2, each rendered on its own
     shape, because no single report reaches more than one of them. */
  for (const [toolset, kept, gone] of [
    ['mixed', /Where a cross-reference between them is made by hand/,
      /Every cross-reference\s+between them is manual/],
    ['none', /Where a capacity question can\s+only be answered by asking around/,
      /Basic capacity questions can only\s+be answered by asking around/],
  ]) {
    const c = capture({ id: `addendum-${toolset}`, ...FIXTURE_A, toolset });
    if (!ok(c.ok, `addendum-${toolset}: renders`, c.error)) continue;
    const out = allText(c);
    ok(kept.test(out), `§2.3 — the ${toolset} branch states its condition conditionally`);
    ok(!gone.test(readFileSync(TOOL_PATH, 'utf8')),
       `§2.3 — and the asserted form it replaced is gone from the file`);
  }
}

section('PR15 addendum §1.3.3 — every published source is in the master §11 register');
{
  /* The Panko defect had two halves and the suite could see neither. One was a
     claim its own source contradicts, which no assertion can catch: only
     reading the paper does that. The other was structural and is catchable —
     a work cited in the printed report with NOTHING in the verification
     register, so nobody was ever asked whether it had been read.

     §11's own preamble says every factual claim sits in one of two columns and
     that marking something settled without checking is what stops anyone
     catching it. This asserts that the report cannot publish a source the
     register has never heard of, in either direction:

       - every pr-sources row is accounted for here, by name, so a row added
         later fails rather than arriving unchecked (§0.17);
       - every row that cites a published work has an entry in §11 naming that
         same work, matched on tokens distinctive enough that a register row
         about a DIFFERENT paper by the same author does not satisfy it. That
         last part is the Panko failure exactly: "Panko" alone would have
         satisfied a register while the two documents named two different
         papers.

     An entry in EITHER column counts. The register's job is to say whether a
     claim has been checked, and a row in the second column saying "published
     and not verified" is the register working, not failing. Requiring the
     first column would create the incentive to move a row rather than check
     it, which is the behaviour §11's preamble was written against.

     Rows that cite no published work are exempt BY NAME with the reason,
     never by pattern. Both are ProjexaR's own judgement and say so in their
     own text; a new row cannot join them by looking similar. */
  const SPEC = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'claude',
                    'capacity-check-change-spec-sep-2026.md');
  let spec = null;
  try { spec = readFileSync(SPEC, 'utf8'); } catch { /* not checked out */ }
  if (!spec) {
    ok(true, '§1.3.3 — specification not present in this checkout, comparison skipped');
  } else {
    /* §11, extracted, and asserted found before anything is read out of it.
       A heading rename would otherwise leave every claim below tested against
       an empty string, which is §0.17's negative-test shape. */
    const from = spec.indexOf('## 11. Verification register');
    ok(from > 0, '§1.3.3 — master §11 is found before it is searched');
    const s11 = spec.slice(from);
    ok(s11.length > 2000, '§1.3.3 — and it is the register, not an empty heading', String(s11.length));

    /* One entry is one table row. Searching the whole section would let a work
       named in §11's prose, or in a row about something else entirely, satisfy
       a claim about a row. */
    const rows11 = s11.split('\n').filter((l) => l.trim().startsWith('|') && l.includes('|', 1));
    ok(rows11.length > 20, '§1.3.3 — the register rows parse', String(rows11.length));

    /* Every pr-sources row, and the tokens that identify the work it names.
       All tokens must appear in ONE register row. Written from the two
       documents by hand, never derived from either, so a change to either side
       fails here rather than being absorbed. */
    const REGISTER = {
      'Concurrent projects and project performance': ['Colicev', '10.1002/smj.3443'],
      'Project overload in multi-project settings': ['Zika-Viktorsson', '385–394'],
      'Lower anchor, published per month': ['HDI/MetricNet', '87'],
      'Upper anchor, published per day': ['Jitbit', '21'],
      'Run against growth spend': ['Flexera', '2023 Tech Spend Pulse'],
      'Median IT salary': ['ASHE', 'SOC 213'],
      'Employer National Insurance': ['Employer NI', '£5,000'],
      'Spreadsheet error rates': ['Panko', 'Spreadsheet Errors: What We Know', 'EuSpRIG'],
      'Microsoft Project capabilities': ['Microsoft Learn', 'enterprise-tier'],
      'Project Online retirement': ['Project Online', '30 September 2026'],
      'Microsoft Planner': ['Microsoft Support', 'Planner'],
      /* Exempt, by name and with the reason. Neither cites a published work:
         both are ProjexaR's own control and both say so in their own text, so
         there is nothing for the register to have verified. */
      'The divisor we apply, in both units': null,
      'What the two anchors do not tell you': null,
    };

    /* Collect every row the tool can publish, across the branches that gate
       them. A title the table does not know fails; a table entry no branch
       produces fails too, because a stale expectation is how this check
       quietly stops covering something. */
    const probes = [
      { id: 'reg-a', ...FIXTURE_A }, { id: 'reg-excel', ...FIXTURE_A, toolset: 'excel' },
      { id: 'reg-msp', ...FIXTURE_A, toolset: 'msproject' },
      { id: 'reg-plan', ...FIXTURE_A, toolset: 'planner' },
      { id: 'reg-noticket', ...FIXTURE_A, ticketsPerMonth: null },
      { id: 'reg-nosplit', ...FIXTURE_A, bauSplitEstimate: null },
      { id: 'reg-nopm', ...FIXTURE_A, pms: 0 },
      { id: 'reg-usd', ...FIXTURE_A, currency: 'USD' },
    ];
    const found = new Map();
    for (const shape of probes) {
      const cap = capture(shape);
      if (!ok(cap.ok, `${shape.id}: renders`, cap.error)) continue;
      const table = cap.print['pr-sources'] || '';
      for (const m of table.matchAll(/<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/g)) {
        const title = m[1].replace(/<[^>]*>/g, '').trim();
        if (!found.has(title)) found.set(title, m[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
      }
    }
    ok(found.size > 0, '§1.3.3 — the probes rendered at least one sources row');

    for (const [title, body] of found) {
      const tokens = REGISTER[title];
      if (!ok(tokens !== undefined,
              `§1.3.3 — the sources row "${title}" is accounted for in this table`,
              tokens === undefined ? 'add it here with its register tokens, or exempt it with a reason' : '')) {
        continue;
      }
      if (tokens === null) {
        /* An exemption has to keep earning itself: the row must still say it
           is ours rather than someone else's. */
        ok(/ProjexaR|The anchors measure/.test(body),
           `§1.3.3 — the exempt row "${title}" still cites no published work`, body.slice(0, 120));
        continue;
      }
      const hit = rows11.find((r) => tokens.every((t) => r.includes(t)));
      ok(hit !== undefined,
         `§1.3.3 — "${title}" has a §11 entry naming the same work`,
         hit === undefined ? `no register row carries all of: ${tokens.join(' + ')}` : '');
    }

    /* Both ways, like the INDEX.md check. A table entry for a row that no
       branch produces is an expectation nobody is meeting, and it would let a
       deleted source look covered. */
    for (const title of Object.keys(REGISTER)) {
      ok(found.has(title), `§1.3.3 — the table entry "${title}" corresponds to a row the tool renders`);
    }
  }
}

/* ------------------------------------------------------------------- result */
console.log(`\n${'='.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures.slice(0, 40)) console.log('  ✗ ' + f);
  if (failures.length > 40) console.log(`  … and ${failures.length - 40} more`);
}
process.exit(fail ? 1 : 0);
