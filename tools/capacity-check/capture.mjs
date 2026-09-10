/* Drive one shape through the real page and record what it rendered.
   ---------------------------------------------------------------------------
   The suite goes through the page's own submit handler rather than calling
   `compute` directly, so render() and renderPrint() both run and every node the
   tool writes into is captured — screen, printed report and Sender payload. */

import { readFileSync } from 'node:fs';
import { loadTool, TOOL_PATH } from './harness.mjs';
import { INPUT_KEYS } from './shapes.mjs';

/* The printed report also carries copy written straight into the markup — the
   methodology page, the bands statement, "What this does not account for", the
   four steps, the sources heading. All of it is output and all of it goes into
   the PDF, and until now no capture reached any of it: eighteen published
   numbers sat outside the suite entirely, so editing one caught nothing. The
   copy rule was extended to this layer in PR2; the numbers were not.

   Read here so it joins allText() with everything the page rendered. Comments
   are stripped first — the tag regex in allText() would leave their contents
   behind, and a note about the copy is not the copy.

   Cached per file. It is identical for every shape, and re-reading a 220KB file
   once per capture to get the same string back is pure waste. */
const staticCache = new Map();

export function staticReportText(path = TOOL_PATH) {
  return slice(path, 'print', '<div id="printReport">', '</main>');
}

/* PR8 §5 — the other half.

   staticReportText() has existed since PR2 and reads the PRINT report's static
   markup. There has never been an equivalent for the web report's, so every
   copy-rule, em-dash and en-dash assertion that runs off allText() has been
   scanned against one of the two documents and structurally blind to the other
   — the same shape of guard that let a section name survive in the print
   report for two releases while the suite asserted it was gone.

   The web report carries static prose of its own: the section subheads, the
   gate blurb, the conversion panel and the disclaimer. All of it is output and
   all of it is read by the visitor. It is scanned here on the same terms. */
export function staticWebText(path = TOOL_PATH) {
  return slice(path, 'web', '<section id="report"', '<div id="printReport">');
}

/* Cached per file and per half. Re-reading a 240KB file once per capture to get
   the same string back is pure waste. Comments are stripped — the tag regex in
   allText() would leave their contents behind, and a note about the copy is not
   the copy. */
function slice(path, key, open, close) {
  const id = `${key}:${path}`;
  if (!staticCache.has(id)) {
    const html = readFileSync(path, 'utf8');
    const start = html.indexOf(open);
    const end = html.indexOf(close, start);
    if (start < 0 || end < start) throw new Error(`${key} block not found in the markup`);
    staticCache.set(id, html.slice(start, end).replace(/<!--[\s\S]*?-->/g, ' '));
  }
  return staticCache.get(id);
}

/* Every node the tool writes output into. Order is fixed so captures compare. */
export const SCREEN_NODES = [
  'positionLead', 'tileGrid', 'rangeNote',
  'costEyebrow', 'costFigure', 'costNote', 'loadedSalaryParts',
  /* The stated reason where a suppressed cost block would have been. Empty on
     every sterling shape, which is what makes it worth capturing. */
  'costCurrencyNote',
  'ceilingEyebrow', 'ceilingFigure', 'ceilingNote',
  'factList', 'ragList', 'checkList', 'compareRows', 'ctaHead', 'ctaBody', 'priceLine',
  /* PR7 §3.1 — the bands statement now renders on screen too. */
  'bandsStatement',
  'closingVerdict',
  /* PR9 §4. The covering note and the saved link, both written at render from
     the same objects the report is written from. They sit outside the report
     and are read by the copy rule and both dash rules like any other output. */
  'coverNote', 'noteLink',
];

export const PRINT_NODES = [
  /* PR8 §2.1/§2.3 — the cover line, then the three executive-summary slots in
     the fixed order the printed report renders them in. */
  'pr-attrib',
  'pr-sum1head', 'pr-sum1figure', 'pr-sum1note',
  'pr-sum2head', 'pr-sum2figure', 'pr-sum2note',
  'pr-sum3head', 'pr-sum3figure', 'pr-sum3note',
  'pr-verdict', 'pr-tiles', 'pr-bandnote', 'pr-facts',
  'pr-inputs', 'pr-formulas', 'pr-derivations', 'pr-flexeranote', 'pr-fxnote',
  /* PR7 §3.1 — was static markup until it had to be shared with the screen. */
  'pr-bands',
  'pr-cards', 'pr-checks', 'pr-compare', 'pr-sources', 'pr-price',
  /* PR9 §4.2. The result URL, printed on the provenance page. */
  'pr-link',
];

