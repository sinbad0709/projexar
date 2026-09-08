/* Capture the 603-shape baseline.
       node tools/capacity-check/baseline.mjs <out.json>

   Digests, not full text. The categorisation in §6 only needs to know whether
   the text changed and whether the numbers changed, and storing 603 rendered
   reports verbatim puts an 11MB blob in the repo that nobody can read in a
   diff. To see what actually changed in a shape, re-render it from either
   commit — the suite is deterministic.

   The ratings and the headroom are kept in the clear, because those are the
   values a reviewer will want to scan by eye. */

import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { corpus } from './shapes.mjs';
import { capture, allText, numbersIn } from './capture.mjs';

const out = process.argv[2];
if (!out) { console.error('usage: baseline.mjs <out.json>'); process.exit(2); }

const sha = (v) => createHash('sha256').update(String(v)).digest('hex').slice(0, 16);

const shapes = corpus();
const record = {};
let failed = 0;

for (const shape of shapes) {
  const cap = capture(shape);
  if (!cap.ok) { failed++; record[shape.id] = { error: cap.error }; continue; }
  const text = allText(cap);
  /* The same blob with the §5 band track removed. On a pre-PR5 commit there is
     no track and the two pairs are identical, which is what makes them
     comparable across the release. */
  const bare = allText(cap, { exBar: true });
  record[shape.id] = {
    text: sha(text),
    numbers: sha(numbersIn(text).join('|')),
    textExBar: sha(bare),
    numbersExBar: sha(numbersIn(bare).join('|')),
    ragPM: cap.computed.ragPM,
    ragFTE: cap.computed.ragFTE,
    headroom: cap.sender ? cap.sender.headroom : null,
    senderRagPm: cap.sender ? cap.sender.rag_pm : null,
    senderRagBau: cap.sender ? cap.sender.rag_bau : null,
  };
}

writeFileSync(out, JSON.stringify({ count: shapes.length, shapes: record }, null, 1));
console.log(`captured ${shapes.length} shapes -> ${out}${failed ? ` (${failed} failed)` : ''}`);
