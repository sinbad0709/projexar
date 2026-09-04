/* The PR1 check suite.
       node tools/capacity-check/check.mjs [baseline-before.json]

   Numbers are asserted against values computed outside the tool — the §4
   fixtures against the figures the brief states, and all 603 corpus shapes
   against oracle.mjs. A number that disagrees is a failure, never a category.
   Only text differences are categorised. */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const sha = (v) => createHash('sha256').update(String(v)).digest('hex').slice(0, 16);
import { corpus, FIXTURE_A, FIXTURE_B, boundaryShapes, toolsetInvarianceShapes,
         suppressionShapes, singularShapes, corroborationShapes,
         TOOLSETS, VISIBILITY, BUDGETS, ASSIGNMENT } from './shapes.mjs';
import { capture, allText, numbersIn } from './capture.mjs';
import { evaluate, round1, redThreshold } from './oracle.mjs';

let pass = 0, fail = 0;
const failures = [];

function ok(cond, label, detail = '') {
  if (cond) { pass++; return true; }
  fail++; failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  return false;
}
function eq(actual, expected, label) {
  return ok(actual === expected, label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function section(name) { console.log(`\n── ${name}`); }

/* ------------------------------------------------------------ §3.11 copy rule */
const BANNED = ['approximately', 'roughly', 'estimated', 'very likely', 'significantly higher'];
/* `about` and `around` are deliberately absent: a mechanical check cannot tell
   "around 17 projects" from "questions around your team", and a check that fails
   on legitimate copy gets switched off. Review handles those two. */
const PRICE_COMPARISON = /\b(pays? for itself|payback|breaks? even|break-even|recovered? cost|saving of|save[sd]? you)\b/i;

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

/* =========================================================== §4 fixtures ==== */
function assertFixture(name, shape, expect) {
  section(`Fixture ${name}`);
  const cap = capture(shape);
  if (!ok(cap.ok, `${name}: renders`, cap.error)) return cap;
  const c = cap.computed;
  const h = c.ceiling;

  eq(round1(c.bauEffectiveFte), expect.bauEffectiveFte, `${name}: bau_effective_fte`);
  eq(round1(c.internalProjectFte), expect.internalProjectFte, `${name}: internal_project_fte`);
  eq(round1(c.pmLoad), expect.pmConcurrent, `${name}: concurrent projects per PM`);
  eq(cap.sender.rag_pm, expect.ragPM, `${name}: PM tile rating`);
  eq(round1(c.projectsPerFTE), expect.perFte, `${name}: live per effective BAU FTE`);
  eq(cap.sender.rag_bau, expect.ragBAU, `${name}: BAU tile rating`);
  eq(h.pmLive, expect.pmRedLive, `${name}: pm_red_live`);
  eq(h.pmAnnual, expect.pmRedAnnual, `${name}: pm_red_annual`);
  eq(h.bauLive, expect.bauRedLive, `${name}: bau_red_live`);
  eq(h.bauAnnual, expect.bauRedAnnual, `${name}: bau_red_annual`);
  eq(h.sustainable, expect.sustainable, `${name}: sustainable annual pace`);
  eq(h.binding, expect.binding, `${name}: binding route`);
  eq(h.value, expect.headroom, `${name}: growth ceiling`);
  eq(c.derivedRunShare, expect.derivedRun, `${name}: derived run share`);
  eq(c.corroboration, expect.corroboration, `${name}: corroboration`);
  eq(cap.sender.headroom, expect.headroom, `${name}: headroom posted to Sender, unclamped`);

  const text = allText(cap, { forCopyRule: true });
  ok(copyRuleViolations(text).length === 0, `${name}: copy rule`, copyRuleViolations(text).join(', '));
  ok(!badNumbers(text), `${name}: no NaN/Infinity/undefined`);
  return cap;
}

const capA = assertFixture('4.A', FIXTURE_A, {
  bauEffectiveFte: 7.4, internalProjectFte: 12.4,
  pmConcurrent: 9.0, ragPM: 'At risk', perFte: 6.1, ragBAU: 'Watch',
  pmRedLive: 36, pmRedAnnual: 59, bauRedLive: 75, bauRedAnnual: 124,
  sustainable: 58, binding: 'Concurrent projects per PM', headroom: -17,
  derivedRun: 72.4, corroboration: 'healthy',
});

/* 56.3, not the 56.2 the brief's fixture states: 1 − 10.5/24 is 0.5625 exactly,
   so 56.25% is an exact half and round1 — the helper the brief mandates and the
   one every other displayed figure uses — carries it up. Confirmed with Mark;
   the rating is Healthy either way. */
const capB = assertFixture('4.B', FIXTURE_B, {
  bauEffectiveFte: 6.5, internalProjectFte: 10.5,
  pmConcurrent: 4.0, ragPM: 'Healthy', perFte: 2.5, ragBAU: 'Healthy',
  pmRedLive: 29, pmRedAnnual: 43, bauRedLive: 66, bauRedAnnual: 98,
  sustainable: 42, binding: 'Concurrent projects per PM', headroom: 18,
  derivedRun: 56.3, corroboration: 'healthy',
});

section('Fixture 4.B — Healthy must be reachable');
if (capB.ok) {
  const textB = allText(capB);
  eq(capB.sender.rag_pm, 'Healthy', '4.B: PM tile Healthy');
  eq(capB.sender.rag_bau, 'Healthy', '4.B: BAU tile Healthy');
  eq(capB.computed.corroboration, 'healthy', '4.B: corroboration Healthy');
  const tileRatings = [capB.sender.rag_pm, capB.sender.rag_bau];
  ok(!tileRatings.includes('At risk'), '4.B: no At risk tile rating anywhere');
  ok(/Room to grow/.test(capB.screen.ceilingFigure), '4.B: ceiling renders as positive headroom',
     capB.screen.ceilingFigure);
  ok(!/-18|−18/.test(textB), '4.B: no negative rendering');
}

section('Fixture 4.A — negative headroom in prose');
if (capA.ok) {
  const fig = capA.screen.ceilingFigure;
  eq(fig, 'You are running 17 projects a year above your sustainable pace.', '4.A: ceiling figure');
  ok(!/-17|−17/.test(allText(capA)), '4.A: no minus sign rendered anywhere');
  ok(!/\b0 projects a year\b/.test(allText(capA)), '4.A: no zero standing in for the overrun');
  eq(capA.sender.headroom, -17, '4.A: Sender headroom is signed and unclamped');
  /* §3.9.2 — rating and body copy agree. */
  ok(/At risk/.test(capA.print['pr-tiles']), '4.A: PM tile prints At risk');
  ok(!/inside/.test(capA.screen.tileGrid.split('</div>')[0] || ''), '4.A: PM note does not claim "inside"');
}

/* ================================================= §5 boundary shapes ======= */
section('§5 boundary shapes — display, rating and threshold agree');
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
  const ratioAtThreshold = threshold / (isPm ? cap.values.pms : o.bauEffectiveFte);
  const ratioBelow = (threshold - 1) / (isPm ? cap.values.pms : o.bauEffectiveFte);
  const cap0 = isPm ? 7.0 : 10.0;
  ok(round1(ratioAtThreshold) > cap0, `${shape.id}: threshold ${threshold} rates At risk`);
  ok(round1(ratioBelow) <= cap0, `${shape.id}: threshold-1 (${threshold - 1}) does not`);

  if (shape.expectDisplay) {
    eq(display.toFixed(1), shape.expectDisplay, `${shape.id}: displays ${shape.expectDisplay}`);
    eq(sender, shape.expectRating, `${shape.id}: rates ${shape.expectRating}`);
    eq(threshold, shape.expectThreshold, `${shape.id}: publishes threshold ${shape.expectThreshold}`);
  }
}

/* ============================================== §5 toolset invariance ======= */
section('§5 toolset invariance — no toolset input moves a rating');
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
    eq(cap.print['pr-formulas'], ref.print['pr-formulas'], `${sh.id}: every published figure identical`);
  }
}

