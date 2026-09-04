/* Independent oracle.
   ---------------------------------------------------------------------------
   Every formula here is transcribed from the PR1 brief, not from the tool. The
   point of the exercise is that the two are written separately and then made to
   agree; importing anything from the page would defeat it.

   Review response §2.8: a numeric output asserted against the implementation
   that produced it is not asserted at all. So the suite compares the tool's
   numbers to these, and a mismatch is a failure rather than a category. */

/* §3.2. The epsilons are carried as the brief specifies them. */
export function round1(x) { return Math.round(x * 10 + 1e-9) / 10; }
export function redThreshold(cap, d) { return Math.ceil((cap + 0.05) * d - 1e-9); }
export function ifloor(x) { return Math.floor(x + 1e-9); }

/* §3.3 bands, stated with explicit operators so nothing between 5.0 and 6.0 is
   left unrated. Rated on the rounded, displayed value. */
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

/* §3.1 named quantities. `e` is the band endpoint; PR1 has one, PR2 has two. */
export function blendedShare(v /* , e */) {
  return v.bauPercent2 === null || v.bauPercent2 === '' ? null : v.bauPercent2 / 100;
}
export function bauEffectiveFte(v, e) {
  const share = blendedShare(v, e);
  if (share === null || v.bauStaff === 0) return null;
  return v.bauStaff * share;
}
export function internalProjectFte(v, e) {
  const bau = bauEffectiveFte(v, e);
  return v.pms + (bau === null ? 0 : bau);
}

export function evaluate(v, e = 0) {
  const o = {};

  o.bauEffectiveFte = bauEffectiveFte(v, e);
  o.internalProjectFte = internalProjectFte(v, e);

  /* §3.6 suppression. */
  o.pmSuppressed = v.pms === 0;
  o.bauSuppressed = o.bauEffectiveFte === null;

  o.pmRatio = o.pmSuppressed ? null : v.live / v.pms;
  o.bauRatio = o.bauSuppressed ? null : v.live / o.bauEffectiveFte;
  o.pmDisplay = o.pmRatio === null ? null : round1(o.pmRatio);
  o.bauDisplay = o.bauRatio === null ? null : round1(o.bauRatio);
  o.ragPM = o.pmRatio === null ? null : bandPM(o.pmRatio);
  o.ragBAU = o.bauRatio === null ? null : bandBAU(o.bauRatio);

  /* turnover is undefined with nothing live and with no annual pace. */
  o.turnover = v.live > 0 && v.annual > 0 ? v.annual / v.live : null;

  o.pmRedLive = o.pmSuppressed ? null : redThreshold(PM_RED, v.pms);
  o.bauRedLive = o.bauSuppressed ? null : redThreshold(BAU_RED, o.bauEffectiveFte);

  o.pmRedAnnual = o.pmRedLive === null || o.turnover === null
    ? null : ifloor((o.pmRedLive - 1) * o.turnover) + 1;
  o.bauRedAnnual = o.bauRedLive === null || o.turnover === null
    ? null : ifloor((o.bauRedLive - 1) * o.turnover) + 1;

  /* §3.5 growth ceiling. min over the routes that survive suppression. */
  const routes = [];
  if (o.pmRedAnnual !== null) routes.push(['Concurrent projects per PM', o.pmRedAnnual - 1]);
  if (o.bauRedAnnual !== null) routes.push(['Live projects per effective BAU FTE', o.bauRedAnnual - 1]);

  if (!routes.length) {
    o.sustainableAnnual = null; o.headroom = null; o.binding = null;
  } else {
    routes.sort((a, b) => a[1] - b[1]);
    o.sustainableAnnual = routes[0][1];
    o.binding = routes[0][0];
    o.headroom = o.sustainableAnnual - v.annual;
  }

  /* §3.8 corroboration. Asymmetric: above the window is a note, not a fault. */
  const statedRun = v.bauSplitEstimate;
  if (o.bauSuppressed || v.staff === 0 || statedRun === null || statedRun === undefined) {
    o.derivedRunShare = null; o.corroboration = null;
  } else {
    o.derivedChangeShare = round1((o.internalProjectFte / v.staff) * 100);
    o.derivedRunShare = round1((1 - o.internalProjectFte / v.staff) * 100);
    const lo = o.derivedRunShare - CORROBORATION_TOLERANCE;
    const hi = o.derivedRunShare + CORROBORATION_TOLERANCE;
    o.corroboration = statedRun < lo ? 'Watch' : statedRun > hi ? 'note' : 'Healthy';
  }

  return o;
}
