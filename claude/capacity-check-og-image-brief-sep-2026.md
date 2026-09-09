# Design brief — Capacity Check link preview image

**What it's for.** When someone pastes a Capacity Check result link into Teams, Slack or LinkedIn, this is the card image that appears beside it. Today those previews are blank.

**Deliverable.** One PNG, named `capacity-check-og.png`, to go in `public/` in the projexar repo.

---

## 1. Canvas and export

| | |
|---|---|
| Dimensions | **1200 × 630 px**, exported at 1× (these are the final pixels, not a 2× asset) |
| Format | PNG, **no transparency** — some clients composite on white, others on black |
| File size | Under 300 KB |
| Safe area | All content inside **60 px** of every edge. Assume the outer band may be cropped. |

**It must be legible at 360 px wide.** That is how it renders in a Slack sidebar. Design it, then look at it at 30% and check the headline still reads. This constraint drives everything below — it is why there is so little on the card.

---

## 2. Colour and type — take these from the source, do not sample the screenshot

The tool's styling lives in a single `:root` block of CSS custom properties in the repo. **Pull the exact hex values from there**, and use the site's own display typeface. Do not eyedrop from a screenshot and do not substitute a similar font — the whole point is that this reads as ProjexaR at a glance.

Values needed: the navy used for the wordmark, the bright blue accent used on the "Start free" button, and the pale lilac used behind the eyebrow pill on the site.

**Background: full-bleed navy.** Not white. A white card disappears against Slack's own background; the navy is ProjexaR's most identifiable colour and gives a solid block in both light and dark themes.

---

## 3. Layout

Single left-aligned column. Nothing centred, nothing decorative.

**Wordmark** — top left, at x 80, y 80. The ProjexaR logo reversed to white, around 60–70 px tall. Include the "capacity aware project management" lockup line beneath it if it stays legible at that size; drop it if it doesn't.

**Headline** — left aligned, starting around y 230, maximum width 1000 px. Bold, white, roughly 76–84 px, line height 1.1. **Two lines maximum.**

**Supporting line** — one line, around 28 px, roughly 40 px below the headline. White at about 70% opacity, or the pale lilac if it holds contrast against the navy.

**Accent** — one short horizontal rule in the bright blue, about 6 px tall and 80 px wide, sitting just above the headline. This is the only decorative element. Nothing else.

**Foot** — `projexar.com/capacity-check` at around 22 px, white at about 55%, bottom left at y 500.

---

## 4. Copy — use exactly this

**Headline:**

> Your projects are staffed by people who already have day jobs.

**Supporting line:**

> Capacity Check — free, three minutes, no sign-up.

**Foot:**

> projexar.com/capacity-check

**If the headline runs to three lines** at a size that stays legible at 360 px, use this instead rather than shrinking the type:

> Who is actually delivering your projects?

---

## 5. What must not be on it

- **No numbers, ratings or results.** This is one static image shown for every shared result. It cannot reflect the reader's answers, and anything that looks like it does will be wrong for almost everyone.
- **No question count.** The tool goes from fourteen to fifteen questions in the current release, and a static image saying "fourteen questions" goes stale the day it ships. This is why the supporting line says "three minutes" instead.
- **No claim about outcomes** — nothing in the shape of "find out how much you could save". The tool deliberately makes no ROI or payback claim anywhere, and the card must not either.
- **No stock photography, no people, no dashboards, no abstract tech imagery.**

---

## 6. Why the headline says what it says

The person seeing this card has been **sent someone else's result**. They are not the respondent. So the card cannot promise them their own numbers, and a product description ("a capacity planning tool") gives them no reason to click.

A statement of the problem does. "Your projects are staffed by people who already have day jobs" is true of nearly every IT department, it is the thing the tool actually measures, and an IT leader reading it recognises their own week in it. That recognition is the click.

---

## 7. For whoever wires it up

Alt text for `og:image:alt`:

> ProjexaR Capacity Check — a free diagnostic showing how far project delivery depends on BAU staff.
