/* Independent oracle.
   ---------------------------------------------------------------------------
   Every formula here is transcribed from the change specification, not from the
   tool. The point of the exercise is that the two are written separately and
   then made to agree; importing anything from the page would defeat it.

   Review response §2.8: a numeric output asserted against the implementation
   that produced it is not asserted at all. So the suite compares the tool's
   numbers to these, and a mismatch is a failure rather than a category. */

/* §2.3. One epsilon-safe helper at every precision. The epsilon is not
   decoration: 1.095 is 1.09499999999999997 in IEEE 754 and rounds to 1.09
   without it, which is the difference between the fixture's £1.10m and a wrong
   hero figure. */
export function roundN(x, n) { const p = 10 ** n; return Math.round(x * p + 1e-9) / p; }
export function round1(x) { return roundN(x, 1); }
export function redThreshold(cap, d) { return Math.ceil((cap + 0.05) * d - 1e-9); }
export function ifloor(x) { return Math.floor(x + 1e-9); }

/* §2.1/§2.2 bands, stated with explicit operators so nothing between 5.0 and
   6.0 is left unrated. Rated on the rounded, displayed value. */
export const PM_WATCH = 5.0, PM_RED = 7.0;
export const BAU_WATCH = 5.0, BAU_RED = 10.0;

export function bandPM(ratio) {
  const r = round1(ratio);
  return r > PM_RED ? 'At risk' : r > PM_WATCH ? 'Watch' : 'Healthy';
}
export function bandBAU(ratio) {
  const r = round1(ratio);
  return r > BAU_RED ? 'At risk' : r > BAU_WATCH ? 'Watch' : 'Healthy';
}

export const CORROBORATION_TOLERANCE = 3;

/* The 0.41 to 1.38 tickets-per-employee range is deliberately absent. It
   compared a benchmark whose denominator is seats supported against a figure
   whose denominator is company headcount, described desktop support where our
   numerator is service desk, and was spliced from a 2012 floor and a 2019
   ceiling that neither edition published. §2 removes the comparison rather than
   caveating it, and asserts the derived figure is undefined on every shape. */

/* §3.6. Two published anchors, and the window between them is ProjexaR's.

   The anchors are published in different units — HDI/MetricNet per technician
   per month, Jitbit per technician per day — so comparing them needs a
   working-days figure. That figure is ours, and the page must state it: a
   conversion made silently replaces an unattributed number with an unexplained
   one. WORKING_DAYS is here so the suite can assert both units agree. */
export const TICKETS_LO = 170, TICKETS_HI = 320;
export const WORKING_DAYS = 21;
export const JITBIT_PER_DAY = 21;
export const HDI_LO = 87, HDI_HI = 133;

/* The cost calculation runs on one currency only. The loaded cost is built on
   ONS ASHE, a UK survey, so it prices a UK department. Pricing a department's
   effort at UK salaries is wrong whichever currency they report in, and an
   exchange rate does not repair it — the salaries would still belong to the
   wrong labour market. The currency selector is the only signal the tool has
   about where the department is, so it is the one that gates. */
export const COST_CURRENCY = 'GBP';
export function pricesCosts(v) { return v.currency === COST_CURRENCY; }

/* §3.3. Employer NI verified against gov.uk for 2026/27; the overhead is
   ProjexaR's declared judgement. */
export const NI_RATE = 0.15, NI_THRESHOLD = 5000, OVERHEAD_RATE = 0.25;

export function loadedCost(salary) {
  const ni = NI_RATE * Math.max(0, salary - NI_THRESHOLD);
  const overhead = OVERHEAD_RATE * salary;
  /* PR14 §2. The total is money and is held to the penny. The workings
     multiply the displayed internal FTE by it and print it as an operand, so
     its precision has to be bounded or that row cannot print a figure a reader
     can multiply: a salary entered with pence carries three decimal places into
     1.4 x salary - 750. A whole-pound salary reaches one decimal place at most
     and is untouched. */
  return { salary, ni, overhead, total: roundN(salary + ni + overhead, 2) };
}

/* The salary that produces a given loaded cost. The fixtures pin the loaded
   cost, because a fixture that moves when ONS republishes is not a fixture, and
   the respondent-editable value is the salary — so the two are related by this
   inversion rather than by a second input. */
export function salaryForLoadedCost(target) {
  return (target + NI_THRESHOLD * NI_RATE) / (1 + NI_RATE + OVERHEAD_RATE);
}

/* §1 named quantities. `e` is the band endpoint: 0 the bottom of the band the
   respondent picked, 1 the top. Lower time on projects means less effective BAU
   capacity, so endpoint 0 is the adverse one throughout and every rating reads
   it. internal_project_fte is permanent staff only in every use — contractors
   are never added to it. */
