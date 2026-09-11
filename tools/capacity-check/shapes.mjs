/* The shape corpus.
   ---------------------------------------------------------------------------
   No baseline existed in the repo, so this file defines one. The construction
   is deliberate rather than sampled, so the same 603 shapes come back on every
   run and the count means something:

     Set A  252  every tools-and-process combination, at fixture 8.A's numbers
     Set B  252  the same combinations, at fixture 8.B's numbers
     Set C   99  a numeric sweep at one fixed tools-and-process profile
                 (9 PM counts x 11 caseload multipliers)
     ------ ---
            603

   Sets A and B hold the arithmetic still and move the wording; set C does the
   reverse. Between them every branch of the copy and every band boundary is
   reached at least once.

   The assertion shapes below are not part of the 603. They exist to be checked
   against stated values, not diffed. */

import { salaryForLoadedCost, NI_RATE, NI_THRESHOLD, OVERHEAD_RATE } from './oracle.mjs';

export const TOOLSETS = ['excel', 'msproject', 'planner', 'ppm', 'mixed', 'none', 'other'];
export const VISIBILITY = ['none', 'manual', 'dedicated'];
export const BUDGETS = ['outthedoor', 'varies', 'partial', 'tracked'];
export const ASSIGNMENT = ['none', 'stale', 'live'];
/* The ten-point bands, carried as their low endpoint — the value the select
   holds. The high endpoint is nine above it, which holds at both ends. */
export const BANDS = [1, 11, 21, 31, 41, 51, 61, 71, 81, 91];

/* Every fixture pins the loaded cost at £65,000, whatever the production ASHE
   default turns out to be — a fixture that moves when ONS republishes is not a
   fixture. The respondent-editable value is the salary, so the fixtures carry
   the salary that produces exactly that loaded cost. The suite asserts the
   round-trip before it asserts anything built on it. */
export const FIXTURE_LOADED_COST = 65000;
export const FIXTURE_SALARY = salaryForLoadedCost(FIXTURE_LOADED_COST);

/* Fixture 8.A — the strained department. */
/* PR13 puts 8.A on the 91-100% project-manager band. It is the band that
   contains the 100% the tool assumed before the question existed, so the high
   endpoint of every figure built on internal project FTE is exactly the one the
   fixture published before, and only the low endpoint moves. That makes the
   before-and-after legible, which matters more here than a dramatic fixture:
   8.B carries a genuinely part-time band and 8.H a deeply part-time one. */
export const FIXTURE_A = {
  companyHeadcount: 1200, staff: 45, pms: 5, live: 45, annual: 75, spend: 367000,
  currency: 'GBP', bauStaff: 20, bauPercent2: 31, pmPercent2: 91, contractors: 0,
  ticketsPerMonth: 960, bauSplitEstimate: 72, loadedSalary: FIXTURE_SALARY,
  toolset: 'mixed', resourceVisibility: 'manual', budgetTracking: 'outthedoor',
  assignmentKnowledge: 'stale',
};

/* Fixture 8.B — the well-run department. All four findings must return Healthy,
   and the non-summing path must be taken. */
/* 8.B's project managers are part-time at 81-90%, which is what makes this the
   fixture that proves the feature rather than merely carrying it. The band is
   not free: the corroboration check reads internal project FTE, so a lower band
   raises the derived run share until the fixture's stated 56% falls out of the
   window and the all-Healthy gate stops being reachable. 81-90 is the lowest
   band that keeps it, and the gate is the point of this fixture. The deeply
   part-time case is 8.H, which is 8.A and carries no such gate. */
export const FIXTURE_B = {
  companyHeadcount: 600, staff: 24, pms: 4, live: 16, annual: 24, spend: 180000,
  currency: 'GBP', bauStaff: 10, bauPercent2: 61, pmPercent2: 81, contractors: 0,
  ticketsPerMonth: 1400, bauSplitEstimate: 56, loadedSalary: FIXTURE_SALARY,
  toolset: 'ppm', resourceVisibility: 'dedicated', budgetTracking: 'tracked',
  assignmentKnowledge: 'live',
};

