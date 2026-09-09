# ProjexaR Free Tier — Decision Record

1 September 2026. Supersedes and consolidates the earlier free-tier analysis and conversion-mechanics notes.
Research report (170-product survey): artifact "Where Free Ends" — https://claude.ai/code/artifact/b13a8fe4-b180-4ce2-957e-78156c17a94a

---

## 1. The decision

> **ProjexaR's free tier is 5 managed resources, free forever. Everything else is unlimited: projects, line managers, project managers, viewers. Support is best effort, chatbot only. It is reached through a 14-day sandbox in the customer's own tenant with their own data, which contracts to the free tier on day 14.**

That is the whole offer. Everything below is either the definition needed to build it, or a decision deliberately deferred.

## 2. Settled, with the reasoning

**The number is 5.** The Phase 1 ICP floor is 5 delivery staff. A cap of 5 managed resources serves every firm below the target market and stops at the first firm inside it. It is the boundary of the existing ICP definition, not a judgement call. The knowing cost: a firm with exactly 5 delivery staff uses ProjexaR free indefinitely — the lowest-value, highest-support customer in the segment, and the one most likely to advocate and grow. Best-effort chatbot support caps the downside.

**A managed resource is a person with capacity recorded in the system.** Line managers, project managers and viewers who plan or consume but hold no capacity record do not count against the cap. A five-person delivery team plus a non-delivering ops manager fits inside free.

**The cap sits on managed resources because that is the axis the customer grows along.** A firm that wins more work and hires more delivery staff crosses the line without anyone deciding to buy software. A firm can double in headcount and still have one line manager, which is why the earlier manager-scoped model would never have converted. The free cap and the paid meter are the same unit, so free is the first five units of the paid product: one number on the pricing page, one number to enforce.

**Free supports multiple line managers inside the workspace.** Two managers holding two and three people lets a PM raise demand across pools, which demonstrates the core proposition at small scale. Restricting free to one line manager returns us to the rejected model.

**Sandbox contraction at day 14.** Warn in-app and by email at day 10 and day 13, naming their resource count against the five included. If no action is taken, the whole workspace goes read-only — not a partial freeze, because keeping an arbitrary five editable would present a false utilisation picture, the exact failure the product is sold against. The customer then chooses which five to retain, or upgrades and everything unfreezes. Nothing is ever deleted; surplus resources are archived and restorable indefinitely. Assignments referencing archived people surface as unfulfilled rather than vanishing, so the limitation renders in the product's own language. Category precedent: Miro locks all but three boards to view-only; Airtable keeps over-limit bases readable but blocks new records.

**No domain cap and no pooled allowance.** Pooling was tested against the arrival of a second line manager and withdrawn: if the first holds all five, the second can add nobody; if the first holds four and the second wants three, the second gets one. A second adopter inside the same company is a success signal, and at signup deliberate fragmentation and organic spread are indistinguishable.

## 3. Deliberately deferred

**Cross-workspace demand as a paid capability.** The idea — a PM sees that a person is managed in another workspace on the same domain but cannot request them until the workspaces combine — is sound, and it correctly locates the pain with the PM rather than the line manager. It is deferred because it solves a Phase 2 problem (mid-market internal IT with several line managers), requires a feature to be built, and raises a privacy question about revealing that a named individual is managed elsewhere. No Phase 1 customer is affected: tech delivery businesses run a single pool and do not fragment.

**Option 5, free supply side / paid demand side.** Revisit once there is an established base, revenue and references.

**The fragmentation worry generally.** A department can only stay fragmented and free if no project ever needs a person from another manager's team — and a department in that position has no use for ProjexaR, whose entire premise is that projects draw on specialists sitting inside BAU teams. Measure it; do not pre-empt it.

## 4. What is not yet proven — and how it gets tested

The decision above is sound but three assumptions underneath it are untested. Naming them, with a stated hypothesis and a review date, is what makes the decision testable rather than merely made.

### The hypothesis

**The free tier exists to buy reach and advocacy in MSP peer communities, not near-term revenue.** It should be judged on signup volume and referral share for the first twelve months, not on conversion revenue. The benchmark sets the expectation: freemium converts at 3–5% within six months (ChartMogul, n=200, Jan 2026), so 100 free workspaces buys 3–5 customers in six months. Judging free on revenue at month six would kill it prematurely and for the wrong reason.

### The three untested assumptions