export const E_LO = 0, E_HI = 1;

export function bandEndpoints(v) {
  const lo = v.bauPercent2 === null || v.bauPercent2 === '' ? null : Number(v.bauPercent2);
  return lo === null ? [null, null] : [lo, lo + 9];
}

export function blendedShare(v, e) {
  const b = bandEndpoints(v);
  return b[0] === null ? null : b[e] / 100;
}
export function bauEffectiveFte(v, e) {
  const share = blendedShare(v, e);
  if (share === null || v.bauStaff === 0) return null;
  return v.bauStaff * share;
}

/* PR13. The share of a project manager's time that goes to project management,
   on the same ten-point bands as the BAU question.

   Three states and they are not two: no project managers means no share to have
   (0, and the question is not asked); a band means the share at that endpoint;
   and asked-but-unanswered means null, which only a link saved before the
   question existed can produce. Null suppresses internal_project_fte and
   everything downstream of it, because a link carrying no answer is not a link
   answering 100% and this input exists to stop the tool treating it as one. */
export function pmBandEndpoints(v) {
  const raw = v.pmPercent2;
  const lo = raw === null || raw === undefined || raw === '' ? null : Number(raw);
  return lo === null ? [null, null] : [lo, lo + 9];
}
export function pmShare(v, e) {
  if (v.pms === 0) return 0;
  const b = pmBandEndpoints(v);
  return b[0] === null ? null : b[e] / 100;
}

/* Rounded at source. This is a published figure, and the workings print it
   beside the BAU figure with their sum in the next column, then multiply that
   sum by the loaded cost. Five managers at 91% is 4.55, and a page adding
   "4.6 + 6.2" to a total of 10.75 is the fault this release exists to correct
   one row further down the same table. §2.3. */
export function pmProjectFte(v, e) {
  const share = pmShare(v, e);
  return share === null ? null : round1(v.pms * share);
}

/* The sum of the two DISPLAYED components rather than of the two raw ones, for
   the same reason and by the same rule. bau_effective_fte itself stays raw: it
   is the divisor the BAU tile and the growth ceiling publish, and rounding it
   there would move a rating. */
export function internalProjectFte(v, e) {
  const pm = pmProjectFte(v, e);
  if (pm === null) return null;
  const bau = bauEffectiveFte(v, e);
  /* round1 over the sum as well as over each part. Two exact tenths added in
     IEEE 754 are not an exact tenth: 0.9 + 6.2 is 7.1000000000000005, which
     displays as 7.1 and is not 7.1, and the difference reaches the cost
     figure and the magnitude threshold that formats it. */
  return round1(pm + (bau === null ? 0 : round1(bau)));
}

/* §3.5. A legacy free-text percentage maps to the band containing it. */
export function bandContaining(p) {
  const n = Number(p);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 91) return 91;
  return Math.floor((Math.ceil(n) - 1) / 10) * 10 + 1;
}

/* §4.1. What the report displays in place of the turnover multiple. Turnover
   itself is retained — the growth ceiling projects a live-project threshold
   forward at that pace — but is displayed nowhere.

   It is a derivation, not a measurement: the ratio of live work to annual pace
   describes portfolio throughput on the assumption of a steady state. The page
   is required to say so beside the figure. Suppressed at either input zero
   (§1.1); validation holds annual >= live, so they go absent together. */
export function typicalDurationMonths(v) {
  return v.live > 0 && v.annual > 0 ? roundN((v.live / v.annual) * 12, 1) : null;
}

/* §4.2. Permanent IT staff as a share of company headcount. Contractors are
   never in the numerator (§3.2), which is why this takes v.staff and nothing
   is added to it. Suppressed at either input zero (§1.1) — unreachable through
   the form, which requires both at 1 or above, so the suite asserts it against
   compute() directly. Not rated: this is context, not a capacity measure. */
export function itShare(v) {
  return v.companyHeadcount > 0 && v.staff > 0
    ? round1((v.staff / v.companyHeadcount) * 100) : null;
}