/* Fixture 8.C — 8.A with six contractors. Every rated figure must be identical
   to 8.A's; any divergence means a routing rule has leaked. */
export const FIXTURE_C = { ...FIXTURE_A, contractors: 6 };

/* Fixture 8.G — 8.A with two contractors. PR7 §10.

   8.C already carries six, so this is not about reaching the contractor branch.
   It is the gate on §4.1: the brief proposes moving contractors INTO the licence
   basis, which would make this the one fixture in the suite where a figure
   moves. §4.1 was not approved, so the expected licence basis here is 25 — the
   same as 8.A — and the whole fixture is an equality check.

   If §4.1 is later approved, this fixture is where it shows up: licenceCount
   becomes 27 and the monthly quote £270, and NOTHING else may move. A second
   moving figure means contractors have leaked into a route §3.2 excludes them
   from. Two rather than six because a small count makes an off-by-one in the
   basis visible: 25 against 27 reads differently from 25 against 31. */
export const FIXTURE_G = { ...FIXTURE_A, contractors: 2 };

/* Fixture 8.H — 8.A with project managers at 41-50%. PR13 §5.

   8.A is deliberately the least disturbed shape the new input can take, so on
   its own it proves the wiring and not much else. This is the fixture where the
   project-manager share is the dominant term: internal project FTE falls from
   10.8-13.0 to 8.3-10.5 on inputs that are otherwise identical, and every
   rated figure, the growth ceiling, the licence basis and the reported spend
   are asserted equal to 8.A's. A routing leak that 8.A would show as a rounding
   wobble shows here as a whole FTE.

   Its corroboration lands on a different branch from 8.A's, and that is the
   feature rather than a side effect: part-time managers imply less change
   effort, so the same stated 72% that sat inside 8.A's window sits below this
   one. The check is a named consumer of internal project FTE, so this is the
   input reaching a route it is meant to reach. */
export const FIXTURE_H = { ...FIXTURE_A, pmPercent2: 41 };

/* Fixture 8.D — 8.A reported in dollars, and nothing else changed. Every rated
   figure, every FTE, the growth ceiling and the licence count must be identical
   to 8.A's. What must go is the whole cost block and every ratio that crosses
   the two currencies, including ProjexaR's price as a share of reported spend.

   The currency bug was invisible for three releases for one reason: every
   fixture was sterling. Same shape of blindness as the contractor routing,
   which was invisible while every fixture carried zero contractors. A fixture
   set that covers only the representative case cannot see the branches. */
export const FIXTURE_D = { ...FIXTURE_A, currency: 'USD' };

/* Fixtures 8.E and 8.F — 8.A with only the run share moved, so the two
   non-Healthy corroboration branches are pinned by a fixture rather than
   reached only by an assertion shape.

   §2.9's derived run share for 8.A is 71.1% to 75.1%, so with the ±3 tolerance
   the window is 68.1 to 78.1. The branch assignment shipped inverted from PR1
   to PR3 and no fixture ever left the Healthy branch, which is why nobody saw
   it. These two make each branch a fixture with figures typed in by hand.

   Everything else matches 8.A except the reported run work and the non-ticket
   gap, both of which move because the run share moved. */
export const FIXTURE_E = { ...FIXTURE_A, bauSplitEstimate: 82 };
export const FIXTURE_F = { ...FIXTURE_A, bauSplitEstimate: 60 };

function processCombos() {
  const out = [];
  for (const toolset of TOOLSETS)
    for (const resourceVisibility of VISIBILITY)
      for (const budgetTracking of BUDGETS)
        for (const assignmentKnowledge of ASSIGNMENT)
          out.push({ toolset, resourceVisibility, budgetTracking, assignmentKnowledge });
  return out;
}

const PM_COUNTS = [0, 1, 2, 4, 5, 8, 10, 20, 25];
/* Chosen so the sweep lands on both band edges and on the two rounding cases
   the specification calls out, as well as ordinary caseloads. */
