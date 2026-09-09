# PR6 — The copy rewrite

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`
**Follows:** PR5, merged
**Target file:** the Capacity Check HTML, plus `tools/capacity-check/`
**Date:** 5 September 2026

Last of three, and the last of the release. An independent external audit follows this PR, checking flow, repetition and whether the output reads as machine-written.

**So the bar here is not final polish.** Clear the mechanical faults, which are listed and countable. Leave the judgement calls to the auditor, who will read the whole thing fresh. Trying to reach perfection in one pass will cost more than it returns.

Do not merge. Open the PR, post the diff report, and stop.

---

## 0. The invariant

**Zero numeric change. Every number in every shape, byte-identical to post-PR5 `main`.**

This is a text-only PR. No new elements, so nothing needs stripping from the digest as in PR5. The numeric diff must simply be empty, and any number that moves is a bug rather than a change to explain.

Branch from `main`, name it `pr6-copy`, and re-bless the baseline from post-PR5 `main`.

---

## 1. What is wrong with the copy

The report is accurate and hard to read. Some of that is my doing: I asked for derivations stated twice, exclusions named inline, and every figure to explain itself. Honest and readable are not the same thing, and the task here is to get both. **The goal is the same honesty in fewer words**, never less honesty.

Five mechanical faults, in order of how often they appear.

### 1.1 Em-dash asides

The single biggest problem. They break sentences into fragments the reader has to reassemble.

**Remove every em-dash from output text.** Replace with a full stop, a comma, a colon, or brackets. Most often the right answer is to split the sentence.

**Do not touch en-dashes in number ranges.** `6.2–8.0`, `31–40%`, `£1.25m–£1.39m` — these are range markers, not punctuation, and stripping them would break every figure on the page. If a single regex touches both, do not use a regex.

### 1.2 Sentences that only parse with the layout

> **3.0–5.6 FTE** | Of ongoing capacity — 7.5%–14.1% of your 40 non-PM IT staff — is absorbed by ticket volume

This reads as a fragment starting with a capital "Of". It only works if you read the figure in the left column as the sentence's opening. Four of the five Your Numbers rows start with a noun-phrase label; this one starts mid-sentence. It will read badly in the PDF and to a screen reader.

Every row's description must stand on its own.

### 1.3 The "not X: it is Y" construction

> That gap is not a forecast: it is the difference between the pace you are running now and…

> The width of these ranges is not a caveat — it is the case for holding what each person is actually committed to…

Both say the thing twice, once negatively. Say it once, positively. Where the negative genuinely matters, give it its own short sentence.

### 1.4 Explaining our own process to the reader

> We do not publish the middle of it.

> We show it because it is the closest published figure we have, and we do not subtract one from the other.

The reader did not ask about our process. State the fact, or do not state it. The second example is my wording from the PR3 addendum, and it is worse than what it replaced in this one respect.

### 1.5 Bodies that have become essays

The "no single current view" finding runs to about two hundred words and contains a Microsoft Project digression, a citation, and a product retirement date. The second check in Checks on your answers runs to about a hundred and eighty and ends with two sentences that appear to contradict each other about populations.

Both are the result of caveats I asked for inline. See §3 for where they should go instead.

---

## 2. Three worked rewrites

Use these as the calibration for everything else. They are not final wording, they are the register.

### The full-cost body

Currently:

> Your project budgets record £375,000 a year. The people doing the work cost a further £0.88m–£1.02m — the 11.2–13.0 effective full-time equivalents on your projects at £78,137 a head — and that sits in the staff budget rather than the project budget. Both are real money already being spent; what your reported figure gives you is 27.0%–30.0% of the total. It leaves out your contractors and outsourced staff, whose cost is paid out of budget, and anyone who works on projects without also holding a BAU role — this check never counted them.

Toward:

> Your project budgets record £375,000 a year. The people doing the work cost a further £0.88m–£1.02m, which is 11.2–13.0 full-time equivalents at £78,137 a head. That sits in the staff budget rather than the project budget. Your reported figure is 27.0%–30.0% of what the portfolio costs.
>
> This leaves out contractors and outsourced staff, whose cost is paid out of budget, and anyone who works on projects without a BAU role. The check never counted them.

Three em-dashes gone, one sentence became four, the exclusions became their own paragraph. Same figures, same exclusions, same honesty.

### The growth ceiling body

Currently:

> On your own figures the pace your capacity sustains is 58 projects a year, and you are running 75. Concurrent projects per PM is the measure that binds first. That gap is not a forecast: it is the difference between the pace you are running now and the pace the people you told us about can carry. Closing it means adding capacity, running fewer projects at once, or accepting that projects take longer than the plan says.

Toward:

> Your capacity sustains 58 projects a year. You are running 75. Concurrent projects per PM binds first.
>
> This is not a forecast. It is the difference between the pace you run now and the pace your staff can carry. Closing it means adding capacity, running fewer projects at once, or accepting that projects take longer than planned.

"The people you told us about" becomes "your staff". The closing three options stay, because they are three real options rather than rhetorical decoration.

### The band explanation

Currently five sentences of methodology sitting between the tiles and the cost figure. Cut it to the fact and move the argument, for the reason in §4.

Toward:

> Your BAU staff give 31–40% of their time to project work, so every figure drawn from that answer is a range. A single number would be more precise than the answer it came from. Where a range crosses a threshold we rate it on the less favourable end.

---

## 3. Where a caveat belongs — the test I failed to give you

I asked for caveats inline and some of them should not be. Here is the test.

**If removing the caveat would make the sentence false or misleading, it stays inline. If removing it would only make the sentence less qualified, it moves to the workings page.**

| Caveat | Where | Why |
|---|---|---|
| Flexera measures budget, not time, on organisations above 2,000 employees | **Inline** | Without it the comparison misleads |
| Contractors and non-BAU project staff are excluded from the cost | **Inline** | It changes what the number counts |
| The currency reason for a suppressed cost block | **Inline** | Without it the absence is unexplained |
| Typical project duration is derived, not measured | **Inline**, short form | The label claims more than the arithmetic |
| The run share and the ticket figure are different kinds of estimate | **Workings** | The statement is true without it |
| The two figures are quoted against different populations | **Workings** | Adds depth, decides nothing |
| We count each PM as a full FTE of change work | **Workings**, and in the Watch branch only | Already correct — leave it |

The workings page is not a dustbin. Anything moved there is written properly, and the body says the qualification exists.

---

## 4. Repetition — the reorder created some

The band explanation argues that ranges are the case for holding actual commitments. **What your plans would show instead** now makes that same argument, in a table, four sections earlier. Two versions of one argument is exactly what the external audit will pick up.

Keep it in the promoted section. Cut it from the band paragraph, which is left with the factual explanation.

Read the whole report once looking only for this. Anything said twice should be said in the better place and cut from the other.

---

## 5. The items already identified

From your PR5 report:

1. **"Everything above was calculated from your data"** — the promoted section's lead, written when the section closed the report. Rewrite for its new position.
2. **"The ticket percentage above is taken across your non-PM staff"** — points forward, not back. Your Numbers renders after the checks.
3. **Three routes to the report, three labels** — "Download the full report ↓", "Or take the full report first ↓", and the gate's submit. Settle on one vocabulary.
4. **The gate's blurb** promises "what the same questions asked of your actual project plans would add", which the reader saw four sections ago.

From PR4:

5. **"Four external figures appear in this report and each is named where it is used"** is wrong whenever a respondent skips the optional questions. **The fix is to delete the count, not to make it dynamic.** "Every external figure is named where it is used" is true unconditionally.

**On item 4.** The reorder has taken away what the gate was offering. The honest default is to describe the PDF as what it now is: a copy of this report to keep and to send on. Write it that way. If it should offer more than that, it is a product decision and not a copy fix, so raise it rather than inventing something.

---

## 6. Do not touch

Reword nothing in this list. Each has been verified, in some cases repeatedly, and a copy pass is exactly how a verified sentence quietly becomes an unverified one.

- **The bands statement** in the methodology. Rewritten three times and checked against the paper twice. Not one word.
- **Every citation**, including author names, years, volume and page numbers, table and figure references, and licence notices.
- **The Flexera comparison sentence**, beyond removing em-dashes. Its structure is what stops it becoming a comparison again.
- **The currency suppression line**, beyond em-dashes.
- **Any figure, unit, or range.**

---

## 7. The principles the suite cannot see

The copy-rule check catches five words. It does not catch these, and a rewrite is the most likely moment in the whole release to reintroduce one:

- no hedging in output — the range is the hedge
- no ROI, payback, breakeven, or "pays for itself" framing
- no comparison between quantities that measure different things
- no claim the tool tracks actual hours; it holds planned commitment
- nothing stated as sourced that is ours, and nothing stated as ours that is sourced

Read the finished copy against this list deliberately. The suite will pass either way.

---

## 8. Verification

- **The numeric diff is empty.** Not explained, empty.
- Every fixture — 8.A through 8.F — reproduces every figure exactly.
- The copy-rule check passes.
- **No em-dash appears in any output text**, and every en-dash in a number range survives. Assert both.
- Every PR1–PR5 assertion still passes.
- Add a shape asserting each Your Numbers description reads as a complete sentence independent of its figure column.

---

## 9. Acceptance criteria

- [ ] Zero numeric change across all shapes.
- [ ] No em-dashes in output; all range en-dashes intact.
- [ ] Every Your Numbers description stands alone.
- [ ] Nothing in §6 is reworded.
- [ ] The five items in §5 are resolved, with item 4 either written to the default or raised.
- [ ] The band paragraph no longer duplicates the promoted section's argument.
- [ ] The §7 principles hold on a deliberate read, not just a suite pass.
- [ ] Caveats sit inline or in the workings per §3, and the workings versions are written properly.

---

## 10. Report back with

1. Confirmation the numeric diff is empty.
2. The longest body remaining, and its word count before and after.
3. Anything you found said twice, and where you kept it.
4. Anything you wanted to reword in §6 and did not.
5. What you did about the gate blurb.
