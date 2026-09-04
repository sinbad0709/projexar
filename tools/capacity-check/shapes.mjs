/* The shape corpus.
   ---------------------------------------------------------------------------
   No baseline existed in the repo, so this file defines one. The construction
   is deliberate rather than sampled, so the same 603 shapes come back on every
   run and the count means something:

     Set A  252  every tools-and-process combination, at fixture 4.A's numbers
     Set B  252  the same combinations, at fixture 4.B's numbers
     Set C   99  a numeric sweep at one fixed tools-and-process profile
                 (9 PM counts x 11 caseload multipliers)
     ------ ---
            603

   Sets A and B hold the arithmetic still and move the wording; set C does the
   reverse. Between them every branch of the copy and every band boundary is
   reached at least once.

   The assertion shapes below are not part of the 603. They exist to be checked
   against stated values, not diffed. */

export const TOOLSETS = ['excel', 'msproject', 'planner', 'ppm', 'mixed', 'none', 'other'];
export const VISIBILITY = ['none', 'manual', 'dedicated'];
export const BUDGETS = ['outthedoor', 'varies', 'partial', 'tracked'];
export const ASSIGNMENT = ['none', 'stale', 'live'];

/* Fixture 4.A — the strained department. */
export const FIXTURE_A = {
  companyHeadcount: 1200, staff: 45, pms: 5, live: 45, annual: 75, spend: 367000,
  currency: 'GBP', bauStaff: 20, bauPercent2: 37, ticketsPerMonth: 960, bauSplitEstimate: 72,
  toolset: 'mixed', resourceVisibility: 'manual', budgetTracking: 'outthedoor',
  assignmentKnowledge: 'stale',
};

/* Fixture 4.B — the well-run department. Healthy has to be reachable. */
export const FIXTURE_B = {
  companyHeadcount: 600, staff: 24, pms: 4, live: 16, annual: 24, spend: 180000,
  currency: 'GBP', bauStaff: 10, bauPercent2: 65, ticketsPerMonth: 1400, bauSplitEstimate: 56,
  toolset: 'ppm', resourceVisibility: 'dedicated', budgetTracking: 'tracked',
  assignmentKnowledge: 'live',
};

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
   the brief calls out, as well as ordinary caseloads. */
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
        bauStaff: 20, bauPercent2: 37, ticketsPerMonth: 960, bauSplitEstimate: 72,
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

/* §5 boundary shapes. Ratios of exactly 5.04, 5.05, 7.04, 7.05, 10.04, 10.05 on
   both tiles. The PM tile takes them via live/pms; the BAU tile via
   live/(bauStaff x share), with the share picked so the divisor is a whole
   number of effective FTE and the ratio is exact. */
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
  /* 25 effective BAU FTE: 50 staff at 50%. Same trick on the other divisor. */
  for (const r of RATIOS) {
    const bauStaff = 50, bauPercent2 = 50, fte = bauStaff * (bauPercent2 / 100);
    const live = Math.round(r * fte);
    out.push({
      id: `bound-bau-${r}`, tile: 'bau', ratio: r,
      ...BASE, pms: 1, bauStaff, bauPercent2, live,
      staff: bauStaff + 1, companyHeadcount: 2000,
      annual: Math.max(live, Math.round(live * 1.5)),
    });
  }

  /* The two worked cases the brief states in full. */
  out.push({ id: 'bound-worked-176', tile: 'pm', ratio: 7.04, expectDisplay: '7.0',
    expectRating: 'Watch', expectThreshold: 177,
    ...BASE, pms: 25, live: 176, staff: 50, companyHeadcount: 2000, annual: 264 });
  out.push({ id: 'bound-worked-177', tile: 'pm', ratio: 7.08, expectDisplay: '7.1',
    expectRating: 'At risk', expectThreshold: 177,
    ...BASE, pms: 25, live: 177, staff: 50, companyHeadcount: 2000, annual: 266 });

  return out;
}

/* §5 toolset invariance. Every toolset value, everything else held constant. */
export function toolsetInvarianceShapes() {
  return TOOLSETS.map((toolset) => ({ id: `invariance-${toolset}`, ...BASE, toolset }));
}

/* §3.6 suppression table, one shape per row. */
export function suppressionShapes() {
  return [
    { id: 'suppress-pms-0', row: 'pm_count = 0', ...BASE, pms: 0 },
    { id: 'suppress-bau-0', row: 'bau_staff_on_projects = 0', ...BASE, bauStaff: 0 },
    { id: 'suppress-live-0', row: 'live_projects = 0', ...BASE, live: 0, annual: 0 },
    { id: 'suppress-annual-0', row: 'annual_projects = 0', ...BASE, live: 0, annual: 0 },
    { id: 'suppress-itstaff', row: 'it_staff = 0 (corroboration off)', ...BASE, bauSplitEstimate: null },
    { id: 'suppress-both-routes', row: 'both routes suppressed', ...BASE, pms: 0, bauStaff: 0 },
  ];
}

/* §3.5 pluralisation. One shape per prose site that renders a computed integer
   at exactly 1. */
export function singularShapes() {
  return [
    /* headroom of exactly 1 project a year: 1 PM, 5 live, turnover 1.0.
       pm_red_live = ceil(7.05) = 8, pm_red_annual = floor(7 x 1) + 1 = 8,
       sustainable = 7, annual = 6 -> headroom +1. */
    { id: 'singular-headroom-positive', site: 'headroom (+1)',
      ...BASE, pms: 1, live: 6, annual: 6, staff: 26, bauStaff: 20, bauPercent2: 37 },
    /* One project a year over the sustainable pace: 1 PM, 8 live, turnover 1.0.
       pm_red_live = ceil(7.05) = 8, pm_red_annual = floor(7 x 1) + 1 = 8,
       sustainable = 7, annual = 8 -> headroom -1. */
    { id: 'singular-headroom-negative', site: 'headroom (-1)',
      ...BASE, pms: 1, live: 8, annual: 8, staff: 26, bauStaff: 20, bauPercent2: 37 },
    { id: 'singular-one-pm', site: 'project manager', ...BASE, pms: 1, staff: 45 },
    { id: 'singular-one-live', site: 'live project', ...BASE, live: 1, annual: 1, pms: 1 },
    { id: 'singular-one-bau', site: 'BAU person', ...BASE, bauStaff: 1, bauPercent2: 100 },
  ];
}

/* §3.8 corroboration, all three outcomes. Derived run share for fixture 4.A is
   72.4%, so the window is 69.4 to 75.4. */
export function corroborationShapes() {
  return [
    { id: 'corrob-healthy', expect: 'Healthy', ...BASE, bauSplitEstimate: 72 },
    { id: 'corrob-note', expect: 'note', ...BASE, bauSplitEstimate: 90 },
    { id: 'corrob-watch', expect: 'Watch', ...BASE, bauSplitEstimate: 50 },
  ];
}

export const INPUT_KEYS = [
  'companyHeadcount', 'staff', 'pms', 'live', 'annual', 'spend', 'currency',
  'bauStaff', 'bauPercent2', 'ticketsPerMonth', 'bauSplitEstimate',
  'toolset', 'resourceVisibility', 'budgetTracking', 'assignmentKnowledge',
];