const CASELOADS = [0, 2.5, 5.0, 5.04, 6.0, 7.0, 7.05, 9.0, 12.0, 15.0, 25.0];

function numericSweep() {
  const out = [];
  for (const pms of PM_COUNTS) {
    for (const mult of CASELOADS) {
      /* With no PMs there is no caseload to scale, so the multiplier drives the
         portfolio directly and the BAU route binds alone. */
      const live = Math.round((pms || 4) * mult);
      const staff = pms + 25;
      out.push({
        companyHeadcount: Math.max(1200, staff * 2),
        staff, pms, live,
        annual: Math.max(live, Math.round((live * 5) / 3)),
        spend: 367000, currency: 'GBP',
        bauStaff: 20, bauPercent2: 31, pmPercent2: 91, contractors: 0,
        ticketsPerMonth: 960, bauSplitEstimate: 72, loadedSalary: FIXTURE_SALARY,
        toolset: 'mixed', resourceVisibility: 'manual',
        budgetTracking: 'outthedoor', assignmentKnowledge: 'stale',
      });
    }
  }
  return out;
}

export function corpus() {
  const combos = processCombos();
  const shapes = [];
  combos.forEach((p, i) => shapes.push({ id: `A${String(i).padStart(3, '0')}`, ...FIXTURE_A, ...p }));
  combos.forEach((p, i) => shapes.push({ id: `B${String(i).padStart(3, '0')}`, ...FIXTURE_B, ...p }));
  numericSweep().forEach((s, i) => shapes.push({ id: `C${String(i).padStart(3, '0')}`, ...s }));
  return shapes;
}

/* ---------------------------------------------------------------------------
   Assertion shapes. Checked against stated values, never diffed.
   --------------------------------------------------------------------------- */

const BASE = { ...FIXTURE_A };

/* Boundary shapes. Ratios of exactly 5.04, 5.05, 7.04, 7.05, 10.04, 10.05 on
   both tiles. The PM tile takes them via live/pms; the BAU tile via
   live/(bauStaff x share), with the band picked so the adverse endpoint is a
   whole number of effective FTE and the ratio is exact. Carried forward from
   PR1 — the band input changes how the divisor is reached, not what it is. */
export function boundaryShapes() {
  const out = [];
  const RATIOS = [5.04, 5.05, 7.04, 7.05, 10.04, 10.05];

  /* 25 PMs makes every one of these ratios a whole number of live projects. */
  for (const r of RATIOS) {
    const pms = 25, live = Math.round(r * pms);
    out.push({
      id: `bound-pm-${r}`, tile: 'pm', ratio: r,
      ...BASE, pms, live, staff: pms + 25, companyHeadcount: 2000,
      annual: Math.max(live, Math.round(live * 1.5)),
    });
  }
  /* 25 effective BAU FTE at the adverse endpoint: 50 staff on the 51–60 band,
     whose low end is 50%. Same trick on the other divisor. */
  for (const r of RATIOS) {
    const bauStaff = 50, bauPercent2 = 51, fte = bauStaff * 0.5;
    const live = Math.round(r * fte);
    out.push({
      id: `bound-bau-${r}`, tile: 'bau', ratio: r,
      ...BASE, pms: 1, bauStaff, bauPercent2, live,
      staff: bauStaff + 1, companyHeadcount: 2000,
      annual: Math.max(live, Math.round(live * 1.5)),
    });
  }

  /* The two worked cases the specification states in full. */
  out.push({ id: 'bound-worked-176', tile: 'pm', ratio: 7.04, expectDisplay: '7.0',
    expectRating: 'Watch', expectThreshold: 177,
    ...BASE, pms: 25, live: 176, staff: 50, companyHeadcount: 2000, annual: 264 });
  out.push({ id: 'bound-worked-177', tile: 'pm', ratio: 7.08, expectDisplay: '7.1',
    expectRating: 'At risk', expectThreshold: 177,
    ...BASE, pms: 25, live: 177, staff: 50, companyHeadcount: 2000, annual: 266 });

  return out;
}

