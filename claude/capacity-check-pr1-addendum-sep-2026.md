# PR1 — Addendum: completing the work before it lands

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`
**Follows:** `PR1_Brief_CC.md`, and your PR1 report
**Date:** 4 September 2026

Your engineering findings are accepted. Two of your challenges were correct and the specification has been changed on both — the details are below so you do not have to reconcile them yourself. Three things need doing before PR1 lands, and one thing needs establishing before any of them.

---

## 0. Remote state — confirmed, no action

Your report was accurate. PR #12 is open, both branches are pushed, nothing is merged. An earlier draft of this addendum asked you to re-establish that; disregard it. The apparent contradiction was a stale browser tab at Mark's end.

For the record, the state this addendum assumes: PR #12 has head `pr1-bands-thresholds-headroom` and base `site/contrast-and-self-hosted-fonts`, both on the remote, neither merged.

---

## 1. RESOLVED — the branch premise was false, and nothing needs merging first

**Superseded 4 Sep.** The section below asked you to establish whether the live page was stale. You did, and it is not: live, `main` and `site/contrast-and-self-hosted-fonts` are byte-identical. v5, v5.1, the design pass and the contrast fix all shipped on 25 August via PR #10. The "1,449 lines behind" was a stale local `main` ref, not a fact about the repo.

Consequences: **there is no base-branch PR to open** — it would be empty — and the whole no-squash sequencing in §2 is moot. Retarget PR #12 to `main` and merge it. Everything below in §1 and §2 is kept only as a record of what was asked and why.

---

## 1. (Superseded) What Cloudflare builds from, and what that implies

**Confirmed: Cloudflare builds from `main`.**

Put that beside your own finding that `main` is 1,449 lines behind and missing v5, v5.1 and the design pass — and beside the fact that projexar.com/capacity-check currently serves a working Capacity Check. All three cannot be true of the same file.

The likely resolution is that **the live Capacity Check is a stale version**, and that v5, v5.1 and the design pass have never actually shipped. If so, the team has been reviewing work that is not in production, which is worth knowing on its own account.

**Establish it, do not assume it.** Fetch `https://projexar.com/capacity-check`, diff it against the version on `main`, and report:

- whether the live page matches `main`;
- if not, which branch it does match;
- what the live page is missing relative to the tip of `site/contrast-and-self-hosted-fonts` — in user-visible terms, not line counts.

This determines what the next merge actually does to production, so it is not optional detail.

---

## 2. Branch and merge sequence — revised

Because Cloudflare builds from `main`, merging the base branch is not housekeeping. **It is a production deploy**, and it is the first time v5, v5.1 and the design pass will ship. It is safe to do — the product is pre-launch with no traffic — but it must be done deliberately, as its own change, not carried in underneath a PR labelled as the bands work.

Because PR #12 is already open against the base branch, no rebase is needed. Retarget instead.

1. **Open a separate PR for the base branch**, `site/contrast-and-self-hosted-fonts` → `main`. Its description enumerates what is in the 1,449 lines in user-visible terms: what v5 changed, what v5.1 changed, what the design pass changed. Mark reviews and merges this on its own. It is a production deploy — write the description as one.
2. **That PR must be merged with a merge commit or a rebase merge — NOT a squash.** This is the detail that decides whether the rest of this works. A squash rewrites those 1,449 lines into a single new commit that PR #12 has never seen; retargeting PR #12 to `main` would then show the whole base branch *again* on top of the PR1 changes, and Mark loses the clean review this sequencing exists to protect. Say so in the PR description so the wrong button does not get pressed.
3. **Then retarget PR #12's base** from `site/contrast-and-self-hosted-fonts` to `main`. GitHub recomputes the diff; because `main` now contains exactly those commits, it should be unchanged.
4. **Read the retargeted diff.** It must still be the bands, thresholds, headroom, corroboration, copy and sources work, plus the `tools/` suite — and nothing else. If it has grown, step 2 was squashed or something else came in. Stop and report rather than proceeding; the fix is a rebase, but only once we know why.

**The render baseline must not move.** `main` will contain what the baseline was taken against. If any shape changes, stop and report.

**Check the `tools/` directory is not deployable.** You added a render suite under `tools/`. Now that we know `main` is the production source, confirm against the Cloudflare build configuration that nothing under `tools/` is copied into the published output, and that its presence does not change the build. Keep it in the PR1 branch, in its own commit, marked dev-only. If the build would publish it, say so before pushing.

