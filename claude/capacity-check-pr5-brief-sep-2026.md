# PR5 — Layout, structure and the range bars

**For:** Claude Code, `~/Desktop/ProjexaR/projexar`
**Follows:** PR4, merged
**Target file:** the Capacity Check HTML, plus `tools/capacity-check/`
**Date:** 4 September 2026

Second of three. PR4 fixed what was wrong. This one fixes where things sit. PR6 rewrites the copy.

**The invariant for this PR is simple and strong: no number may move.** Every figure in every shape must be byte-identical to post-PR4 `main`. Three copy strings change and nothing else. If a number moves, something is wrong.

Do not merge. Push, report, and stop.

---

## 0. Before you write anything

1. Branch from `main`. Name it `pr5-layout-structure`.
2. Re-bless the baseline from post-PR4 `main`.
3. **Enumerate the branches before writing fixtures, not after.** Three defects in this release were invisible because the fixture set never took the other side of a conditional — contractors at zero, sterling only, corroboration always Healthy. Before you write code, list every conditional this PR touches and confirm a shape exercises each side. That includes the unrated third tile appearing only when contractors are above zero.

**Stop and ask if:** the section reorder cannot be done by moving DOM nodes without also moving computed values between scopes.

---

## 1. Scope

**In.** Section reorder and one rename · the two navy cards' alignment · the Your Numbers grid · the conversion box's internal alignment · the trial line · a download button · range bars on the rated tiles.

**Out.** Any copy rewrite beyond the three strings named in §3. That is PR6, and doing it here would make this PR's diff unreadable. If you find a sentence that needs fixing, note it in the PR description for PR6 and leave it.

---

## 2. Section order and naming

### 2.1 The reorder

Current order:

1. Your capacity position (tiles)
2. The full cost of your portfolio, and the portfolio growth ceiling
3. What your answers show (four findings)
4. Checks on your answers
5. Your numbers
6. What your answers can show you (comparison table), then the ProjexaR box

**New order:** move item 6 — the comparison table **and** the ProjexaR box together, as one block — to sit directly after item 2.

1. Your capacity position
2. Full cost, growth ceiling
3. **The comparison table, then the ProjexaR box**
4. What your answers show
5. Checks on your answers
6. Your numbers

The reason is that the conversion box currently sits behind the entire report and most readers will never reach it. Moving it up puts it where the reader has just seen their cost and their overrun, which is the moment it makes sense.

Two of the table's six rows cite figures that now appear later in the page — ticket demand, and the run share. Each row states its own figure inline, so nothing is missing. A summary that introduces figures the detail then expands is the right shape.

### 2.2 The rename — one section, not both

"What your answers show" and "What your answers can show you" are almost the same words for two different things, and the reorder puts them closer together.

**Rename only the promoted one.** Renaming both doubles the copy change for no gain.

| Section | Name |
|---|---|
| The comparison table and ProjexaR box | **What your plans would show instead** |
| The four findings | **What your answers show** — unchanged |

The new name says what the section is: the same questions, answered from real plans rather than estimates. It also makes the contrast with the findings section deliberate rather than accidental — your answers, against your plans.

---

## 3. The three copy strings that change

Nothing else in this PR touches text.

1. The section heading, per §2.2.
2. **`Two projects free, forever. No time limit.`** → **`Unlimited 14-day trial`** — under the Start free button. The rest of the site still says the old thing; this is where the change starts.
3. The download button label, per §7.

---

## 4. Alignment fixes

### 4.1 The two navy cards

The full-cost card and the growth-ceiling card have different widths. The cost card is inset relative to the ceiling card on both sides, which reads as a mistake rather than a choice.

Give them the same container width and the same horizontal padding. Most likely they sit in different wrappers; put them in one.

### 4.2 Your Numbers

Each row is a figure and a description, and the description starts at a different horizontal position on every row because the figures are different widths — `3.8%` against `6.2–8.0 FTE`.