/* A band straddling a rating boundary. 12 BAU staff on the 41–50% band give
   4.92 to 6.0 effective FTE; 30 live projects over those is 6.1 down to 5.0 —
   Watch at the adverse end, Healthy at the other. The tile must show both
   states, adverse end first, and rate on the adverse one. */
export function straddleShapes() {
  return [
    { id: 'straddle-bau-watch-healthy',
      expectStatus: 'Watch to Healthy', expectRating: 'Watch',
      ...BASE, pms: 5, staff: 30, companyHeadcount: 2000,
      bauStaff: 12, bauPercent2: 41, live: 30, annual: 45 },
    /* 5 BAU staff on 81–90% give 4.05 to 4.5 effective FTE; 45 live over those
       is 11.1 down to 10.0 — At risk at the adverse end, Watch at the other. */
    { id: 'straddle-bau-atrisk-watch',
      expectStatus: 'At risk to Watch', expectRating: 'At risk',
      ...BASE, pms: 5, staff: 30, companyHeadcount: 2000,
      bauStaff: 5, bauPercent2: 81, live: 45, annual: 68 },
  ];
}

/* Toolset invariance. Every toolset value, everything else held constant. No
   toolset input may move a rating, a threshold, the growth ceiling, any
   published figure or either Sender RAG value — the escalation is gone and
   §3.8 puts the signal inside a finding, where it is free to vary. */
export function toolsetInvarianceShapes() {
  return TOOLSETS.map((toolset) => ({ id: `invariance-${toolset}`, ...BASE, toolset }));
}

/* PR13 §2 — project-manager share invariance.

   Every one of the ten bands, everything else held constant at 8.A. The share
   reaches internal_project_fte and nothing else, so across this set the PM tile
   ratio and rating, the BAU tile ratio and rating, the growth ceiling, the
   licence basis, the quote and the share of reported spend must all be
   identical, and every posted Sender field with them.

   The set also has to prove the opposite, or it would pass with the input wired
   to nothing: internal_project_fte must differ between the bottom band and the
   top. An invariance set that only asserts sameness cannot tell a correctly
   routed input from an ignored one. */
export function pmShareInvarianceShapes() {
  return BANDS.map((pmPercent2) => ({ id: `pm-share-${pmPercent2}`, band: pmPercent2, ...BASE, pmPercent2 }));
}

/* Contractor invariance (fixture 8.C). Six contractors against 8.A, and every
   rated figure, threshold, cost figure, the ceiling and the licence count must
   be identical. */
export function contractorShapes() {
  return [
    { id: 'contractors-0', ...FIXTURE_A },
    { id: 'contractors-6', ...FIXTURE_C },
    { id: 'contractors-2', ...FIXTURE_G },
    { id: 'contractors-40', ...FIXTURE_A, contractors: 40 },
  ];
}

/* §1.1 suppression table, one shape per row, plus the full-cost row PR2 adds. */
export function suppressionShapes() {
  return [
    { id: 'suppress-pms-0', row: 'pm_count = 0', ...BASE, pms: 0 },
    { id: 'suppress-bau-0', row: 'bau_staff_on_projects = 0', ...BASE, bauStaff: 0 },
    /* No band selected is caught at validation — the question is required, so
       the report never renders on a blank band. The suppression row's own state
       (bau_effective_fte null, internal_project_fte = pm_count, the BAU tile,
       the BAU route, the corroboration check and the full cost all suppressed)
       is asserted directly against compute() in the suite, because the form
       cannot reach it. */
    { id: 'suppress-band-none', row: 'no band selected', rejects: 'bauPercent2', ...BASE, bauPercent2: '' },
    { id: 'suppress-live-0', row: 'live_projects = 0', ...BASE, live: 0, annual: 0 },
    { id: 'suppress-annual-0', row: 'annual_projects = 0', ...BASE, live: 0, annual: 0 },
    { id: 'suppress-itstaff', row: 'it_staff = 0 (corroboration off)', ...BASE, bauSplitEstimate: null },
    { id: 'suppress-both-routes', row: 'both routes suppressed', ...BASE, pms: 0, bauStaff: 0 },
    /* The full-cost row: suppressed with the BAU tile. */
    { id: 'suppress-fullcost', row: 'full cost suppressed with the BAU tile', ...BASE, bauStaff: 0 },
  ];
}