---

## 3. Content edits before PR1 merges

### 3.1 The bands statement — you were right, and the correction goes further than you proposed

Your challenge is accepted. Section 4.2 records managerial responsibility as a coded variable with project manager as its example; the brief's claim that the paper does not identify project managers in its sample was wrong. The error came from trusting a second summary of the paper over a first without reconciling them.

**[THIS SECTION'S READING OF THE MANAGER RESULT WAS WRONG — superseded 4 Sep after CC checked it.]** The version below claimed the paper finds the inverted-U fails among managers. It does not. The −.507, p = .324 coefficient is in §4.2's preliminary checks, in a regression whose dependent variable is MPW rather than performance (Table S2), and "this pattern" refers to MPW being lower for senior employees. The finding is that managers were not allocated a significantly different number of concurrent projects. CC was right to refuse the paraphrase, and the statement below has been replaced — see the current wording in the spec's §2.11.

Publish this:

> These bands are ProjexaR's management controls. They are informed by published research but are not values the research establishes.
>
> The evidence comes from a longitudinal study of 9,649 project-month-employee observations across 42 projects and 580 employees at a single manufacturer, over twenty months. It finds an inverted-U relationship between the number of concurrent projects a person carries and how well those projects perform, with a point estimate of 5.16 concurrent projects and a confidence interval of 3.57 to 6.19.
>
> Three things follow, and we state all three. The study covers new-product-development engineering, and a portfolio of IT change projects is a different setting. Managerial responsibility appears in it only as a check on how people were allocated to projects — it plays no part in the model that produces the inverted-U — so applying this number to project management caseload is our step, not the paper's. And our red threshold of 7.0 sits *above* the top of that confidence interval, deliberately: we would rather understate the problem than manufacture one.

**One further correction to your published wording.** Your version ends the middle sentence with *"and the paper does not test whether that curve differs for managers"*. That is an asserted absence, and Table S10 appears to contradict it: the paper reports testing employee age and leadership role as additional moderators and finding *"none of these factors seem to matter as additional moderators."* If that holds, the paper did look. **Verify Table S10.** If it says what it appears to, the honest — and better — version adds: *"The paper checks whether a leadership role changes the benefit of multi-project work and finds it does not, but it never models project management caseload as such."* Until you have confirmed it, publish the shorter wording above, which is true either way. Do not restore the absence claim.

All three closing sentences are load-bearing. None may be trimmed.

### 3.2 Remove the two `8–12` code comments

Yes, remove them. They render nowhere, but they are a trap for whoever reads that file next and a route by which a retired convention gets reinstated.

### 3.3 Keep "point estimate"

Your wording is right and the specification now records why. The copy rule bars hedging in figures the tool asserts *about the respondent*; describing what a cited study found is a different thing, but a mechanical check cannot tell them apart, so the rule stands unchanged and the copy is written around it.

### 3.4 The epsilons — keep them, the stated reason was wrong

You are right that `Math.round(7.05 * 10)` returns 71, and that the epsilons change no result at any boundary ratio in the fixture set. That claim was written into the brief without being run. Keep both epsilons for the reason that is actually true: `(cap + 0.05) * d` can land a hair above an integer for divisors outside the fixture set, where a bare `Math.ceil` would publish a threshold one too high. Defensive code against an unenumerated case, not a fix for a demonstrated bug. No code change required — this is so the comment does not carry a false justification.

---

## 4. Verification after the edits

- Re-run the full suite. **§3.1 and §3.2 are copy changes: no number may move.** If any numeric assertion changes, something else did too — stop and report.
- Both §4 fixtures must still reproduce exactly as in your report: 4.A at 9.0 At risk, 6.1 Watch, thresholds 36/59/75/124, sustainable 58, −17 unclamped; 4.B Healthy on both tiles and corroboration with no At risk.
- The copy check must still pass with the revised statement — confirm `point estimate` clears it and that nothing else in the new wording trips the list.

---

## 5. Report back with

1. The live-versus-`main` finding from §1, in user-visible terms — what shipping the base branch actually changes for a visitor.
2. Confirmation that nothing under `tools/` is published by the Cloudflare build.
3. What the paper actually says about the manager result, and the final wording of the middle sentence.
4. Confirmation that no number moved across the copy edits, and none moved after the retarget.
5. The base-branch PR, opened and ready for Mark to review, with the no-squash note in its description.

Do not merge anything. Mark takes both merges, in the order in §2.