/* One endpoint's worth of derived quantities. */
function at(v, e, shared) {
  const o = {};
  o.bauEffectiveFte = bauEffectiveFte(v, e);
  o.pmProjectFte = pmProjectFte(v, e);
  o.internalProjectFte = internalProjectFte(v, e);
  o.bauSuppressed = o.bauEffectiveFte === null;
  /* The project-manager share was asked and not answered. A separate absence
     from the BAU one, with its own reason on the page. */
  o.noPmShare = o.internalProjectFte === null;

  o.bauRatio = o.bauSuppressed ? null : v.live / o.bauEffectiveFte;
  o.bauDisplay = o.bauRatio === null ? null : round1(o.bauRatio);
  o.ragBAU = o.bauRatio === null ? null : bandBAU(o.bauRatio);

  /* §3.2. Displayed, unrated, and read by nothing that carries a rating. */
  o.deliveryPerFte = (!v.contractors || o.bauSuppressed || v.live === 0)
    ? null : v.live / (o.bauEffectiveFte + v.contractors);

  o.bauRedLive = o.bauSuppressed ? null : redThreshold(BAU_RED, o.bauEffectiveFte);
  o.bauRedAnnual = o.bauRedLive === null || shared.turnover === null
    ? null : ifloor((o.bauRedLive - 1) * shared.turnover) + 1;

  const routes = [];
  if (shared.pmRedAnnual !== null) routes.push(['Concurrent projects per PM', shared.pmRedAnnual - 1]);
  if (o.bauRedAnnual !== null) routes.push(['Live projects per effective BAU FTE', o.bauRedAnnual - 1]);
  if (!routes.length) {
    o.sustainableAnnual = null; o.headroom = null; o.binding = null;
  } else {
    routes.sort((a, b) => a[1] - b[1]);
    o.sustainableAnnual = routes[0][1];
    o.binding = routes[0][0];
    o.headroom = o.sustainableAnnual - v.annual;
  }

  const statedRun = v.bauSplitEstimate;
  if (o.bauSuppressed || o.noPmShare || v.staff === 0 || statedRun === null || statedRun === undefined) {
    o.derivedChangeShare = null; o.derivedRunShare = null;
  } else {
    /* Both off the displayed internal FTE, and the run share off the displayed
       change share, because the workings print "100% − <change>" beside the run
       figure and a reader doing that subtraction has to reach the number the
       page prints. */
    o.derivedChangeShare = round1((o.internalProjectFte / v.staff) * 100);
    o.derivedRunShare = round1(100 - o.derivedChangeShare);
  }

  /* §3.1. Suppressed with the BAU tile; summed only on an explicit
     out-the-door answer. §2.2: the sum uses the rounded, displayed internal
     figure, so a reader adding the two printed numbers gets the printed total,
     and it is rounded the way the display rounds (PR14 §2). */
  if (o.bauSuppressed || o.noPmShare || !shared.priceCosts) {
    o.internalEffortCost = null; o.fullPortfolioCost = null; o.reportedShare = null;
  } else {
    o.internalEffortCost = o.internalProjectFte * shared.loaded.total;
    if (shared.sums) {
      /* roundN, not Math.round: the display rounds through roundN, and the two
         disagree wherever the cost lands a float hair below a half. PR14 §2. */
      o.fullPortfolioCost = roundN(o.internalEffortCost, 0) + v.spend;
      o.reportedShare = (v.spend / o.fullPortfolioCost) * 100;
    } else {
      o.fullPortfolioCost = null; o.reportedShare = null;
    }
  }
  return o;
}

