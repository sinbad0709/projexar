# PR17 — Capture every submission, and stop re-gating the respondent

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`
**Follows:** PR16, merged
**Target files:** the Capacity Check HTML, `src/worker.js`, `tools/capacity-check/`
**Date:** 11 September 2026
**Depends on:** a Supabase table and an insert-only key, produced separately. **You do not create either.** §2 defines the columns the table must have; if it does not exist when you start, stop and report.

Two related pieces of work, paired because they touch the same three files: the submit handler, the Worker and the permalink.

**Today we only see the people who handed over an email.** Everyone who ran the check and did not convert is invisible, and that is probably most of them and the more informative half. Whether someone abandoned at the gate because their numbers looked fine or because they looked alarming is the single most useful thing this tool could tell us before launch.

**Numeric invariant.** Nothing published changes. This is purely additive to output.

**Do not merge.** Push, report, and stop.

---

## 1. Gates

**1.1 The table.** Confirm the Supabase table exists with the columns in §2, and that the Worker has an insert-only key available as a secret. Report the column list you found against the list below. **Do not create the table, alter it, or use a key with read access.**

**1.2 The current submit path.** Report the exact flow from the "Show my capacity" button: what validates, what computes, what renders, and in what order. The capture fires after the report renders and must never precede it.

**1.3 Turnstile placement.** The capture happens at "Show my capacity", before any gate, and the existing Turnstile widget lives inside `#gate`. Report the options for issuing a token earlier without adding friction at the calculate step — an invisible or managed widget on page load is the obvious candidate, with one token serving both the capture and the gate. **Report before building.** A visible challenge in front of the calculate button would be a worse outcome than no capture at all.

---

## 2. What to capture

**Inputs only. No computed values.**

Everything the tool derives is re-derivable from the inputs, and storing derived figures means a schema change every time `compute()` changes. Instead store a **tool version** on every row, so a row captured under one set of bands can be recomputed correctly later. Without it, a row captured today and a row captured after the next threshold change are not comparable and nothing records why.

The columns:

| Column | Source |
|---|---|
| `session_id` | §3 |
| `event` | `submit` or `gate_passed` (§5) |
| `created_at` | Server-stamped in the Worker, never the browser |
| `tool_version` | A constant in the tool, bumped whenever `compute()` or a band changes |
| `country`, `city` | Cloudflare request properties |
| company headcount, IT staff, PM count, PM share band, live projects, annual projects, currency, project spend, BAU staff, BAU share band, contractors, tickets per month, run share, toolset, single view, budget tracking, who on what | The seventeen inputs, as entered |

Optional inputs that were left blank are stored as null, never as zero. **A blank is not a zero**, and the tool already draws that distinction in `OPTIONAL_NUMERIC`. Losing it in the store would make an unanswered ticket question indistinguishable from a department that logs no tickets.

Report the exact column names you use, so the table and the payload can be checked against each other.

---

## 3. The session identifier

A pseudonymous identifier, so repeated submissions from one sitting can be read as one person adjusting figures rather than as several unrelated organisations.

**Hold it in a JavaScript variable in page memory. Do not use `sessionStorage`, `localStorage`, or a cookie.**

This is deliberate and it is the only design decision here with a legal dimension. Storing an analytics identifier on a visitor's device engages PECR, which would require a consent banner, because analytics storage is not "strictly necessary". A value living only in the page's memory for the life of the page stores nothing on the device, so no banner is needed and the tool stays cookie-free.

The cost is that a page reload starts a new session. That is acceptable: the case being solved is someone changing a number and pressing the button again, which happens without a reload.

Generate it with `crypto.randomUUID()` on first use. Never derive it from anything about the visitor — no IP, no user agent, no fingerprint. A derived identifier would be worse than a stored one, both legally and ethically.

---

## 4. The endpoint

A new Worker route, following `/api/capacity-report`'s shape rather than inventing a second pattern.

