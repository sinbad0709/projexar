# PR9 — The Worker, the gate, and what the sender forwards

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`
**Follows:** PR8, merged
**Target files:** `src/worker.js`, the gate handler in the Capacity Check HTML, `tools/capacity-check/`
**Date:** 9 September 2026
**Reads with:** `claude/capacity-check-change-spec-sep-2026.md` §6, `claude/capacity-check-handover-sep-2026.md` §5, `claude/capacity-check-pr7-brief-sep-2026.md` §7.2 to §7.4

The first PR to touch `src/worker.js`. That file carries the live lead capture and it is **fire and forget**, which means a broken Sender post produces no error the respondent sees, no error Mark sees, and no error the suite sees. Everything in this brief is written around that fact.

**Numeric invariant.** No figure the report publishes changes. Figures newly rendered outside the report — in the covering note — must equal their counterparts inside it, asserted rather than assumed.

**Do not merge.** Push, report, and stop.

---

## 0. Standing constraints

Master §0 applies, with the four additions from PR7 and PR8 (§0.11 to §0.14). One more, and it is specific to this file:

15. **No change to the Sender field contract in this PR.** No field added, removed or renamed, and no value's meaning changed. The reconciliation is deliberately scheduled after PR10, because PR10 moves the internal cost figure and any field carrying it would otherwise be audited twice. If something in this PR appears to require a field change, stop and say so.

---

## 1. Gates — answer all four before changing anything

**1.1 How does the respondent actually get the report? STOP CONDITION if the answer is not what this brief assumes.**

The PR7 brief specified a covering note and a shareable link "delivered in the email body". That wording assumed an email carrying a PDF. The tool is a single HTML file with no server-side rendering, so it probably does not work that way.

Report the exact control flow from the moment the gate is submitted: what posts where, what the respondent sees next, how `#printReport` becomes a PDF, whether anything is emailed by us at all, and whether the report is reachable if the Sender post fails.

Then §4 branches on the answer. Do not implement §4 until this is reported.

**1.2 The gate's current handling.** Report: which fields the gate collects, which are required, what happens on an invalid entry, whether focus moves to the failing field, and whether any length limit exists on any field, client or Worker side.

**1.3 The Worker's current controls.** Report how Turnstile is wired on `/api/contact` — where the token is issued, where it is verified, and what happens on verification failure. `/api/capacity-report` has none. §2 copies the pattern and the report is what makes that safe.

**1.4 The payload, read from source.** Re-emit the PR3 manifest from `src/worker.js` as it stands today: field name, type, an example value from fixture 8.A, and one line on meaning. Flag again the two fields carrying one endpoint of a range, and `headroom`, which is signed and must never be a segment filter.

This is not the reconciliation. It is the input to it, and it is cheap to produce while the file is open.

---

## 2. Turnstile on `/api/capacity-report`

`/api/contact` is protected and `/api/capacity-report` is not. Close it, following §1.3's pattern rather than inventing a second one.

**Fail closed.** A failed verification returns an error and no Sender post is made. That matches `/api/contact` and it is the correct behaviour for an anti-abuse control; a control that waves through on its own failure is decoration.

**But the report is not the thing being protected.** Two separate questions, and §1.1 decides whether they are currently coupled:

- The respondent's access to their own report. This should not depend on the Sender post succeeding, and if today it does, say so — that is a defect independent of this PR.
- The submission of their details to Sender. This is what Turnstile gates.

**Verification before merge is manual and there is no substitute.** The suite cannot exercise a real Turnstile token. Report what you tested, what you could not, and exactly what Mark must do in a browser before merging: submit the gate with a valid token, confirm the Sender post lands, and confirm the failure path returns a sensible error rather than a silent nothing.

---

## 3. Gate hardening

Three items, all small, all outstanding since before the audit.

**3.1 Focus on error.** On a rejected submission, move focus to the first failing field and associate the error text with it programmatically. A gate that reports an error the respondent cannot find loses the lead as surely as one that rejects them.

**3.2 Length limits.** Cap every field, client side and **again in the Worker**, since the client-side cap is a convenience and the Worker-side cap is the control. Reject oversize rather than truncating: a truncated email address is a lead that silently fails. Report the cap you set for each field and the reasoning.

**3.3 `src/worker.js:225`.** The comment still describes the PM-tile toolset escalation that PR1 removed. Delete or correct it. A comment describing behaviour that no longer exists is how the next reader learns something false about the system.

---

## 4. What the sender forwards

**Held until §1.1 reports.** Both branches are specified so that no second round trip is needed.

The purpose is fixed either way, and it comes from the audit's strongest section. The forward is the sales action. Once the IT manager sends the report on, the selling has happened, and the document's only remaining job is to be worth having sent. Two things make that easier and neither of them is a pitch.

