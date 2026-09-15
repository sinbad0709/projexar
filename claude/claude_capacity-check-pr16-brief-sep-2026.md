# PR16 — Two claims about a competitor's product

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`
**Follows:** PR15, merged
**Target files:** the Capacity Check HTML, `claude/capacity-check-change-spec-sep-2026.md`
**Date:** 11 September 2026
**Reads with:** master §11; the four rows PR15's source guard surfaced on its first run

The source guard built in PR15 found four published claims with no register entry. Two were verified and recorded in that PR. These are the other two: both are claims about Microsoft's products, both are published, and neither is supported by the document behind it.

**This is the same defect as the Panko row**, twice more. Each time a claim was published, a source was named or implied, and nobody had read it. The difference here is that these are comparative claims about a named competitor, which is the category where being wrong costs most.

**Numeric invariant.** Nothing computed changes. Citation figures may change, as they did in PR15 when the Panko paper was corrected. Predict which, then assert that nothing else moved.

**Do not merge.** Push, report, and stop.

---

## 1. Gates

**1.1 Quote both claims verbatim, with every location.** Report the surface for each — web report, printed report, marketing site — and name the search. The migration-path claim is known to appear on the tool's Microsoft Project card and on the marketing site; treat that as a starting point, not a list.

**1.2 Report whether either claim is load-bearing.** Does any finding, rating, threshold or routing rule depend on either, or are both purely descriptive copy? This decides whether a correction is a string change or a behaviour change.

---

## 2. The migration-path claim

Published: that Project Online has **no automatic migration path published**.

Three problems, and they compound.

It is an asserted absence, which master §11's own preamble records as the error class that caused trouble in §4.2. It is an asserted absence about a third party's product, which is the hardest kind to substantiate. And it has weakened since it was written: Microsoft's retirement guidance now points customers at Project Server Subscription Edition. A recommended destination is not an automatic migration path, so the claim may still be true — but "may still be true" is not a source, and we would be asserting the absence of a document we cannot prove does not exist.

**Replace it with the positive fact.** Read Microsoft's current retirement guidance directly, quote what it actually says, and write the claim from that:

> Microsoft's retirement guidance points customers to Project Server Subscription Edition.

Check the wording against the page before shipping it — if the guidance names more than one destination, or qualifies it, say what it says rather than what this brief guesses. Record the page, its date and what it supports in §11.

**Do not write** any version that asserts what Microsoft has not published.

---

## 3. The enterprise-tier claim

Published: that **cross-project resource demand requires the enterprise-tier service**.

The Microsoft Learn service description CC read directly, dated 4 September 2023, does not say this. It states a gate of a different shape: any interaction with a Project Online site requires at least a Project Plan 3 or Project Plan 5 subscription in the tenant.

That is a per-seat licence floor, not a feature gate on cross-project resource demand. It is also the better fact for our purposes, because a cost per head is more concrete than a tier name:

> Every person who interacts with a Project Online site needs a Project Plan 3 or Plan 5 licence in the tenant.

**Verify against the primary document before writing it**, including whether the description has been revised since September 2023. Record it in §11 with its date.

If, having read it, you find the original claim is supported somewhere else in Microsoft's documentation, say so and cite that instead. The fault is that nothing supported it, not that it is necessarily false.

---

## 4. The Flexera figures

CC recorded page 25, N=506, and the population description as inherited from a gated PDF and not re-read.

PR15 §8.3 cut the organisation-size clause from the report body. **Report whether any of those inherited figures is still published anywhere** — report body, workings, sources table, marketing site.

- If none is published, the §11 entry stands as a record and nothing else is needed.
- If any is still published, it is the same class as §2 and §3: a figure in front of a reader that nobody has verified. Report which, and propose either a first-party replacement or removal. Do not remove anything without reporting first, because the Flexera row corroborates the run/change split.

---

## 5. The guard must pass on the new rows

Every claim corrected here gets a §11 entry naming the work, and the PR15 source guard must pass against it without exemption. Report the token set used for each new row.

**Record what was wrong, not only what is now right.** The Panko entry's value is that it says the prior claim was contradicted rather than merely unverified. Both entries here should do the same: what was published, what the source actually says, and when it was read.

---

## 6. The marketing site — report, do not change

The migration-path claim also appears on the marketing site. The site's broader copy work is out of scope and belongs to Mark.

**Report every site occurrence with its file and line**, and stop there. Whether to correct the site in this PR is Mark's call, and he will tell you. A corrected tool beside an uncorrected site is the `/start` problem again, so this is not a small question — but it is not yours to decide.

---

## 7. Acceptance criteria

- [ ] Both §1 gates answered before any change.
- [ ] Every published claim about a third party's product is supported by a document that has been read, cited, and recorded in §11.
- [ ] No asserted absence about a third party's product survives anywhere in output.
- [ ] The PR15 source guard passes on every new row, with no new exemption.
- [ ] Nothing computed changes. Any citation figure that moves is predicted first and reported.
- [ ] Site occurrences reported and unchanged.
- [ ] No em-dashes in output. Every en-dash in a number range survives.
- [ ] Every PR1 to PR15 assertion still passes.

---

## 8. Report back with

1. The two §1 gate answers.
2. What each Microsoft document actually says, quoted, with its date and URL.
3. The final wording for each claim.
4. Whether any Flexera figure is still published, and where.
5. Every marketing site occurrence, unchanged.
6. Which citation figures moved.

---

## 9. Not in this PR

- **The one-time token on the emailed link**, so a returning respondent is not re-gated and does not create a duplicate subscriber. Goes with PR17, which touches the same files.
- **Capturing every submission.** PR17.
- **`pm_load` formatting.** Decided: leave it. The email no longer renders any computed field except the permalink, so the number-versus-text discrepancy has no surface today, and changing the Sender field's type to text would remove numeric comparison from any future segment rule. Revisit if and when the nurture uses the field. Record the decision in §11 so it is not rediscovered.
- **What fourteen days produces.** Not blocking the tool.
- **The marketing site.** Mark's, separately.