**Use a two-column grid with a fixed first column.** Size it to the widest figure with a little room, so every description begins at the same x. Right-align or left-align the figures within that column consistently, whichever sits better with the existing type.

Check it at the mobile breakpoint. A fixed first column that works at 800px may need to stack below about 480px.

### 4.3 The conversion box

Three different content widths inside one box: a centred heading, a centred intro, then a left-aligned pricing paragraph in a narrower column, then a centred button. The pricing paragraph's left edge lines up with nothing.

**One content width for everything inside the box.** Heading and button centred, body prose left-aligned within that same column. Centred prose over several lines is harder to read than left-aligned, so do not fix it by centring everything.

---

## 5. Range bars on the tiles

The mockup carried a band track under each rated tile and it reads well. Add it.

**What it is:** a horizontal bar drawn to scale showing the full band range, with the three band zones tinted, the respondent's value or range marked on it, and the thresholds labelled underneath. The reader sees where they fall rather than having to hold two numbers in their head.

Geometry, from the mockup:

```
scale_max   = Math.max(hard_min, high_endpoint × 1.25)
zone widths = 0→t1 Healthy, t1→t2 Watch, t2→scale_max At risk, as percentages of scale_max
marker      = left: lo/scale_max, width: (hi − lo)/scale_max, minimum width ~1.2% so a
              single value still renders as a visible mark
ticks       = t1 and t2, labelled with the threshold values, centred on their positions
```

| Tile | t1 | t2 | hard_min |
|---|---|---|---|
| Concurrent projects per PM | 5.0 | 7.0 | 12 |
| Live projects per effective BAU FTE | 5.0 | 10.0 | 14 |

**No bar on the unrated contractor tile.** A band track implies thresholds and that tile has none. A bar there would suggest a rating that does not exist.

**The visual design is yours, not the mockup's.** The mockup's colours and spacing are mine and do not belong in your design system. Use the tool's own band colours and the existing CSS custom properties. Take the geometry, not the styling.

**One thing to look at while you are in there.** The third tile is orphaned in a two-column grid, sitting alone on a second row. Three options, in the order I would try them: make the row three across and check the bars still read at that width; leave the gap; or fold the contractor figure into the BAU tile as a secondary line, since it is the same measure with contractors added. The third is the tidiest but it is a structural change, so say what you did.

---

## 6. Download button

Add a button directly after the first block of output tiles, linking to the report download section at the foot of the page. An in-page anchor, nothing more.

The download currently sits behind the whole report and a reader who stops halfway never learns it exists.

---

## 7. Fixtures and verification

**No fixture values change.** 8.A, 8.B, 8.C, 8.D, 8.E and 8.F all reproduce exactly as they do on post-PR4 `main`.

**The check that matters:** render every shape against both commits and diff the full multiset of published numbers. **The expected result is that it is empty.** Not "explained departures" — empty. Any number that moves in a layout PR is a bug.

Text diff: exactly three strings, per §3.

New shapes: the range bar rendering on both rated tiles, at a point value and at a range · the bar absent on the unrated tile · the reordered section sequence · the Your Numbers grid at the mobile breakpoint · the download anchor resolving to an element that exists.

---

## 8. Acceptance criteria

- [ ] The number multiset is identical across all shapes. Empty diff.
- [ ] Exactly three copy strings changed.
- [ ] The comparison table and the ProjexaR box moved together, directly after the growth ceiling.
- [ ] The promoted section is renamed; the findings section is not.
- [ ] The two navy cards share a width and a padding.
- [ ] Every description in Your Numbers starts at the same x, at desktop and at mobile.
- [ ] One content width inside the conversion box; prose left-aligned, heading and button centred.
- [ ] Range bars on both rated tiles, none on the unrated one, using the tool's own colours.
- [ ] The download button resolves to the report section.
- [ ] Every PR1–PR4 assertion still passes.

---

## 9. Report back with

1. Confirmation that the number diff is empty.
2. What you did about the orphaned third tile.
3. Any sentence you wanted to fix and left alone, listed for PR6.