/* ================================================ §3.6 suppression rows ===== */
section('§3.6 suppression — one shape per row');
for (const shape of suppressionShapes()) {
  const cap = capture(shape);
  if (!ok(cap.ok, `${shape.id}: renders`, cap.error)) continue;
  const text = allText(cap);
  ok(!badNumbers(text), `${shape.id} (${shape.row}): no NaN/Infinity/undefined`);
  ok(!/>\s*0\.0\s*FTE/.test(text) || shape.id !== 'suppress-bau-0',
     `${shape.id}: no bare 0.0 standing in for "not computed"`);
  /* Each suppressed figure has to say on the workings page that it was not
     computed, and why. */
  if (shape.id === 'suppress-pms-0') {
    ok(/No project managers were reported/.test(cap.print['pr-bandnote']), `${shape.id}: explained`);
    ok(!/Concurrent projects per PM/.test(cap.screen.tileGrid), `${shape.id}: PM tile suppressed`);
  }
  if (shape.id === 'suppress-bau-0') {
    ok(/No BAU staff were reported/.test(cap.print['pr-bandnote']), `${shape.id}: explained`);
    ok(!/effective BAU FTE<\/p>|Live projects per effective BAU FTE/.test(cap.screen.tileGrid),
       `${shape.id}: BAU tile suppressed`);
    ok(/Not computed/.test(cap.print['pr-formulas']), `${shape.id}: workings say not computed`);
  }
  if (shape.id === 'suppress-live-0') {
    eq(cap.sender.headroom, '', `${shape.id}: headroom blank`);
  }
  if (shape.id === 'suppress-both-routes') {
    ok(/Not enough capacity information/.test(cap.screen.ceilingFigure), `${shape.id}: no ceiling, explained`);
    eq(cap.sender.headroom, '', `${shape.id}: headroom blank`);
  }
}

