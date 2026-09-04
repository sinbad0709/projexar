/* Drive one shape through the real page and record what it rendered.
   ---------------------------------------------------------------------------
   The suite goes through the page's own submit handler rather than calling
   `compute` directly, so render() and renderPrint() both run and every node the
   tool writes into is captured — screen, printed report and Sender payload. */

import { loadTool } from './harness.mjs';
import { INPUT_KEYS } from './shapes.mjs';

/* Every node the tool writes output into. Order is fixed so captures compare. */
export const SCREEN_NODES = [
  'positionLead', 'tileGrid', 'rangeNote',
  'costEyebrow', 'costFigure', 'costNote', 'loadedSalaryParts',
  'ceilingEyebrow', 'ceilingFigure', 'ceilingNote',
  'factList', 'ragList', 'checkList', 'compareRows', 'ctaHead', 'ctaBody', 'priceLine',
  'closingVerdict',
];

export const PRINT_NODES = [
  'pr-herohead', 'pr-figure', 'pr-ceiling',
  'pr-secondhead', 'pr-secondfigure', 'pr-secondnote',
  'pr-verdict', 'pr-tiles', 'pr-bandnote', 'pr-facts',
  'pr-checkblock', 'pr-inputs', 'pr-formulas', 'pr-derivations', 'pr-flexeranote', 'pr-fxnote',
  'pr-cards', 'pr-checks', 'pr-compare', 'pr-sources', 'pr-price',
];

function readNode(node) {
  /* The tool writes innerHTML on most nodes and textContent on a few. */
  return node.innerHTML || node.textContent || '';
}

/* `toolPath` loads a variant copy of the tool, for invariance shapes that need
   a constant changed. Everything else about the capture is unchanged. */
export function capture(shape, { toolPath } = {}) {
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

  /* The Sender payload. The gate needs a valid email and a ticked box. */
  tool.node('email').value = 'reader@example.com';
  tool.node('fname').value = 'Test';
  tool.node('lname').value = 'Reader';
  tool.node('company').value = 'Example Ltd';
  tool.node('ack').checked = true;
  try {
    tool.fire('gateBtn', 'click');
    result.sender = tool.sender[0] || null;
  } catch (e) {
    result.error = `gate threw: ${e.message}`;
  }

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
  };
  result.permalink = tool.api.permalink(v);
  result.ok = true;
  return result;
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

export function allText(cap, { forCopyRule = false } = {}) {
  const parts = [];
  for (const id of SCREEN_NODES) parts.push(cap.screen[id] || '');
  for (const id of PRINT_NODES) {
    if (forCopyRule && COPY_EXEMPT.has(id)) continue;
    parts.push(cap.print[id] || '');
  }
  return parts.join('\n')
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
  return (text.match(/-?\d[\d,]*(?:\.\d+)?/g) || []).map((s) => s.replace(/,/g, ''));
}