/* Pluralisation. One shape per prose site that renders a computed integer at
   exactly 1. */
export function singularShapes() {
  return [
    /* Headroom of exactly 1 project a year at both endpoints: 1 PM, 6 live,
       turnover 1.0. pm_red_live = ceil(7.05) = 8, pm_red_annual = 8,
       sustainable = 7, annual = 6 -> headroom +1, and the PM route binds at
       both ends of the band. */
    { id: 'singular-headroom-positive', site: 'headroom (+1)',
      ...BASE, pms: 1, live: 6, annual: 6, staff: 26, bauStaff: 20, bauPercent2: 31 },
    { id: 'singular-headroom-negative', site: 'headroom (-1)',
      ...BASE, pms: 1, live: 8, annual: 8, staff: 26, bauStaff: 20, bauPercent2: 31 },
    { id: 'singular-one-pm', site: 'project manager', ...BASE, pms: 1, staff: 45 },
    { id: 'singular-one-live', site: 'live project', ...BASE, live: 1, annual: 1, pms: 1 },
    { id: 'singular-one-bau', site: 'BAU person', ...BASE, bauStaff: 1, bauPercent2: 91 },
    { id: 'singular-one-contractor', site: 'contractor', ...BASE, contractors: 1 },
  ];
}

/* PR10 §4 — the notation threshold.

   moneySpan() switches a money range from whole pounds to millions when the
   HIGH endpoint reaches £1,000,000, and it reads the DISPLAYED pound rather
   than the raw float. Both halves matter and neither is asserted anywhere else:
   the first is why one quantity can be in pounds while another on the same page
   is in millions, and the second is why a figure whose raw value is 999,999.54
   prints as £1.00m.

   Two shapes, one on each side of the crossing, differing by a penny of salary.
   8.A with 25 BAU staff puts internalEffortCost's high endpoint within a pound
   of the threshold; the salary moves it across.

     48154.73 -> raw 999,999.33, rounds to   999,999 -> £849,999–£999,999
     48154.74 -> raw 999,999.54, rounds to 1,000,000 -> £0.85m–£1.00m

   The full portfolio cost stays at £1.22m–£1.37m on both, which is the case the
   §4 assertion exists for: two money quantities in two different units, on one
   page, in one report, and each of them the same in all three places it is
   printed. */
export function notationShapes() {
  return [
    { id: 'notation-below', side: 'below the threshold',
      ...FIXTURE_A, bauStaff: 25, loadedSalary: 48154.73 },
    { id: 'notation-above', side: 'above the threshold',
      ...FIXTURE_A, bauStaff: 25, loadedSalary: 48154.74 },
  ];
}

/* The epsilon case, and it was never where the suite thought it was.

   roundN carries `+ 1e-9`, and the reason given for it everywhere is that 1.095
   is 1.09499999999999997 in IEEE 754 and rounds to 1.09 without it. That is
   true of the LITERAL. It is not true of 1095000/1e6, which comes out of the
   division with a bit pattern that multiplies to exactly 109.5 — so fixture
   8.A's £1,095,000 went through gbpBig identically with the epsilon and
   without it, and "the epsilon case does not render £1.09m" passed for a reason
   that had nothing to do with the epsilon. Confirmed by removing the epsilon
   from the tool and watching the whole suite stay green.

   £1,005,000 is a real one: 1.005 x 100 is 100.49999999999999, so it renders as
   £1.00m without the epsilon and £1.01m with it. Pinned here, and the shape is
   built to land on it:

     internal FTE at the adverse endpoint is 10.8, and the salary below makes
     the loaded cost £59,074.074, so the internal effort cost is exactly
     £638,000 and the full portfolio cost exactly £1,005,000.

   Contrived on the salary, like notationShapes() and for the same reason: a
   formatter boundary is pinned by a value chosen to land on it. */