| Assumption | Test | When |
|---|---|---|
| 5 resources is enough to be worth signing up for | Ask directly in the 5–10 ICP discovery interviews already planned: would you start if it were free for five people, and at what team size does five stop being enough? | Pre-launch |
| Free does not simply cannibalise the bottom of the ICP | Ask firms at the ICP floor whether they would pay at 6–8 people or live within 5 | Pre-launch |
| Free drives referral in peer communities | Signup source attribution; referral share of new signups over time | Post-launch, 12 months |

The third is the weakest link in the whole analysis. It is the entire justification for running a free tier in a category where no competitor offers one, and there is no published benchmark for it. It can only be tested live.

### Health checks at month 6

- **At least 40% of free workspaces reach the 5-resource cap.** Below that, free is not demonstrating enough — the design is wrong rather than the strategy.
- **Referral share of new signups rising.** Flat means the advocacy thesis is not working and free is pure cost.
- **Free-to-paid conversion tracking toward 3% by month 12.**

### Decided in advance: what would make us tighten or withdraw

- Conversion below 2% at month 12 **and** flat referral share → free is not earning its place. Tighten to 3 resources, or withdraw for new signups only. **Never withdraw for existing accounts** — that is the Docker lesson, reversed within ten days after backlash.
- More than 30% of domains carrying multiple free workspaces → fragmentation is real; build the cross-workspace mechanic from section 3.

### Instrumentation required at launch

1. Resource count at stall, per free workspace.
2. Share of free workspaces reaching the cap.
3. Distinct free workspaces per email domain, and total managed resources per domain.
4. Signup source and referral attribution.
5. Step-by-step conversion: Capacity Check → sandbox → free → paid.

## 5. The launch sequencing question — open

The free tier cannot be A/B tested at MVP traffic volumes without a holdout that splits already-thin traffic. The one cheap test available is **sequential**: launch with the sandbox only, add the free tier at a defined point, and measure the step change in signup rate, referral share and conversion.

- **For:** free is real build work (cap enforcement, contraction, archive and restore, choose-your-five); deferring it ships MVP sooner. It establishes a clean sandbox-only baseline. Adding a free tier later is a marketing event, whereas tightening one is a backlash.
- **Against:** free-forever is the category differentiator, and withholding it delays the main marketing angle and the reach that seeds peer-community word of mouth in the period it is most needed.
- **Limitation to acknowledge:** a sequential test is confounded by everything else changing over time — awareness, content, paid activity. It gives a signal, not a clean read.

**This needs a decision.** It is the last structural choice outstanding.

## 6. Rejected models and why

| Model | Why it fails for ProjexaR |
|---|---|
| Two projects free forever | Fragments the resource pool; true utilisation unknowable. The original diagnosis, and correct. |
| One line manager, 10 resources | Repeats the same flaw on the org axis rather than the project axis; and at 10 resources it serves a whole ten-person MSP, inside the ICP. |
| Card-required trial, no free tier | Highest measured yield (10.5 customers per 1,000 visitors against freemium's 5.0) but card-before-product is too high a barrier for an unproven MVP with a digital-first buyer journey. |
| Free capacity register from Capacity Check | Capacity Check is a point-in-time tool, not a product. |
| Domain caps and pooled allowances | Punish the second adopter, who is a success signal. Trivially evaded. |
| Project, seat, usage, retention, watermark, transaction, ad-funded and open-core models | Assessed and rejected in the research report; none fit a per-managed-resource product sold self-serve by a single team. |

---

## Research basis

170 products across ten categories, vendor pricing pages read September 2026. Conversion benchmarks: ChartMogul × Kyle Poyar × ProductLed, *The SaaS Conversion Report*, n=200 self-serve B2B products, January 2026.

- **Free tiers barely exist in this category.** Float, Resource Guru, Runn, Productive, Silverbucket and Teamdeck are trial-only, as is the entire MSP tooling stack. Two adjacent exceptions: Ganttic (free to 10 resources, unlimited users) and Action1 (free to 200 endpoints). Treated here as a differentiation opportunity, not a warning.
- **Everyone pricing per managed unit gives logins away.** Float charges per scheduled person with free view-only guests; Resource Guru per person on the schedule; Ganttic per resource with unlimited users. ProjexaR's free user allocation is the category norm.
- **Free tiers are being tightened across the market, and adjustment is asymmetric.** Clockify, Freshdesk, Mailchimp and Loom tightened; Deputy, Later, Fresha, Streak, Height and Heroku withdrew free tiers entirely. Raising 5 to 10 later is a campaign; cutting 10 to 5 is a backlash.
- **On the card-required trial figure (25–35%):** it measures conversion to first payment, not retained revenue. No benchmark dataset separates churn or refunds by trial type, so the forgotten-cancellation suspicion cannot be tested. Treat as an upper bound on conversion.
