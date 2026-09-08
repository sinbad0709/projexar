/* The PR2 check suite.
       node tools/capacity-check/check.mjs [baseline-before.json]

   Numbers are asserted against values computed outside the tool — the §4
   fixtures against the figures the brief states, typed in by hand, and all 603
   corpus shapes against oracle.mjs. A number that disagrees is a failure, never
   a category. Only text differences are categorised. */

import { readFileSync, writeFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sha = (v) => createHash('sha256').update(String(v)).digest('hex').slice(0, 16);
import { corpus, FIXTURE_A, FIXTURE_B, FIXTURE_C, FIXTURE_D, FIXTURE_E, FIXTURE_F,
         FIXTURE_LOADED_COST, FIXTURE_SALARY,
         boundaryShapes, straddleShapes, toolsetInvarianceShapes, contractorShapes,
         suppressionShapes, singularShapes, corroborationShapes, budgetShapes,
         loadedCostShapes, currencyShapes, LEGACY_BAND_CASES, CURRENCIES,
         TOOLSETS, VISIBILITY, BUDGETS, ASSIGNMENT, BANDS } from './shapes.mjs';
import { capture, allText, numbersIn, staticReportText, SCREEN_NODES, PRINT_NODES } from './capture.mjs';
import { TOOL_PATH, loadTool } from './harness.mjs';
import { evaluate, roundN, round1, redThreshold, loadedCost, bandContaining,
         typicalDurationMonths, itShare, pricesCosts, COST_CURRENCY,
         finding2State, finding3State, finding4State,
         TICKETS_LO, TICKETS_HI, WORKING_DAYS, JITBIT_PER_DAY, HDI_LO, HDI_HI } from './oracle.mjs';

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

/* Rendered text contains a phrase, with the en dash the tool uses. */
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
   computed correctly and rendered wrongly still fails. */
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
  bauFteLo: 6.2, bauFteHi: 8.0, ipfLo: 11.2, ipfHi: 13.0,
  pmConcurrent: 9.0, ragPM: 'At risk', perFteLo: 5.6, perFteHi: 7.3, ragBAU: 'Watch',
  pmRedLive: 36, pmRedAnnual: 59,
  bauRedLiveLo: 63, bauRedLiveHi: 81, bauRedAnnualLo: 104, bauRedAnnualHi: 134,
  sustainable: 58, binding: 'Concurrent projects per PM', headroom: -17,
  derivedRunLo: 71.1, derivedRunHi: 75.1, corroboration: 'healthy',
  ticketLo: 3.0, ticketHi: 5.6, runWork: 32.4, gapLo: 26.8, gapHi: 29.4,
  effortLo: 728000, effortHi: 845000, sums: true,
  fullLo: 1095000, fullHi: 1212000, reportedLo: 30.3, reportedHi: 33.5,
  duration: 7.2, itShare: 3.8,
  licences: 25, yearly: 2500, spendPct: '0.68', fullPctLo: 0.21, fullPctHi: 0.23,
});

/* §4 states £656,000 for 8.B's lower endpoint. 10.1 × £65,000 is £656,500
   exactly, and every other figure in all three fixtures reproduces. Confirmed
   with Mark: the fixture value was a slip, cost figures display in whole pounds
   rounded half-up, and £656,500 is what the suite asserts. */
const capB = assertFixture('8.B', FIXTURE_B, {
  bauFteLo: 6.1, bauFteHi: 7.0, ipfLo: 10.1, ipfHi: 11.0,
  pmConcurrent: 4.0, ragPM: 'Healthy', perFteLo: 2.3, perFteHi: 2.6, ragBAU: 'Healthy',
  pmRedLive: 29, pmRedAnnual: 43,
  bauRedLiveLo: 62, bauRedLiveHi: 71, bauRedAnnualLo: 92, bauRedAnnualHi: 106,
  sustainable: 42, binding: 'Concurrent projects per PM', headroom: 18,
  derivedRunLo: 54.2, derivedRunHi: 57.9, corroboration: 'healthy',
  ticketLo: 4.4, ticketHi: 8.2, runWork: 13.4, gapLo: 5.2, gapHi: 9.0,
  effortLo: 656500, effortHi: 715000, sums: false,
  fullLo: null, fullHi: null,
  duration: 8.0, itShare: 4.0,
  licences: 14, yearly: 1400, spendPct: '0.78',
});