export const EPSILON_SALARY = (638000 / 10.8 + NI_THRESHOLD * NI_RATE) / (1 + NI_RATE + OVERHEAD_RATE);
export function epsilonShape() {
  return { id: 'epsilon-1005', ...FIXTURE_A, loadedSalary: EPSILON_SALARY };
}

/* Corroboration, all three outcomes in their new home. The derived run share
   for 8.A is 71.1% to 75.1%, so the window is 68.1 to 78.1.

   Above the window is the Watch and below it is the note. The derivation is
   blind to delivery staff who hold no BAU role, so it understates the change
   share — and through 100 − x that OVERstates the run share, which puts the
   derived window above the truth and the respondent's stated figure below it.
   Below is therefore the side the asymmetry protects. It read the other way
   round from PR1 to PR3. */
export function corroborationShapes() {
  return [
    { id: 'corrob-healthy', expect: 'Healthy', ...BASE, bauSplitEstimate: 72 },
    /* Above the window: we derive more change effort than they reported. The
       expected cause is project managers who also carry run work. */
    { id: 'corrob-watch', expect: 'Watch', ...BASE, bauSplitEstimate: 90 },
    /* Below the window: we derive less. The expected cause is delivery staff
       with no BAU role, whom this check cannot see. Stated, never rated. */
    { id: 'corrob-note', expect: 'note', ...BASE, bauSplitEstimate: 50 },
    /* No project managers, above the window. The PM explanation cannot apply,
       so the Watch copy must not offer it. */
    { id: 'corrob-watch-nopm', expect: 'Watch', ...BASE, pms: 0, bauSplitEstimate: 95 },
  ];
}

/* One shape per currency option. The cost block runs on GBP and is suppressed
   on the other five, with the reason stated and no cross-currency ratio left
   anywhere in the report. */
export const CURRENCIES = ['GBP', 'USD', 'EUR', 'AUD', 'NZD', 'CAD'];
export function currencyShapes() {
  return CURRENCIES.map((currency) => ({
    id: `currency-${currency}`, prices: currency === 'GBP', ...BASE, currency,
  }));
}

/* Budgets carrying internal staff time: the non-summing path, the hero swap and
   finding 4 returning Healthy. Every budgets answer other than out-the-door
   must take the non-summing path. */
export function budgetShapes() {
  return BUDGETS.map((budgetTracking) => ({
    id: `budgets-${budgetTracking}`, budgetTracking,
    sums: budgetTracking === 'outthedoor',
    ...BASE, budgetTracking,
  }));
}

/* An edited loaded cost. It must reach the tile, the workings, the printed
   report and the shared link — a forwarded report showing different numbers
   from the ones the respondent saw is worse than no edit control. */
export function loadedCostShapes() {
  return [
    { id: 'loaded-default', ...BASE, loadedSalary: null },
    { id: 'loaded-edited', ...BASE, loadedSalary: 40000 },
    { id: 'loaded-below-ni-threshold', ...BASE, loadedSalary: 4000 },
  ];
}

/* Legacy shared URLs carry a free-text percentage where the band now sits. */
export const LEGACY_BAND_CASES = [
  ['37', 31], ['1', 1], ['10', 1], ['11', 11], ['90', 81], ['91', 91], ['100', 91],
  ['120', 91], ['0', null], ['-5', null], ['', null], ['abc', null],
];

export const INPUT_KEYS = [
  'companyHeadcount', 'staff', 'pms', 'live', 'annual', 'spend', 'currency',
  'bauStaff', 'bauPercent2', 'pmPercent2', 'contractors', 'ticketsPerMonth', 'bauSplitEstimate',
  'loadedSalary',
  'toolset', 'resourceVisibility', 'budgetTracking', 'assignmentKnowledge',
];