function readNode(node) {
  /* The tool writes innerHTML on most nodes and textContent on a few. */
  return node.innerHTML || node.textContent || '';
}

/* `toolPath` loads a variant copy of the tool, for invariance shapes that need
   a constant changed. Everything else about the capture is unchanged. */
/* `name` drives the gate's two optional name fields, so a caller can render the
   cover on both branches of §2.1. Defaults to the pair the suite has always
   sent; `{ name: null }` submits the gate with both fields empty, which the
   form allows and which is therefore a cover the tool can actually produce. */
export function capture(shape, { toolPath, name } = {}) {
  const tool = loadTool(toolPath);

  for (const key of INPUT_KEYS) {
    const raw = shape[key];
    tool.node(key).value = raw === null || raw === undefined ? '' : String(raw);
  }

  const result = { id: shape.id, ok: false, screen: {}, print: {}, sender: null, error: null };

  const check = tool.api.readAndValidate();
  result.valid = check.ok;
  if (!check.ok) { result.error = `validation failed at ${check.firstBad}`; return result; }

  try {
    tool.fire('calcForm', 'submit');
  } catch (e) {
    result.error = `submit threw: ${e.message}`;
    return result;
  }

  for (const id of SCREEN_NODES) result.screen[id] = readNode(tool.node(id));
  for (const id of PRINT_NODES) result.print[id] = readNode(tool.node(id));
  /* The layer the page does not write: the static copy of both reports. PR8 §5
     added the web half; before that only the printed half was ever scanned. */
  result.staticReport = staticReportText(toolPath);
  result.staticWeb = staticWebText(toolPath);

  /* The Sender payload. The gate needs a valid email and a ticked box. */
  const who = name === undefined ? ['Test', 'Reader'] : (name === null ? ['', ''] : String(name).split(' '));
  tool.node('email').value = 'reader@example.com';
  tool.node('fname').value = who[0] || '';
  tool.node('lname').value = who.slice(1).join(' ');
  tool.node('company').value = 'Example Ltd';
  tool.node('ack').checked = true;
  /* The cover line before the gate runs. renderPrint writes it with whatever
     the name fields hold, which at that point is nothing, and the gate rewrites
     it — so both branches of §2.1 are produced by one shape and the suite can
     read each of them. */
  result.coverBeforeGate = readNode(tool.node('pr-attrib'));
  try {
    tool.fire('gateBtn', 'click');
    result.sender = tool.sender[0] || null;
  } catch (e) {
    result.error = `gate threw: ${e.message}`;
  }
  result.coverAfterGate = readNode(tool.node('pr-attrib'));

  /* Structured values, for asserting against the oracle. */
  const v = check.values;
  const c = tool.api.compute(v);
  result.values = v;
  result.computed = c;
  /* Which callout leads, and whether the full-cost tile is shown at all. The
     gate is at the foot of the page, so a rendered tile is by construction
     above it; what the suite checks is that it renders, unhidden, with no
     partial-reveal class on it. */
  result.hero = {
    costHidden: tool.node('fullCostTile').hidden,
    costOrder: tool.node('fullCostTile').style.order,
    ceilingOrder: tool.node('growthCeiling').style.order,
    costClass: tool.node('fullCostTile').className,
    ceilingClass: tool.node('growthCeiling').className,
    currencyNoteHidden: tool.node('costCurrencyNote').hidden,
    /* Static copy the page hides rather than writes, so allText() carries it
       from the file either way and only this records whether it was shown. */
    costExclusionsHidden: tool.node('pr-costexclusions').hidden,
  };
  result.permalink = tool.api.permalink(v);
  result.ok = true;
  return result;
}

/* The §5 band track. Generated markup rather than prose: three tinted zones, a
   mark, and the two band thresholds labelled underneath, every value of it
   derived from the band constants and from the figure the tile already prints.

   allText() carries it by default, so the copy rule scans it like any other
   output. The digest needs it out. A capture taken from a commit before PR5
   has no track at all, so leaving the labels in makes every rated shape read as
   a numeric change and buries the one thing the digest exists to catch: a
   computed figure that moved in a layout release. The track is pinned by value
   instead — every zone width, tick position, tick label and mark, on every
   corpus shape, against the band constants and the tile's own figure. */
const BAND_BAR = /<div class="band-bar"[\s\S]*?<\/div><\/div>/g;