const capC = assertFixture('8.C', FIXTURE_C, {
  bauFteLo: 6.2, bauFteHi: 8.0, ipfLo: 11.2, ipfHi: 13.0,
  pmConcurrent: 9.0, ragPM: 'At risk', perFteLo: 5.6, perFteHi: 7.3, ragBAU: 'Watch',
  pmRedLive: 36, pmRedAnnual: 59,
  bauRedLiveLo: 63, bauRedLiveHi: 81, bauRedAnnualLo: 104, bauRedAnnualHi: 134,
  sustainable: 58, binding: 'Concurrent projects per PM', headroom: -17,
  derivedRunLo: 71.1, derivedRunHi: 75.1, corroboration: 'healthy',
  ticketLo: 3.0, ticketHi: 5.6, runWork: 32.4, gapLo: 26.8, gapHi: 29.4,
  effortLo: 728000, effortHi: 845000, sums: true,
  fullLo: 1095000, fullHi: 1212000, reportedLo: 30.3, reportedHi: 33.5,
  duration: 7.2, itShare: 3.8,
  licences: 25, yearly: 2500, spendPct: '0.68', fullPctLo: 0.21, fullPctHi: 0.23,
});

/* Fixture 8.D — 8.A reported in dollars. Every rated figure, every FTE, the
   growth ceiling and the licence count are 8.A's, typed in again rather than
   read back from capA, so a change in 8.A cannot silently drag 8.D with it.
   What differs is the cost block, which is gone, and the share of reported
   spend, which crossed two currencies and is gone with it. */
const capD = assertFixture('8.D', FIXTURE_D, {
  bauFteLo: 6.2, bauFteHi: 8.0, ipfLo: 11.2, ipfHi: 13.0,
  pmConcurrent: 9.0, ragPM: 'At risk', perFteLo: 5.6, perFteHi: 7.3, ragBAU: 'Watch',
  pmRedLive: 36, pmRedAnnual: 59,
  bauRedLiveLo: 63, bauRedLiveHi: 81, bauRedAnnualLo: 104, bauRedAnnualHi: 134,
  sustainable: 58, binding: 'Concurrent projects per PM', headroom: -17,
  derivedRunLo: 71.1, derivedRunHi: 75.1, corroboration: 'healthy',
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
  bauFteLo: 6.2, bauFteHi: 8.0, ipfLo: 11.2, ipfHi: 13.0,
  pmConcurrent: 9.0, ragPM: 'At risk', perFteLo: 5.6, perFteHi: 7.3, ragBAU: 'Watch',
  pmRedLive: 36, pmRedAnnual: 59,
  bauRedLiveLo: 63, bauRedLiveHi: 81, bauRedAnnualLo: 104, bauRedAnnualHi: 134,
  sustainable: 58, binding: 'Concurrent projects per PM', headroom: -17,
  derivedRunLo: 71.1, derivedRunHi: 75.1, corroboration: 'watch',
  ticketLo: 3.0, ticketHi: 5.6, runWork: 36.9, gapLo: 31.3, gapHi: 33.9,
  effortLo: 728000, effortHi: 845000, sums: true,
  fullLo: 1095000, fullHi: 1212000, reportedLo: 30.3, reportedHi: 33.5,
  duration: 7.2, itShare: 3.8,
  licences: 25, yearly: 2500, spendPct: '0.68', fullPctLo: 0.21, fullPctHi: 0.23,
});

const capF = assertFixture('8.F', FIXTURE_F, {
  bauFteLo: 6.2, bauFteHi: 8.0, ipfLo: 11.2, ipfHi: 13.0,
  pmConcurrent: 9.0, ragPM: 'At risk', perFteLo: 5.6, perFteHi: 7.3, ragBAU: 'Watch',
  pmRedLive: 36, pmRedAnnual: 59,
  bauRedLiveLo: 63, bauRedLiveHi: 81, bauRedAnnualLo: 104, bauRedAnnualHi: 134,
  sustainable: 58, binding: 'Concurrent projects per PM', headroom: -17,
  derivedRunLo: 71.1, derivedRunHi: 75.1, corroboration: 'note',
  ticketLo: 3.0, ticketHi: 5.6, runWork: 27.0, gapLo: 21.4, gapHi: 24.0,
  effortLo: 728000, effortHi: 845000, sums: true,
  fullLo: 1095000, fullHi: 1212000, reportedLo: 30.3, reportedHi: 33.5,
  duration: 7.2, itShare: 3.8,
  licences: 25, yearly: 2500, spendPct: '0.68', fullPctLo: 0.21, fullPctHi: 0.23,
});