export function evaluate(v) {
  const o = {};

  o.turnover = v.live > 0 && v.annual > 0 ? v.annual / v.live : null;
  o.typicalDurationMonths = typicalDurationMonths(v);
  o.itShare = itShare(v);
  o.loaded = loadedCost(v.loadedSalary === undefined || v.loadedSalary === null
    ? 56348 : v.loadedSalary);
  o.sums = v.budgetTracking === 'outthedoor' && v.spend !== null && v.spend > 0;
  o.priceCosts = pricesCosts(v);

  /* Band-independent. Concurrent projects per PM does not move with the band. */
  o.pmSuppressed = v.pms === 0;
  o.pmRatio = o.pmSuppressed ? null : v.live / v.pms;
  o.pmDisplay = o.pmRatio === null ? null : round1(o.pmRatio);
  o.ragPM = o.pmRatio === null ? null : bandPM(o.pmRatio);
  o.pmRedLive = o.pmSuppressed ? null : redThreshold(PM_RED, v.pms);
  o.pmRedAnnual = o.pmRedLive === null || o.turnover === null
    ? null : ifloor((o.pmRedLive - 1) * o.turnover) + 1;

  const shared = {
    turnover: o.turnover, loaded: o.loaded, sums: o.sums, pmRedAnnual: o.pmRedAnnual,
    priceCosts: o.priceCosts,
  };
  o.at = [at(v, E_LO, shared), at(v, E_HI, shared)];
  o.adv = o.at[E_LO];

  /* Names the corpus checks read. Every one of them is the adverse endpoint,
     which is the endpoint every rating and every Sender field is computed from. */
  o.bauEffectiveFte = o.adv.bauEffectiveFte;
  o.bauSuppressed = o.adv.bauSuppressed;
  o.noPmShare = o.adv.noPmShare;
  o.bauRatio = o.adv.bauRatio;
  o.bauDisplay = o.adv.bauDisplay;
  o.ragBAU = o.adv.ragBAU;
  o.bauRedLive = o.adv.bauRedLive;
  o.bauRedAnnual = o.adv.bauRedAnnual;
  o.sustainableAnnual = o.adv.sustainableAnnual;
  o.headroom = o.adv.headroom;
  o.binding = o.adv.binding;

  /* §3.6. The ticket range comes from the divisor window, not from the band.
     The run-work gap is taken off the DISPLAYED figures (§2.2): 13.4 − 4.4
     reads 9.0, never the 9.1 the raw floats give. */
  o.ticketFte = v.ticketsPerMonth === null || v.ticketsPerMonth === undefined
    ? null : [v.ticketsPerMonth / TICKETS_HI, v.ticketsPerMonth / TICKETS_LO];
  o.runWorkFte = v.bauSplitEstimate === null || v.bauSplitEstimate === undefined
    ? null : (v.staff * v.bauSplitEstimate) / 100;
  o.runWorkGap = o.ticketFte === null || o.runWorkFte === null ? null
    : [round1(round1(o.runWorkFte) - round1(o.ticketFte[1])),
       round1(round1(o.runWorkFte) - round1(o.ticketFte[0]))];

  /* §2.9, against the endpoints of the derived range with the tolerance applied
     outward from each. Asymmetric, and BELOW the window is the note.

     The spec's own condition table has this the other way round, and its two
     prose descriptions of those conditions are arithmetically false. The
     derivation is blind to delivery staff who hold no BAU role, so it
     understates the change share — which through 100 − x OVERstates the run
     share, putting the derived window above the truth and the respondent's
     stated figure below it. That is the case the asymmetry exists to protect,
     so that is the side that carries no rating.

     Above the window is the Watch. A department whose project managers also
     carry run work has its change share overstated and lands there, which is an
     expected bias rather than a fault, so §3 requires the Watch copy to name it
     first rather than merely flag. */
  if (o.at[E_LO].derivedRunShare === null) {
    o.derivedRunShare = null; o.derivedChangeShare = null; o.corroboration = null;
  } else {
    const runs = [o.at[E_LO].derivedRunShare, o.at[E_HI].derivedRunShare].sort((a, b) => a - b);
    const changes = [o.at[E_LO].derivedChangeShare, o.at[E_HI].derivedChangeShare].sort((a, b) => a - b);
    o.derivedRunShare = runs;
    o.derivedChangeShare = changes;
    const lo = round1(runs[0] - CORROBORATION_TOLERANCE);
    const hi = round1(runs[1] + CORROBORATION_TOLERANCE);
    o.corroboration = v.bauSplitEstimate > hi ? 'Watch' : v.bauSplitEstimate < lo ? 'note' : 'Healthy';
  }

  /* §3.7. Twelve months for the price of ten — the annual plan, paid upfront.

     §4.1, PR7. The basis is BAU staff on projects, plus PMs, plus contractors.
     Contractors were excluded until PR7 and that was a commercial error: a
     managed resource is a person with capacity recorded in the system, and a
     contractor on project work has capacity recorded.

     This is the one quantity in the oracle that contractors reach. Every other
     figure here is permanent-only, and fixture 8.G asserts that by equality
     against 8.A. */
  o.licenceCount = v.bauStaff + v.pms + v.contractors;
  o.yearly = o.licenceCount * 100;
  /* A sterling price over a spend reported in another currency is a ratio
     across two currencies. It goes with the rest of the cost block; the price
     itself still publishes, in sterling, without a percentage. */
  o.spendPct = o.priceCosts && v.spend !== null && v.spend > 0 ? (o.yearly / v.spend) * 100 : null;
  o.fullCostPct = o.at[E_LO].fullPortfolioCost === null ? null
    : [(o.yearly / o.at[E_LO].fullPortfolioCost) * 100, (o.yearly / o.at[E_HI].fullPortfolioCost) * 100];

  return o;
}

/* §3.8. The three adverse conditions, and the state they produce. Each is the
   absence of one of the things that would make a single current view possible. */
export function finding2State(v) {
  const adverse = [
    v.toolset !== 'ppm',
    v.resourceVisibility !== 'dedicated',
    v.assignmentKnowledge !== 'live',
  ].filter(Boolean).length;
  return { adverse, state: adverse === 0 ? 'Healthy' : adverse === 3 ? 'At risk' : 'Watch' };
}
export function finding3State(v) { return v.assignmentKnowledge === 'live' ? 'Healthy' : 'Watch'; }
export function finding4State(v) { return v.budgetTracking === 'tracked' ? 'Healthy' : 'Watch'; }