- **Fire and forget.** A failed capture must never block or delay the report. The report renders first; the capture is issued after.
- **Turnstile-verified**, per §1.3, and failing closed. An unauthenticated write endpoint with no challenge is an invitation to flood the dataset.
- **Rate limited**, and report what limit you set and why.
- **Length caps on every field**, Worker-side, rejecting rather than truncating, exactly as `REPORT_LIMITS` does. Reject nested objects too, for the reason PR9 recorded.
- **Server-stamped time.** The browser's clock is not evidence of anything.

**Never store**, in any column, under any circumstance: email address, name, company name, IP address, user agent, or any free-text field the respondent typed. The capture is the numbers and the answers, nothing else.

**One thing this shares with the Sender post: failure is silent.** A network failure in the browser cannot be counted server-side. Say plainly in your report what is and is not observable when a capture fails, rather than leaving it to be discovered.

---

## 5. The conversion event

When a respondent passes the email gate, write a second row with the same `session_id` and `event` of `gate_passed`.

**A second row, never an update.** The store is append-only, which is simpler to reason about, cheaper to make insert-only at the database, and impossible to corrupt with a partial write.

**No personal data on that row.** Not the email, not the name. The session identifier and the event are the whole of it. The Sender record holds who they are; this store holds what shape they were.

Note in the report what this makes possible and what it does not: a conversion rate by input shape, but no route from a row back to a person except by matching input values against a subscriber record. That linkage is why the Privacy Notice must describe this store as pseudonymous rather than anonymous.

---

## 6. The returning respondent

A respondent who follows the link in their own report email lands on the results and is then asked for their email again before the PDF, which writes a second subscriber. That is how a duplicate record was created during testing.

The requirement: **the link in the email skips the gate; the link copied from the page does not.** A second reader arriving on a forwarded link is a lead worth capturing.

The constraint that makes this awkward: both are the same URL, and the PDF is produced by the browser's own print, so any client-side check is forgeable. Some leakage is unavoidable — if the respondent forwards the email itself, the recipient gets the token.

**Propose a design and stop before building it.** Report what it costs to forge, what it costs to leak, and where the token is verified. My starting expectation is an HMAC signed by the Worker with a bounded lifetime, verified server-side, and stripped from the on-page share control — but you have the file and I do not, and if the store or the existing permalink handling gives a cleaner answer, take it.

---

## 7. Assertions

- A capture payload carries every input and no computed value.
- Blank optional inputs serialise as null, not zero, asserted per field.
- No email, name, company, IP or user agent appears in any capture payload, asserted by field name and by value against a shape that supplies all of them.
- The report renders when the capture endpoint fails, times out, and returns an error.
- The session identifier is stable across two submissions in one page life, and absent from any device storage. Assert that neither `localStorage` nor `sessionStorage` is written anywhere on this path.
- A `gate_passed` row carries the same session identifier and no personal field.
- Oversize input is rejected, not truncated, on every field.
- Turnstile failure produces no insert.
- `tool_version` is present on every row.

**Fail each deliberately before trusting it**, per §0.16 and §0.17, breaking the extraction or the selector rather than the content.

---

## 8. Acceptance criteria

- [ ] All three §1 gates answered, and §6's design reported before it is built.
- [ ] Nothing published changes, asserted.
- [ ] Inputs captured, computed values not.
- [ ] No device storage written anywhere on this path.
- [ ] No personal data in any capture payload.
- [ ] The report is unaffected by every capture failure mode.
- [ ] Turnstile fails closed on the new endpoint; caps enforced Worker-side.
- [ ] `tool_version` on every row.
- [ ] Every PR1 to PR16 assertion still passes.

---

## 9. Report back with

1. The three §1 gate answers, and the column list found against §2.
2. Your §6 design, before building it.
3. The rate limit you set and why.
4. What is and is not observable when a capture fails.
5. The exact column names, so the table can be checked against the payload.
6. Anything that could not be done without changing published output.

---

## 10. Not in this PR

- **The Supabase table, its policies and its key.** Produced separately. You use them; you do not create or alter them.
- **The Privacy Notice.** It must describe this store before the tool goes live, as pseudonymous rather than anonymous, and that is Mark's.
- **Any read path on the store.** Analysis happens in Supabase, not in the Worker. The key this PR uses cannot read.
- **The marketing site.** Mark's, separately.