/* ------------------------------------------- §4 figures as they are printed */
section('§4 figures as the reader sees them');
if (capA.ok) {
  const t = allText(capA);
  ok(has(capA.screen.costFigure, '£1.10m–£1.21m'),
     '8.A: full portfolio cost reads £1.10m–£1.21m', capA.screen.costFigure);
  ok(!/£1\.09m/.test(t), '8.A: the epsilon case does not render £1.09m');
  ok(has(capA.screen.costEyebrow, 'The full cost of your portfolio'),
     '8.A: hero label is "The full cost of your portfolio"', capA.screen.costEyebrow);
  ok(!/true cost/i.test(t), '8.A: nothing is called the "true cost"');
  ok(!/invisible/i.test(t), '8.A: the internal figure is never called "invisible"');
  ok(has(t, '6.2–8.0'), '8.A: effective BAU FTE prints as 6.2–8.0');
  ok(has(t, '5.6–7.3'), '8.A: live per BAU FTE prints as 5.6–7.3');
  ok(has(t, '3.0–5.6'), '8.A: ticket FTE prints as 3.0–5.6');
  ok(has(t, '26.8–29.4'), '8.A: run-work gap prints as 26.8–29.4');
  ok(has(t, '£728,000–£845,000'), '8.A: internal effort cost prints as £728,000–£845,000');
  ok(has(t, '30.3%–33.5%'), '8.A: reported share prints as 30.3%–33.5%');
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
  ok(has(t, '£656,500–£715,000'), '8.B: internal effort cost prints as £656,500–£715,000');
  ok(has(capB.screen.costEyebrow, 'What the internal time on your projects costs'),
     '8.B: the non-summing path does not claim a full portfolio cost', capB.screen.costEyebrow);
  ok(!/full cost of your portfolio/i.test(t), '8.B: no full-cost claim on the non-summing path');
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
  ok(/Room to grow/.test(capB.screen.ceilingFigure), '8.B: ceiling renders as positive headroom',
     capB.screen.ceilingFigure);
  ok(!/-18|−18/.test(t), '8.B: no negative rendering');
  /* The hero swap: growth ceiling leads on the non-summing path. */
  eq(capB.hero.ceilingOrder, '0', '8.B: growth ceiling leads');
  eq(capB.hero.costOrder, '1', '8.B: the cost block drops to second');
  ok(/secondary/.test(capB.hero.costClass), '8.B: the cost block is styled as secondary');
  ok(!/secondary/.test(capB.hero.ceilingClass), '8.B: the ceiling is not');
  eq(capB.print['pr-herohead'], 'Portfolio growth ceiling', '8.B: printed report leads on the ceiling');
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
  eq(capA.print['pr-herohead'], 'The full cost of your portfolio', '8.A: printed report leads on full cost');
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
    if (!cap.ok) continue;
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
    eq(cap.print['pr-herohead'], 'Portfolio growth ceiling', `${shape.id}: the printed report leads on the ceiling`);
    eq(cap.print['pr-secondhead'], '', `${shape.id}: no second callout in print`);

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
    if (!cap.ok) continue;
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
    /* Rule 6: the licence basis excludes them. */
    eq(cap.computed.licenceCount, ref.computed.licenceCount, `${sh.id}: licence count`);
    eq(cap.computed.yearly, ref.computed.yearly, `${sh.id}: annual price`);
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
    ok(!has(allText(cap), 'full cost of your portfolio'), `${shape.id}: no full-cost claim`);
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
    ok(has(cap.screen.checkList, 'the workings page sets both out'),
       `${shape.id}: and the check says the qualifications exist`);
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
    ok(has(cap.screen.checkList, '>Note<'), `${shape.id}: rendered as a note, not a rating`);
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
    ok(has(cap.screen.checkList, 'BAU headcount and time band'), `${shape.id}: names the input to revisit`);
    /* §3. The assumption is named first, before the input to revisit, so a
       probable false positive reads as a prompt rather than a flag. */
    if (cap.values.pms > 0) {
      const body = cap.screen.checkList.replace(/<[^>]*>/g, ' ');
      ok(has(body, 'also carry run work') || has(body, 'also carries run work'),
         `${shape.id}: the Watch branch names PM run work`);
      ok(body.indexOf('run work.') < body.indexOf('BAU headcount and time band'),
         `${shape.id}: it names PM run work before the input to revisit`);
      ok(has(body, 'full-time equivalent of change work'),
         `${shape.id}: and states the assumption that produced it`);
    } else {
      ok(!/also carry run work|also carries run work/.test(cap.screen.checkList),
         `${shape.id}: with no PMs the PM explanation is not offered`);
      ok(has(cap.screen.checkList, 'no project managers'), `${shape.id}: says so instead`);
    }
  }
  /* Run-work composition is stated and carries no rating. */
  ok(has(cap.screen.checkList, '>Stated<'), `${shape.id}: run-work composition is stated, not rated`);
  ok(has(cap.screen.checkList, 'composition, not a deficiency'),
     `${shape.id}: framed as composition rather than deficiency`);
  ok(has(cap.screen.checkList, 'not ticket-shaped'), `${shape.id}: gives the second reading`);
  ok(has(cap.screen.checkList, 'same population your projects draw from'),
     `${shape.id}: closes on what matters`);
  /* Exactly two entries in the block, and four findings beside it. */
  const chips = cap.screen.checkList.match(/<span class="pill [^"]*">([^<]+)<\/span>/g)
    .map((m) => m.replace(/<[^>]*>/g, ''));
  eq(chips.length, 2, `${shape.id}: two checks`);
  const findings = cap.print['pr-cards'].match(/<span class="p-rag">([^<]+)<\/span>/g);
  eq(findings.length, 4, `${shape.id}: still exactly four findings`);
}