/* ================================================ §3.5 pluralisation ======== */
section('§3.5 pluralisation — every prose integer correct at 1');
for (const shape of singularShapes()) {
  const cap = capture(shape);
  if (!ok(cap.ok, `${shape.id}: renders`, cap.error)) continue;
  const text = allText(cap);
  /* The lookbehind matters: without it "11 projects" and "6.1 projects" both
     match on their trailing 1 and the check fails on correct copy. */
  const bad = text.match(/(?<![\d.])1 (?:projects|people|managers|months|persons)\b/g);
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

/* ============================================= §3.8 corroboration states ==== */
section('§3.8 corroboration — all three outcomes');
for (const shape of corroborationShapes()) {
  const cap = capture(shape);
  if (!ok(cap.ok, `${shape.id}: renders`, cap.error)) continue;
  const expected = shape.expect === 'Healthy' ? 'healthy' : shape.expect === 'Watch' ? 'watch' : 'note';
  eq(cap.computed.corroboration, expected, `${shape.id}: ${shape.expect}`);
  if (shape.expect === 'note') {
    ok(/>Note</.test(cap.screen.ragList), `${shape.id}: rendered as a note, not a rating`);
    ok(/what we would expect/.test(cap.screen.ragList), `${shape.id}: says why the gap is expected`);
  }
  if (shape.expect === 'Watch') {
    ok(/worth revisiting/.test(cap.screen.ragList), `${shape.id}: names the input to revisit`);
  }
}

/* ============================ the 603 corpus: oracle agreement + copy rule === */
section('603-shape corpus — oracle agreement, copy rule, no NaN');
const shapes = corpus();
const after = {};
let oracleMismatch = 0, copyViolations = 0, nanShapes = 0, healthyShapes = 0, contradictions = 0;


for (const shape of shapes) {
  const cap = capture(shape);
  if (!cap.ok) { fail++; failures.push(`${shape.id}: ${cap.error}`); continue; }
  const o = evaluate(cap.values);
  const c = cap.computed;
  const h = c.ceiling;

  const checks = [
    [c.bauEffectiveFte, o.bauEffectiveFte, 'bau_effective_fte'],
    [c.pmLoad === null ? null : round1(c.pmLoad), o.pmDisplay, 'pm display'],
    [c.projectsPerFTE === null ? null : round1(c.projectsPerFTE), o.bauDisplay, 'bau display'],
    [h.pmLive, o.pmRedLive, 'pm_red_live'],
    [h.bauLive, o.bauRedLive, 'bau_red_live'],
    [h.pmAnnual, o.pmRedAnnual, 'pm_red_annual'],
    [h.bauAnnual, o.bauRedAnnual, 'bau_red_annual'],
    [h.sustainable, o.sustainableAnnual, 'sustainable_annual'],
    [h.value, o.headroom, 'headroom'],
    [c.derivedRunShare, o.derivedRunShare, 'derived_run_share'],
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
     of it. Checked on every shape, not just the boundaries. */
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

  if (o.ragPM === 'Healthy' || o.ragBAU === 'Healthy') healthyShapes++;
  after[shape.id] = { text: sha(text), numbers: sha(numbersIn(text).join('|')) };
}

console.log(`  rating/threshold contradictions ... ${contradictions}`);
console.log(`  oracle mismatches ......... ${oracleMismatch}`);
console.log(`  copy-rule violations ...... ${copyViolations}`);
console.log(`  NaN / Infinity shapes ..... ${nanShapes}`);
console.log(`  shapes with >=1 Healthy tile ... ${healthyShapes} of ${shapes.length}`);

/* ============================================================ fuzz pass ===== */
section('Seeded fuzz — 400 shapes across the whole input space');
{
  /* The 603 corpus holds the optional answers fixed. This reaches the
     combinations it does not: blank spend, blank tickets, blank split, every
     currency, zero PMs against zero BAU, and caseloads either side of both
     bands. Deterministic, so a failure is reproducible. */
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
      bauStaff, bauPercent2: pick([1, 5, 37, 50, 65, 100]),
      ticketsPerMonth: pick([null, 0, 12, 960, 100000]),
      bauSplitEstimate: pick([null, 0, 20, 56, 72, 100]),
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
    if (cap.computed.ceiling.value !== o.headroom) {
      fuzzFail++; fail++;
      failures.push(`${shape.id}: headroom oracle ${o.headroom}, tool ${cap.computed.ceiling.value}`);
    } else pass++;
    const badPlural = allText(cap).match(/(?<![\d.])1 (?:projects|people|managers|months)\b/g);
    if (badPlural) { fuzzFail++; fail++; failures.push(`${shape.id}: "${badPlural[0]}"`); } else pass++;
  }
  console.log(`  fuzz failures ............. ${fuzzFail}`);
}

/* ======================================================= source orphans ===== */
section('Sources — every retained source is attached to a surviving claim');
{
  /* Each source, and the output it is cited in support of. A source listed
     without its claim rendering is an orphan; a claim rendering without its
     source is an uncited assertion. Both are failures. PR1 consolidates no
     findings, so nothing should have moved. */
  const ANCHORS = [
    ['Concurrent projects and project performance', (cap) => cap.computed.pmLoad !== null,
      'the concurrent-projects tile'],
    ['Project overload in multi-project settings', (cap) => cap.computed.pmLoad !== null,
      'the concurrent-projects tile'],
    ['Tickets per agent per month', (cap) => cap.computed.ticketFTE !== null, 'the ticket FTE figure'],
    ['Tickets per employee per month by sector', (cap) => cap.computed.rateOutside,
      'the ticket-rate consistency check'],
    ['Run against growth spend', (cap) => cap.values.bauSplitEstimate !== null, 'the BAU/change split figure'],
    ['Spreadsheet error rates', (cap) => cap.values.toolset === 'excel', 'the spreadsheet finding'],
    ['Microsoft Project capabilities', (cap) => cap.values.toolset === 'msproject', 'the MS Project finding'],
    ['Project Online retirement', (cap) => cap.values.toolset === 'msproject', 'the MS Project finding'],
    ['Microsoft Planner', (cap) => cap.values.toolset === 'planner', 'the Planner finding'],
  ];
  const seen = new Set();
  const probes = [FIXTURE_A, FIXTURE_B,
    { ...FIXTURE_A, toolset: 'excel' }, { ...FIXTURE_A, toolset: 'msproject' },
    { ...FIXTURE_A, toolset: 'planner' }, { ...FIXTURE_A, ticketsPerMonth: 50 },
    { ...FIXTURE_A, pms: 0 }, { ...FIXTURE_A, bauSplitEstimate: null },
    { ...FIXTURE_A, ticketsPerMonth: null }];
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
  ok(!/Zika-Wiktorsson/.test(t), 'publisher spelling Zika-Viktorsson, not Zika-Wiktorsson');
  ok(/24\(5\), 385–394/.test(capAll.print['pr-sources']), 'Zika-Viktorsson volume, issue and pages');
  ok(/44\(2\), 610–636/.test(capAll.print['pr-sources']), 'Colicev volume, issue and pages');
}

/* ================================================= categorised text diff ==== */
const beforePath = process.argv[2];
if (beforePath) {
  section('Categorised text diff against the supplied baseline');
  const before = JSON.parse(readFileSync(beforePath, 'utf8')).shapes;
  let copyOnly = 0, numeric = 0, unchanged = 0, unexpected = 0;
  const unexpectedIds = [];
  for (const shape of shapes) {
    const b = before[shape.id], a = after[shape.id];
    if (!b || !a) { unexpected++; unexpectedIds.push(`${shape.id} (missing capture)`); continue; }
    if (b.text === a.text) { unchanged++; continue; }
    if (b.numbers === a.numbers) copyOnly++;
    else numeric++;
  }
  /* Unexpected means: a number the oracle did not account for, banned copy, or
     a NaN. Numeric change alone is not unexpected — this PR changes numbers on
     purpose, and every one of them was asserted against the oracle above. */
  unexpected += oracleMismatch + copyViolations + nanShapes;
  console.log(`  unchanged ................. ${unchanged}`);
  console.log(`  expected copy change ...... ${copyOnly}   (text differs, every number identical)`);
  console.log(`  expected numeric change ... ${numeric}   (asserted against the oracle)`);
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
