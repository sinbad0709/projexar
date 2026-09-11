# PR12 — One offer, stated once, everywhere

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`
**Follows:** PR11, merged
**Target files:** the marketing site pages, `site.js`, the Capacity Check HTML
**Date:** 10 September 2026
**Reads with:** `claude/free-tier-analysis-sep-2026.md`, `claude/capacity-check-sender-audit-sep-2026.md` §5

The offer decision is settled and the free tier and the sandbox launch together. This PR makes the site say so. It is the last launch blocker.

**The decision, in full.** A 14-day trial giving unlimited access, in the customer's own tenant with their own data, which contracts on day 14 to a free tier of **five managed resources, free forever**. Everything else on the free tier is unlimited: projects, line managers, project managers, viewers. Support is best effort, chatbot only.

**Numeric invariant.** The Capacity Check's pricing arithmetic does not change. The licence basis, the quote and the share-of-spend figures are all untouched. Assert it.

**Do not merge.** Push, report, and stop.

---

## 1. Gates

**1.1 Find every occurrence, not the seven we know about.**

The audit names the home page, `/start`, `/pricing`, `/contact`, the Project Online migration page, `/product` and the start flow in `site.js`. Treat that as a starting point rather than a list. Search the whole repository, including page titles, meta descriptions, Open Graph tags, alt text, JSON-LD, the sitemap, any structured data, and the Capacity Check's own OG image.

Report every occurrence with its file and context. **Name the search you ran and its scope**, per the standing rule on asserted absences — the answer to this gate is what the guard in §5 is built from.

**1.2 Can one string serve every surface?**

Report whether the site's build allows a single shared constant or partial that all pages read, or whether each page carries its own copy. This is the difference between fixing the contradiction and fixing it until someone edits one page.

If a shared source is possible, use it. If it is not, say so, and §5's guard becomes the only thing holding them together.

**1.3 The free-tier boundary — STOP CONDITION if it is not stated anywhere.**

The Capacity Check quotes the whole resource count: 27 managed resources at the annual rate, not 22 with the first five free. So the five are a cap that ends when you cross it, not an allowance that persists.

Report whether any page states this. If none does, stop and report before writing any pricing copy. A prospect at six resources who reads "five free forever" and expects to pay for one will be quoted six, and they will find out at the point of purchase.

---

## 2. The canonical statement

One wording, used verbatim wherever the offer appears. Mark confirms the exact words before you write them; do not vary them per page once he has.

Proposed, for his confirmation:

> **Start with 14 days of unlimited access, in your own tenant with your own data. After that, ProjexaR stays free for up to five managed resources, with no time limit.**

And the short form, for buttons and captions:

> **Free for five. 14 days unlimited to start.**

Two constraints on whatever he settles on.

**Never present either half alone.** "Unlimited 14-day trial" without the free tier reads as a trial that expires. "Five free forever" without the trial understates what a prospect gets on day one. Presenting either alone is what made the current copy read as a contradiction against itself, and the Capacity Check does exactly that today.

**Keep the billing unit in billing contexts.** Per PR7 §6.5, "managed resource" belongs on the pricing page and in the licence line; prose elsewhere uses people. The free-tier cap is denominated in managed resources, so the pricing page must say so precisely.

---

## 3. The pages

Replace every occurrence found at §1.1 with the canonical statement or its short form.

**`/product` needs more than a string swap.** It describes the paid tier as for teams "running more than two projects at once". The paid trigger is no longer project count; it is resource count, and projects are unlimited on the free tier. That sentence is wrong on its axis, not on its number. Rewrite it to the resource threshold and report the new wording.

**`/start`** carries the old offer at `public/start/index.html:47` and is where both the report email's removed second button and the Capacity Check's "Start free" links point. It is the page most likely to be read immediately after a promise made elsewhere, so it is the one that must match exactly.

---

## 4. The Capacity Check

Two "Start free" links sit beside "Unlimited 14-day trial". The trial half is now correct and the free-tier half is missing.

Use the short form beside the CTA, and the full statement in the ProjexaR section of the printed report, which per PR8 §2.7 states what the product does and what it costs.

**Do not touch the pricing arithmetic**, the licence basis, or the quote. Do not put the offer beside the licence quote in a way that implies the quoted organisation would pay less than quoted: at 27 managed resources they pay for 27.

---

## 5. The guard

Add an assertion that the retired offer never returns, in the same form as the `480` guard: the strings "two projects", "2 projects free" and "free forever" in any construction other than the canonical statement do not appear anywhere in output, on any page.

Build the string list from §1.1's search rather than from this brief. **Fail it deliberately** before trusting it — restore one old string on one page and watch it bite. Report which page you tested it on.

This guard is the only thing that survives the next person editing one page.

---

## 6. Held

- **What 14 days produces.** "14 days" is a duration, not an outcome, and PR7 §8.3 wanted an outcome. It stays held: the sentence would claim what the product delivers in a fortnight, and the MVP scope is not fixed. Norm's wording, later.
- **The email re-gate** and **`pm_load` formatting**. Both still decision-gated.
- **The project manager time-share input.** PR13.

---

## 7. Acceptance criteria

- [ ] All three §1 gates answered, with §1.3 cleared, before any copy is written.
- [ ] Every occurrence found at §1.1 replaced. None missed, and the search that establishes that is named.
- [ ] One wording, verbatim, on every surface. Neither half ever presented alone.
- [ ] `/product` rewritten to the resource threshold, not the project count.
- [ ] The Capacity Check's pricing arithmetic, licence basis and quote unchanged, asserted.
- [ ] The §5 guard present and deliberately failed before being trusted.
- [ ] No em-dashes in output. The copy-rule check passes on every page it now covers.
- [ ] Every PR1 to PR11 assertion still passes.

---

## 8. Report back with

1. The three §1 gate answers, first and separately.
2. The full occurrence list, with the search that produced it.
3. Whether a shared source was possible, and what you used.
4. `/product`'s new wording.
5. Which page you failed the guard on.
6. Anything that could not be done without changing a figure.