/* ================================ §3 the corroboration assumption =========== */
section('§3 — the derivation states what it assumes, on every branch');
for (const shape of corroborationShapes()) {
  const cap = capture(shape);
  if (!cap.ok) continue;
  ok(has(cap.print['pr-formulas'], 'counting each project manager as a full-time equivalent of change work'),
     `${shape.id}: the assumption is stated beside the derivation, not only where it flags`);
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
      bauPercent2: '', loadedSalary: FIXTURE_SALARY, spend: FIXTURE_A.spend });
    eq(o.at[0].bauEffectiveFte, null, `${shape.id}: bau_effective_fte suppressed`);
    eq(o.at[0].internalProjectFte, FIXTURE_A.pms, `${shape.id}: internal_project_fte falls back to pm_count`);
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
  const staticNums = numbersIn(staticReportText().replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' '));
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
  };
  eq(staticNums.length, 18, 'the static printed copy publishes eighteen numbers');
  eq([...new Set(staticNums)].sort().join(','), Object.keys(WANT).sort().join(','),
     'and they are exactly the eighteen accounted for in the provenance table');
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
    ok(has(t, `${perDayLo.toFixed(1)} to ${perDayHi.toFixed(1)} per agent per day`),
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
  const bare = allText(cap, { exBar: true });
  after[shape.id] = {
    text: sha(text), numbers: sha(numbersIn(text).join('|')),
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
      bauStaff, bauPercent2: pick(BANDS),
      contractors: pick([0, 0, 1, 4, 30]),
      ticketsPerMonth: pick([null, 0, 12, 960, 100000]),
      bauSplitEstimate: pick([null, 0, 20, 56, 72, 100]),
      loadedSalary: pick([null, 1, 4000, 40000, 56348, 250000]),
      toolset: pick(TOOLSETS), resourceVisibility: pick(VISIBILITY),
      budgetTracking: pick(BUDGETS), assignmentKnowledge: pick(ASSIGNMENT),
    };
    const cap = capture(shape);
    if (!cap.ok) continue;   /* rejected by validation is a valid outcome */
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
  const staticCopy = html.slice(start, end)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&pound;/g, '£').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();

  const violations = copyRuleViolations(staticCopy);
  ok(violations.length === 0, 'static report copy clears the copy rule', violations.join(', '));

  /* The bands statement, sentence by sentence — all three closing statements
     are load-bearing and none may be trimmed. */
  ok(/These bands are ProjexaR's management controls/.test(staticCopy), 'bands statement: opening');
  ok(/point estimate of 5\.16 concurrent projects and a confidence interval of 3\.57 to 6\.19/.test(staticCopy),
     'bands statement: figures, with "point estimate" clearing the copy rule');
  ok(/Three things follow, and we state all three/.test(staticCopy), 'bands statement: three things');
  ok(/a portfolio of IT change projects is a different setting/.test(staticCopy), 'bands statement: 1 of 3 — setting');
  ok(/Managerial responsibility appears in it only as a check on how people were allocated to projects/
       .test(staticCopy), 'bands statement: 2 of 3 — managerial responsibility is an allocation check');
  ok(/our step, not the paper's/.test(staticCopy), 'bands statement: 2 of 3 — our step');
  ok(/leadership role \(project leader, chief project engineer, project supervisor\) changes the benefit of multi-project work, and finds it does not/
       .test(staticCopy), 'bands statement: Table S10 — leadership role tested as a moderator, and does not moderate');
  ok(/never models project management caseload as such/.test(staticCopy),
     'bands statement: what the leadership-role test does not cover');
  ok(/red threshold of 7\.0 sits above the top of that confidence interval/.test(staticCopy),
     'bands statement: 3 of 3 — the threshold sits above the interval');

  /* Two claims we must not make. The first inverts the paper: the -.507 result
     is an allocation check with MPW as the dependent variable, not a finding
     that the inverted-U fails for managers. The second is an asserted absence
     contradicted by Table S10, which does test leadership role as a moderator
     of the performance curve. */
  ok(!/not find (the |that )?(same )?pattern among managers/i.test(staticCopy),
     'no claim that the inverted-U was tested and not found for managers');
  ok(!/does not test whether that curve differs for managers/i.test(staticCopy),
     'no asserted absence about testing the curve by role — Table S10 tests leadership role');
  ok(!/8[–-]12/.test(html), 'no 8–12 reference anywhere in the file, comments included');

  /* §3.5 — the range explanation is an argument, and it is not buried. */
  ok(/That is why these figures are ranges/.test(staticCopy),
     'the blended-average paragraph carries the band and range treatment');
  ok(/[Tt]he width of these ranges is the measure of how much a department-wide average leaves unsaid/
       .test(staticCopy), 'the range explanation still says what the width of a range measures');
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
  const staticOut = staticReportText().replace(/<[^>]*>/g, ' ')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–');
  ok(!staticOut.includes('—'), 'and none in the static printed copy either');
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
  const steps = html.slice(html.indexOf('<ol class="p-steps">'), html.indexOf('</ol>', html.indexOf('<ol class="p-steps">')));
  const n = (steps.match(/<li>/g) || []).length;
  eq(n, 4, 'the printed report lists four steps');
  ok(/<h2>Four steps, no software required<\/h2>/.test(html), 'and the heading says four');
  ok(/If you do these four things in a spreadsheet/.test(html), 'and the note below them says four');
  ok(/four things you can do about it that involve buying nothing/.test(html),
     'and the gate blurb promising four is describing those four');
  /* Nothing in the script reaches them, which is what makes the count safe. */
  const script = html.slice(html.indexOf('<script>', html.indexOf('</main>')));
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
    ['Spreadsheet error rates', (cap) => cap.values.toolset === 'excel', 'the spreadsheet mechanism in finding 2'],
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
    if (!cap.ok) continue;
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

  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
  eq(og('og:url'), canonical, 'og:url is the canonical page, not a per-result URL');
  eq(og('og:title'), (html.match(/<title>([^<]*)<\/title>/) || [])[1], 'og:title matches the page title');
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
  const report = html.slice(html.indexOf('<section id="report"'), html.indexOf('<div id="printReport">'));

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

  /* §2.2. Only the promoted section is renamed. */
  ok(!has(report, 'What your answers can show you'), '§2.2 — the old name is gone');
  ok(has(report, '<h2 class="section-title">What your answers show</h2>'),
     '§2.2 — the findings section keeps the name it had');

  /* §3. Three copy strings, and all three live in static markup outside every
     captured node — so without these the text diff cannot see them at all. */
  ok(has(report, '<p class="midcta-sub">Unlimited 14-day trial</p>'), '§3.2 — the trial line');
  ok(!has(html, 'Two projects free, forever'), '§3.2 — the old trial line is gone');
  /* §5.3 of PR6 settled the three routes to the report on one verb. The old
     label is asserted absent so the vocabulary cannot drift back apart. */
  ok(has(report, '>Get the full report &darr;</a>'), '§3.3 — the report button label');
  ok(!has(html, 'Download the full report'), 'PR6 §5.3 — the old download vocabulary is gone');
  ok(!has(html, 'Or take the full report first'), 'PR6 §5.3 — and so is the third label');

  /* §6. The anchor resolves to an element that exists, on this page. */
  const href = (report.match(/<p class="tile-cta"><a [^>]*href="#([^"]+)"/) || [])[1];
  eq(href, 'getReport', '§6 — the download button anchors to the report section');
  ok(has(html, `id="${href}"`), '§6 — the anchor target exists in the markup');
  /* And it is where the spec puts it: in the first block of output tiles. */
  const firstBlock = report.slice(0, report.indexOf('<div class="hero-area"'));
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

/* ------------------------------------------------------------------- result */
console.log(`\n${'='.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures.slice(0, 40)) console.log('  ✗ ' + f);
  if (failures.length > 40) console.log(`  … and ${failures.length - 40} more`);
}
process.exit(fail ? 1 : 0);