### 4.1 One covering note

One note, ask-agnostic per §0.14, carrying computed figures rather than placeholders, and **copyable in one action**.

The audit proposed three notes selectable by purpose. That is deferred — it is a good idea, and it is a second thing to get right in a PR that is already touching the live integration for the first time. One neutral note now.

Draft, to be run through the §5 copy check before it ships. Every bracketed figure is computed:

> I ran a capacity check on our project portfolio. The numbers are my own estimates, so treat them as directional, but the shape is right. Our project budgets record [reported spend]. The internal staff time behind the same work is another [internal cost range], which sits in the staff budget rather than in any project. We are running [gap] projects a year above what the current team sustains. There are four things in the report we can do about it that need no new software. Happy to walk through the workings.

Note what it does not contain: no ProjexaR, no ask, no urgency. It is written so that forwarding it costs the sender nothing, which is the only reason they will.

**Barred:** any hedge from the §5 list, and any wording that states what the reader's budget contains rather than what our figure excludes.

### 4.2 The result link

Issue the shareable result URL alongside the report, wherever §1.1 says the report is issued.

A static number invites argument; a movable one invites engagement. A second reader who changes the salary or the time band and watches the figure move has stopped auditing our arithmetic and started testing their own assumptions.

Preconditions, both already met: PR7 §2.3 refuted the dropped-`ct` claim and every input round-trips. The link must open on the results with the inputs above them, collapsed and editable. **Confirm it does.** If it opens on an empty form, that is the first thing to fix and the rest of §4.2 waits.

**Put the URL in the printed report as well.** A PDF is terminal; a printed link is not, and it is the only route by which the second reader reaches the tool at all.

### 4.3 If §1.1 says we send no email

Then the covering note and the link go on the confirmation screen the respondent sees after the gate, with a copy control on the note. The audit's stated reason for wanting them in an email body was that they could be copied without opening the file, and a confirmation screen serves that better, not worse.

In that case, record plainly in the PR description that **any automated email is Sender configuration and not code**, so nobody later looks for it in the repository. Mark configures the automation; this PR gives him the note text and the link to put in it.

---

## 5. Fixtures and shapes

No fixture value changes.

New shapes:

- Every figure in the covering note equals its counterpart in the report, on all seven fixtures.
- The covering note passes the copy-rule check, the em-dash rule and the en-dash rule — now that PR8 re-scoped those to read both documents, confirm the note is inside their scope and not in a third blind spot.
- The note names no product and carries no ask.
- The result URL appears in the printed report and round-trips to identical `compute()` output.
- Gate rejection moves focus to the failing field.
- Oversize input is rejected by the Worker, not truncated, on every field.
- Turnstile failure produces an error response and no Sender post. Mock the verification endpoint; say in the report that it is mocked.

---

## 6. Acceptance criteria

- [ ] All four §1 gates answered before any change, and §4 not begun until §1.1 is reported.
- [ ] Turnstile verifies on `/api/capacity-report`, fails closed, and follows `/api/contact`'s pattern.
- [ ] What must be verified manually is named, with the exact steps for Mark.
- [ ] Length caps enforced Worker-side, oversize rejected rather than truncated.
- [ ] Focus moves to the first failing field on rejection.
- [ ] `worker.js:225` no longer describes removed behaviour.
- [ ] The Sender field contract is byte-identical. No field added, removed, renamed or re-meant.
- [ ] The covering note carries computed figures, names no product, makes no ask, and is copyable in one action.
- [ ] The result link is issued with the report and printed in the PDF.
- [ ] No numeric change in the report on any shape.
- [ ] Every PR1 to PR8 assertion still passes.

---

## 7. Report back with

1. The four §1 answers, first and separately. §1.1 leads and can stop the PR.
2. The payload manifest from §1.4.
3. What you tested for Turnstile, what you could not test, and the exact manual steps for Mark.
4. The length cap for each field and why.
5. Whether the result link opens on results with the form collapsed, or does not.
6. Anything in this brief that could not be done without changing a Sender field.

---

## 8. Not in this PR

- **The Sender reconciliation.** After PR10, against the final payload. The manifest from §1.4 is its input.
- **The three-note selector and the purpose question on the confirmation screen.** The purpose question adds a Sender field and is therefore blocked by §0.15 until the reconciliation.
- **The project manager time-share input.** PR10. It moves every number and the fixtures need re-deriving, which is why it comes after the integration work rather than before it.
- **`projexar.com/start` still promising two projects free forever** while the check says "Unlimited 14-day trial". Outside this file, and now the oldest open item in the release. A prospect clicking through from the check meets a contradiction at the moment of conversion, which is the worst available place for one.
