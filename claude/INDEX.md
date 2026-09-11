# Capacity Check — specification set

**Placed under version control 9 September 2026**, after PR7 established that Claude Code had been working from as-issued snapshots in `~/Downloads` while the maintained versions existed only inside the Claude project. The two sets had diverged. `capacity-check-pr1-brief-sep-2026.md` carries an inline marker recording that it was replaced on 4 September, after PR1 was already open.

## The rule

**The copy in this directory is the only authoritative one.** If a document is corrected, it is corrected here and committed. No document is edited anywhere else and handed over as a file. Nothing is read from `~/Downloads`.

Two consequences follow, and both caused real defects before this directory existed:

1. **Briefs are edited in place after issue.** A brief you were handed is not necessarily the brief that stands. Read from `main`, not from the copy you were given.
2. **Addenda are part of the brief they amend.** `capacity-check-pr1-addendum-sep-2026.md` corrects the PR1 brief's bands statement wording and did not reach Claude Code at all. Anything that reads a brief must read its addendum.

Any commit that verifies, disproves or changes the status of an item in the master's §11 verification register updates the register in the same commit.

## The documents

| File | What it is |
|---|---|
| `capacity-check-change-spec-sep-2026.md` | **The master.** §0 constraints, §10 decisions taken, §11 verification register. Everything else defers to it |
| `capacity-check-handover-sep-2026.md` | State at the end of the 4 to 5 September release: what is open, what runs in parallel, what the release found |
| `capacity-check-pr1-brief-sep-2026.md` | PR1. Contains a superseded-version marker at the bands statement |
| `capacity-check-pr1-addendum-sep-2026.md` | Corrects PR1's bands statement. **Read with the PR1 brief, never alone** |
| `capacity-check-pr2-brief-sep-2026.md` | PR2. Full cost, contractors, loaded cost per head, banded time input, pricing arithmetic |
| `capacity-check-pr3-brief-sep-2026.md` | PR3 |
| `capacity-check-pr3-addendum-sep-2026.md` | Corrects PR3. Read with the PR3 brief |
| `capacity-check-pr4-brief-sep-2026.md` | PR4. Currency, the ticket-rate comparison, three caveats |
| `capacity-check-pr5-brief-sep-2026.md` | PR5. Section reorder, layout, the trial line |
| `capacity-check-pr6-brief-sep-2026.md` | PR6. The copy rewrite. §6 carries the protected-text list |
| `capacity-check-pr7-brief-sep-2026.md` | PR7 revision 2. The response to the independent audit of 9 September |
| `capacity-check-pr7-addendum-sep-2026.md` | Rules on PR7's two stop conditions. Read with the PR7 brief |
| `capacity-check-og-image-brief-sep-2026.md` | Open Graph image |
| `claude_capacity-check-pr8-brief-sep-2026.md` | PR8. The printed report rebuilt as a forwardable document |
| `claude_capacity-check-pr9-brief-sep-2026.md` | PR9. The Worker gate, Turnstile, and the covering note |
| `claude_capacity-check-pr10-brief-sep-2026.md` | PR10. One reading measure, one notation per figure |
| `claude_capacity-check-pr11-brief-sep-2026.md` | PR11. The Sender audit's launch blockers |
| `claude_capacity-check-pr12-brief-sep-2026.md` | PR12. One offer, stated once, everywhere |
| `capacity-check-sender-audit-sep-2026.md` | The Sender audit of 10 September. Its §5 carries the launch blockers PR11 and PR12 answer |
| `free-tier-analysis-sep-2026.md` | The offer decision of 1 September, and the definition of a managed resource |

Not held here, and available on request: the July 2026 competitive analysis, the competitor profiles, and the Capacity Ledger design of record.