export function stripBandBars(html) {
  return String(html).replace(BAND_BAR, ' ');
}

/* PR8 §2.1. The cover line carries the date the report was produced, and the
   harness freezes that date so a baseline does not change at midnight. It is
   still three digits in the rendered output, and the day of the month lands in
   the number multiset the digest compares — which made every one of the 603
   shapes read as a numeric change on the release that first captured the
   cover, and buried the one thing the digest exists to catch.

   The date is not a figure. It is replaced by a token before the numbers are
   counted, and only there: the sentence itself still goes through the copy
   rule, the dash rules and the text digest with every word intact. The cover
   carries no other number, which is asserted separately. */
const REPORT_DATE =
  /\b\d{1,2} (?:January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\b/g;

export function stripReportDate(text) {
  return String(text).replace(REPORT_DATE, '[report date]');
}

/* All rendered text as one blob, tags stripped — what the copy-rule check and
   the text diff both read. */
/* `pr-inputs` is the printed report's verbatim echo of what the respondent
   entered — the input labels and the exact dropdown options they picked. It
   makes no claim of its own, and §5's rule is that hedging belongs in input
   labels and helper text. Scanning it for hedging would fail the suite on
   "Estimated total IT staff" (an input label) and on the respondent's own
   answer "Roughly, but I would want to check it", and the only way to pass
   would be to misreport what they chose. It is excluded from the copy scan and
   from nothing else. */
const COPY_EXEMPT = new Set(['pr-inputs']);

/* PR9 §4. The three forwarding surfaces, out of the DIGEST only.

   They are output and they are scanned as output: the copy rule, the em-dash
   rule and the en-dash rule all read allText() with no exclusion, so every one
   of them sees the covering note and the printed link on all 603 shapes.

   What they must stay out of is the number multiset the digest compares,
   for the same reason PR8 took the cover date out of it. The note carries no
   figure of its own — every one is a duplicate of a figure already inside the
   report, asserted equal rather than assumed equal — and the link carries the
   raw answers, including a salary written to fourteen decimal places. Left in,
   the pair reads as a numeric change on every shape in the corpus and buries
   the one thing the digest exists to catch: a computed figure that moved.

   The exclusion is stated as a set rather than folded into a slice, because
   this is the mistake PR8 §5 catalogued: an assertion whose scope quietly
   answers a different question from the one it appears to ask. Everything
   excluded here is excluded from one comparison and from nothing else. */
const DIGEST_EXEMPT = new Set(['coverNote', 'noteLink', 'pr-link']);

/* PR8 §5. The rendered layer alone: every node the tool wrote on this shape,
   with no static markup behind it.

   allText() carries the static copy of both reports whether the page showed it
   or not, which is right for a copy rule — a sentence in the file is a sentence
   that can reach a reader — and wrong for an assertion about what one shape
   does or does not claim. #fullCostTile ships with its heading written into the
   markup and is hidden where no cost was computed, so "this shape makes no
   full-cost claim" is a claim about the render and has to be read off the
   render. */
export function renderedText(cap, { exBar = false } = {}) {
  const parts = [];
  for (const id of SCREEN_NODES) parts.push(exBar ? stripBandBars(cap.screen[id] || '') : (cap.screen[id] || ''));
  for (const id of PRINT_NODES) parts.push(cap.print[id] || '');
  return flattenText(parts.join('\n'));
}

export function allText(cap, { forCopyRule = false, exBar = false, exDigest = false } = {}) {
  const parts = [];
  for (const id of SCREEN_NODES) {
    if (exDigest && DIGEST_EXEMPT.has(id)) continue;
    parts.push(exBar ? stripBandBars(cap.screen[id] || '') : (cap.screen[id] || ''));
  }
  for (const id of PRINT_NODES) {
    if (forCopyRule && COPY_EXEMPT.has(id)) continue;
    if (exDigest && DIGEST_EXEMPT.has(id)) continue;
    parts.push(cap.print[id] || '');
  }
  parts.push(cap.staticReport || '');
  parts.push(cap.staticWeb || '');
  return flattenText(parts.join('\n'));
}

function flattenText(s) {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&pound;/g, '£').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

/* The multiset of numbers appearing in the rendered output. Two captures whose
   text differs but whose number list matches are a pure copy change. */
export function numbersIn(text) {
  return (stripReportDate(text).match(/-?\d[\d,]*(?:\.\d+)?/g) || []).map((s) => s.replace(/,/g, ''));
}
