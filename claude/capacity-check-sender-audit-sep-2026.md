# Capacity Check: Sender audit

**10 September 2026, revision 2.** An audit of what Sender sends after the Capacity Check gate, and of what it is configured with. Revision 2 adds the Sender evidence collected on 10 September (the account's configuration, a group export and three controlled test submissions) and corrects revision 1 where that evidence disagreed with it. No code, repository or Sender setting has been changed by this audit.

**Primary sources.**

- *Sent email:* three received copies of the report email (your submission of 10 September and Tests A and B), saved as HTML from Outlook.
- *Sender configuration:* the template (screenshot, and the subject, preheader, sender and button settings as copied from the account); the custom field list and one field's default value; the automation list, with the report automation's trigger and Repeat workflow setting; the group list.
- *Sender data:* a CSV export of the Capacity Check Leads group (eight subscribers), and the profiles and activity logs of mark+pjr2, mark+testa and mark+testb.
- *The report:* the printed report for your submission (PDF, 13 pages).
- *Code:* `src/worker.js`, `public/capacity-check/index.html`, the site's other pages and `wrangler.jsonc` on `main` at `91dd79d`, with their git history, from a read-only clone of the public repository.
- *Documents:* the payload manifest in the description of PR #14; master specification §0, §2.1, §2.4, §2.5, §2.7, §3.1, §3.5, §5, §6, §8 and §11; PR7 brief §0 and §7 to §9; the free-tier decision of 1 September; the Capacity Ledger design of record; and the Sender help and API pages listed at the end.

**Checks.** Expected field values were computed by running the tool's own code on each submission's inputs, and every stored record was checked the same way. Separate adversarial passes checked revision 1 and this revision claim by claim, and their corrections are incorporated.

---

## 1. What I could not audit, and what would settle it

Five items remain open. None of them blocks the rewrite; items 2 and 3 need the rewrite in place before they can be tested.

1. **Whether a blank value empties a number field on an update.** When a subscriber is created, a blank value is simply not written (Test B). On an update, a blank company erased the stored company (Test C), but no number field went blank in any test. This matters because a respondent whose second run has no project managers or no live projects might otherwise keep figures from the first run. **Settles it:** an optional Test D from mark+testa, entering the same name and company as Test A, at `https://projexar.com/capacity-check/?ch=800&st=30&m=0&l=26&a=40&sp=200000&cu=GBP&bs=14&bp=41&ct=2&tk=600&sx=70&tl=msproject&rv=manual&bt=outthedoor&ak=live`. The tool will send PM Load and RAG PM blank, Licence Count 16 and Headroom 47. No email will arrive, because the address has already had one; read the result from the profile. If PM Load still reads 6.5, blank values leave stale numbers behind.
2. **Whether Sender prints a stored zero in an email.** Test B's zeros (BAU Staff and Licence Count) are logged as "set to 0" but do not appear on the subscriber's profile, which suggests Sender's interface treats zero as empty. If campaigns do the same, a respondent with no live projects would see nothing, or a default, where the tool computed 0. **Settles it:** after the template change and with defaults cleared, a submission from a new address at `https://projexar.com/capacity-check/?ch=800&st=30&m=3&l=0&a=40&sp=200000&cu=GBP&bs=14&bp=41&ct=2&tk=600&sx=70&tl=msproject&rv=manual&bt=outthedoor&ak=live`, where the tool sends a PM Load of 0 rated Healthy.
3. **Whether Liquid works in this account.** Sender's help documents a `default` filter and `{% if %}` conditions, but not which editors or plans support them, and this is a free account. **Settles it:** the render tests in section 5.
4. **The flag automation's settings.** Two observations need them to be explained. The three records created on 10 August are flagged, although `budget_tracking` did not reach Sender until 19 August (commit `ae9cc60`). And Test C's later change to out-the-door did not flag. **Settles it:** a screenshot of the flag automation's trigger, condition, steps and Repeat workflow setting.
5. **Whether a blank first or last name erases a stored name on an update.** Test C re-entered the same names, so this was not tested; names are top-level fields, not custom fields, and may behave differently from Company. It matters only if a later email uses the name.

Band proportions (Part C.1) cannot be reported, and no artefact would change that yet: all eight subscribers in the export are you or Norm, and the site has not launched.

One caution on method. Sender's activity log is not a complete record of sends: mark+pjr2's log showed no send entry, yet that address received its report email. Confirm delivery from the inbox or the automation's report, never from the absence of a log entry.

**Settled since revision 1.**

| Item | How it was settled |
|---|---|
| Whether the custom fields populate | Every value the tool sent is stored, and every record written by the current code holds exactly what the tool computed; blank values are not written (Part B) |
| The codes behind the template's merge tags | The subject and preheader, as copied from the account, contain `{{exposure}}` and `{{commitments}}` |
| Subject line, preheader and sender | Copied from the report automation's email settings (Part A) |
| Button destinations | First button `{{report_permalink}}`; second button `https://projexar.com/start/` |
| The grey values in the field list | Sender default values: Headroom's is confirmed as 26, and the other ten sit in the same place |
| The payload manifest | The Worker source and PR #14's manifest list the same fifteen fields |
| "Two groups and two campaigns" | Part C.2 |
| Blank values on a new subscriber | Not written, and not rejected: the subscriber is created and the email sent (Test B) |
| Whether `report_requested_at` parses | It does; the profile shows date and time |

**Conflicts resolved in the primary text.**

- **`headroom` and zero.** The briefing says `headroom` reads 0 for two different reasons. That was true before PR1, and the wording survives in worker.js 289–292 and master §6 (line 504). The tool's code (index.html 2031–2063) and master §2.7 give zero a single meaning.
- **When `effective_fte` and `projects_per_fte` were null.** The briefing says both posted null "for months before PR2"; master §6 says "since before PR1". Git shows that neither field existed before 19 August. From then until PR1's merge both posted values. Between PR1's merge and PR2's (4 September, 17:03 and 18:37) only `effective_fte` posted null, because PR1 renamed the property it read.
- **The old Watch band.** Master §2.4 describes the old PM Watch band as 9–12. The pre-PR1 code was `BAND_PM = { amber:8, red:12 }` with a strict comparison (commit `c9d0273`, lines 1032 and 1078), so Watch was above 8 and up to 12.
- **The cost-blind rule.** worker.js 312–314 and PR #14's manifest describe it as "any value other than 'tracked'", although the field carries the option's full text. The Sender implementation nonetheless behaves correctly on a first submission (Part B).

---

## 2. Part A: template copy

One template sits on this path: the email the "Capacity Check Leads" automation sends when a subscriber joins that group. Its body and preheader were identical in all three sends on 10 September apart from the first name, once tracking links and Outlook's own per-save identifiers are removed; the subject is not in the saved HTML. Quotations are from the template, with the received text where it differs. Every replacement was checked against all eight rules and against the uploaded report, and also respects PR7's additions to §0: at most one asserted inference, judgements made by us rather than by the report, and no staff cost beside the licence price. No replacement that uses a custom field should go live until the defaults in Part B are cleared.

| # | Text | Rules breached | Replacement |
|---|---|---|---|
| A1 | Subject: "{{ firstname }}, your Capacity Check result: {{exposure}}" | **7**: `{{exposure}}` is a retired field and renders empty, so every subject ends in a colon with nothing after it; a blank first name also makes it begin with a comma. The saved file names ("Audit your Capacity Check result" and, with no name, "your Capacity Check result", each followed by a space) are consistent with both, since file names drop punctuation. **2 and 3**: it promises a single result, where the report gives two ratings and shows ranges. | "Your Capacity Check results" |
| A2 | Preheader: "{{commitments}} commitments across your live projects - the full picture inside", received as "commitments across your live projects - the full picture inside" | **3**: "the full picture" contradicts the report, which calls itself "A directional check, not an audit" (cover) and says "A figure taken today is a snapshot of a moving picture" (p. 11). **2**: it presumes a commitment count, a retired quantity. **4**: a spaced hyphen doing an em-dash's job is the same fault in another character. **7**: the empty tag leaves it starting mid-sentence. | "A link to your Capacity Check results" |
| A3 | "Your IT team's project load,in one number" (headline) | **7**: no space after the comma, in static text. **2 and 3**: it promises one number, where the report rates two measures separately and says "Every figure drawn from a banded answer is shown as a range" (p. 2). | "Your IT team's project load" |
| A4 | "Hi {{firstname}} ," received as "Hi Mark ," and, with no name (Test B), as "Hi ," | **7**: a non-breaking space typed after the tag sits before the comma. Both name fields on the gate are optional (index.html 4693–4695). | See note A4. |
| A5 | "Across your live projects, your IT people are holding {{commitments}} separate project commitments, {{load_per_person}} per person on average." Received with both values empty. | **2**: a single per-person average. The current model has no commitment count and no per-person average, and its nearest figure, `projects_per_fte`, is one endpoint of a range. **7**: a non-breaking space plus a leading space in the bold run doubles the gap before "separate". Both tags are retired fields. | "On concurrent projects per project manager, your figure is {{pm_load}}, which we rate {{rag_pm}}." |
| A6 | "Based on what you told us, that puts your exposure at {{exposure}} ." Received as "…exposure at ." | **7**: a space before the full stop. `{{exposure}}` is a retired field, and the current model rates two measures with no combined exposure figure, so no value can stand in for it. | "We rate the load your projects put on BAU staff {{rag_bau}}, taking the less favourable end of the time band you chose." |
| A7 | "Open your full report" (first button, linked to `{{report_permalink}}`) | **3**: the link opens the on-screen results (index.html 4875–4882). In the tool's own vocabulary the full report is the PDF, and on that page it sits behind the gate again, headed "Get the full report" (line 1201). | "Open your results" |
| A8 | "The five-page report walks through where that number comes from, what a {{bau_band}}BAU share does to your delivery risk, and four things you can fix this week without buying anything." | **3**: the report is 13 pages as uploaded, and no page count holds across inputs and browsers. "Delivery risk" and "this week" appear nowhere in it (search of the extracted text); its section is "Four steps, no software required". It also describes the PDF as though the button opened it. **2**: "that number" presumes a single figure. **7**: no space between the tag and "BAU". `{{bau_band}}` is a retired field. | "The link opens your results. The full report, with the workings and four steps that need no new software, is saved from that page as a PDF." |
| A9 | "This report counts people, not hours — a snapshot, not a live picture." | **4**: em-dash. | "Your figures are built from counts of people, not hours, and they are a snapshot, not a live picture." |
| A10 | "ProjexaR keeps that picture current automatically: your line managers set BAU time once, and every project plan that depends on it updates when it changes." | **1**: a present-tense claim about a product that has not shipped, and the highest exposure in the email. The word "once" also conflicts with the design of record, in which the BAU declaration is a time-phased record that line managers maintain. | "ProjexaR is being designed so that each line manager records the BAU commitment of each person in their team, and every project plan that depends on it reads from that record." |
| A11 | "See it on your own projects" (second button, linked to `https://projexar.com/start/`) | **1**: it invites the reader to use the product now, and its destination says "Point ProjexaR at your files and it builds projects, people and assignments for you." **8**: the destination says "Two projects, free forever. No card, no time limit." (public/start/index.html line 47), which is the rejected offer. No page on the site currently states the 1 September offer: the home page, `/start`, `/pricing`, `/contact` and the Project Online migration page all offer two projects free, and `/product` describes the paid view as for teams "running more than two projects at once", with buttons to `/start`. | Remove it until a destination states the 1 September offer. See note A11. |

**Note A1.** Sender does not document whether a fallback for an empty tag works in subject lines, so a tag there adds risk for no benefit.

**Note A4.** Use `Hi {{ firstname | default: "there" }},`. Sender's Liquid help page documents that filter with this example, but not which editors or plans support it, so test it with a subscriber who has no first name before relying on it. If it fails, use "Hello," with no tag. A Sender default value is not available here, because First name is a built-in field with no default-value option in your list.

**Notes A5 and A6.** A5 uses `pm_load` because it is the only rated measure whose figure does not depend on the time band; it is phrased as "your figure is" so that a value of exactly 1 does not produce "1 concurrent projects". A6 gives no figure, and its closing clause is true in every case, because `rag_bau` is always taken at the less favourable end; where the band straddles a threshold the report names both states ("Watch to Healthy", adverse first) and the email names the rating. Three conditions break these sentences, and each needs a render test from a new address before launch (section 5):

- `pm_load` and `rag_pm` are blank when the respondent enters no project managers, and `rag_bau` is blank when the BAU measure is suppressed. Test B showed a blank value is not written, and Sender's help says an empty tag "is replaced with an empty value", so each sentence would read with a gap. Sender documents `{% if %}` conditions that would let a sentence drop out, but not how an empty number field compares inside one.
- `pm_load` is 0 when there are no live projects. Whether Sender prints a stored zero is open (section 1, item 2).
- Until the defaults are cleared, a blank or possibly zero value would print a default instead, such as 9.0 or Amber.

**Note A7.** The relabelled button is true, but the page it opens asks for the respondent's email again before it gives them the PDF, and passing that gate writes to Sender again (Part C.2). That is a decision for you (section 5), not something the template can fix. The page also carries "Unlimited 14-day trial" beside two "Start free" links to `/start`, which is a rule 8 exposure one click on; that is tool-side.

**Note A10.** Deleting the sentence is the zero-risk alternative; the heading and A9 stand without it.

**Note A11.** Once the offer is live, the button should state it. Under the 1 September decision that is a 14-day sandbox in the customer's own tenant, contracting to five managed resources free forever. The decision record leaves open whether the free tier launches with the sandbox or later (its §5), so the wording waits on that decision, and it is yours and Norm's.

**What passes.** The heading "What this doesn't show you" passes all eight rules, and so does the sender: the from name is ProjexaR and the from address is mark@projexar.com, with replies coming to that address. Rule 5 passes: a case-insensitive search of the received email's visible text finds none of the five barred hedges, and neither "about" nor "around". Rule 6 passes: nothing frames cost as a return, and the one mention of hours says the check does not use them. Rule 8 passes on the email's own text, which states no offer; the exposure lies in the pages its buttons open.

---

## 3. Part B: field mapping

The fifteen fields are the keys of the Worker's `fields` object (worker.js 319–346), and PR #14's manifest lists the same fifteen. Each key matches the Code column of your field list character for character, except `report_consent`, which has no Sender field. Population was checked on ten subscribers: the eight in the group export, plus Tests A and B, with Test C updating Test A's subscriber. Every record written by the current code (the four from 10 September and Tests A, B and C) holds exactly what the tool computed for its inputs. I checked this by re-running the current code on each record's stored link. The four older records hold what the version of the tool that wrote them computed (Record history, below).

| # | Field | Sender field | In template | Evidence | Verdict |
|---|---|---|---|---|---|
| 1 | `company` | Company, text | No | "Audit Test A" stored by Test A; a blank company in Test C erased it | Pass on name; a blank on update erases the stored value (below). |
| 2 | `it_staff` | IT Staff, number | No | 30 (A), 20 (B) | Pass. Default 45. |
| 3 | `bau_staff` | BAU Staff, number | No | 14 (A); 0 (B), logged but not shown on the profile | Pass. Whether a zero prints is open (section 1, item 2). Default 20. |
| 4 | `licence_count` | Licence Count, number | No | 19 (A), 20 after C, 0 (B) | Pass. Includes contractors since PR7 (index.html 2268). Default 25. |
| 5 | `effective_fte` | Effective FTE, number | No | 5.7 (A); not written (B) | **Trap**, below. Default 7.4. |
| 6 | `pm_load` | PM Load, number | No | 8.7 (A), 6.5 after C; not written (B) | Pass. Not banded. Posted as a JSON number, so 9.0 arrives as 9 while the report prints 9.0. Default 9.0. |
| 7 | `projects_per_fte` | Projects per FTE, number | No | 4.5 (A); 2 on your record, where the report shows 1.8–2.0 | **Trap**, below. Default 6.1. |
| 8 | `rag_pm` | RAG PM, text | No | At risk (A), Watch after C; not written (B) | **Trap**, below. Default "Amber". |
| 9 | `rag_bau` | RAG BAU, text | No | Healthy (A); not written (B) | **Trap**, below. Default "Amber". |
| 10 | `headroom` | Headroom, number | No | −8 (A), 3 after C; not written (B) | **Trap, with a correction**, below. Default 26. |
| 11 | `toolset` | toolset, text | No | "Excel or Google Sheets" (A), "Nothing formal" (B) | Pass. It carries the option's display text, not a code. The default "MS Project" is a string the tool has never sent. The display name is lower-case, unlike the others. |
| 12 | `budget_tracking` | Budget Tracking, text | No | The tracked sentence stored by A, which was not flagged; B's "It varies…" was flagged | Pass on first submission; the flag does not follow later changes (Part C). The default "out the door" is a string the tool has never sent. |
| 13 | `report_permalink` | Report Permalink, text | First button | Stored on every record | Pass. The Worker blanks any permalink not on `https://projexar.com/` or longer than 2,048 characters. |
| 14 | `report_consent` | **None** | No | Absent from the export and from every activity log | **Fault: no Sender field exists.** The Worker has posted it since 9 August. The gate cannot be passed without ticking "Email me my report. ProjexaR will also send occasional related emails…" (index.html 1237–1240), and the record of that tick has nowhere to land. |
| 15 | `report_requested_at` | Report Requested At, datetime | No | The profile shows date and time; the export shows 00:00:00 | Pass. Parsed as a datetime (below). |

**Template references.** The template references four tags outside the manifest, in six places, all retired on 19 August and absent from your field list: `{{commitments}}` (preheader and body), `{{exposure}}` (subject and body), `{{load_per_person}}` and `{{bau_band}}` (body). Each rendered empty in the body and preheader of all three sends. The subject is not in the saved HTML, but the file names are consistent with `{{exposure}}` rendering empty there too.

**`effective_fte` and `projects_per_fte`.** Each carries the band's low endpoint, which is the adverse one for both: the least BAU capacity, and therefore the most projects per unit of it (index.html 1897–1910). On your submission that is 12.2 of 12.2–14.0, and 2 of 1.8–2.0. Both are blank when the BAU measure is suppressed. Printing either as "the" figure publishes a value the tool refuses to publish, which is why no replacement in Part A uses them.

**`headroom`.** Signed and unclamped, and negative values are stored correctly (−8 in Test A; −5 and −17 in the export). Zero now means one thing, exactly at the limit. Blank means one of two things: nothing to project from (no live projects, or no annual pace), or no capacity route to project with (index.html 2031–2063). The briefing does not name a second trap: `headroom` is also an adverse-endpoint field. Where the band's two ends give different ceilings, the report prints a range, or a straddle running from "above" to "room", and the field carries the adverse end alone (index.html 2352–2357). The report email does not use it, and nothing observed suggests the flag automation reads it.

**`rag_pm` and `rag_bau`.** They carry "Healthy", "Watch" or "At risk" (index.html 2501), never red, amber or green. `rag_bau` is rated on the adverse endpoint, so where the report names both states the field carries only the adverse word. The report puts the adverse state first ("Watch to Healthy" for a straddle across the Watch boundary; index.html 2513–2520), although the comment at line 2502 describes the order the other way round. The default "Amber" on both is a word the tool does not send, and worker.js 284–287 still states the segment rules in red, amber and green, so any condition written against those codes will match nobody.

**`report_requested_at`.** The Worker stamps UTC as "YYYY-MM-DD hh:mm:ss" (worker.js 342–345), and Sender parses it: mark+testa's profile, after Test C, shows "2026-09-10 15:52" against Test C's stamp of "2026-09-10 15:52:32". The value is UTC while Sender's activity log shows UK time, so the two differ by an hour in summer. The CSV export writes every Report Requested At value as 00:00:00, so use the profile, or the export's Created column, for times.

**`budget_tracking` and the flag.** The payload sends the option's display text (index.html 4770), so the tracked answer arrives as "Internal BAU time is budgeted and tracked" (line 1020) and the bare word "tracked" is never sent. The rule as documented at worker.js 312–314 and in PR #14's manifest therefore does not describe what the field carries. The Sender implementation is nonetheless correct on a first submission: Test A's tracked answer was not added to the flag group, and Test B's "It varies by project manager or team" was. The documentation still needs correcting.

**Blank and zero values.**

- On a new subscriber, a blank value is not written, and it does not cause a rejection: Test B, with six blank computed fields and blank names, was created, flagged and sent its email.
- On an update, a blank text value erases what was stored: Test C, with no company entered, changed Company from "Audit Test A" to blank. Whether blank number values do the same is open (section 1, item 1), and so is whether blank names do (item 5).
- A stored zero is logged but not shown on the profile (Test B's BAU Staff and Licence Count). Whether it prints in an email is open (section 1, item 2).

Two consequences follow. A repeat respondent who leaves company blank loses the company they gave the first time. And if blank numbers do not clear on an update, a record can hold a figure from an earlier run beside ratings from a later one.

**Record history.** The four records from 10 September match the current code on all eleven computed and selected fields. The two from 8 September differ only in Licence Count, which holds 25 where today's code gives 29 and 27, because PR7 added contractors to the licence basis on 9 September. Norm's record from 21 August and mark@cloudboost.digital's from 25 August hold 7.4, 6.1, Watch and 26, which the pre-PR1 model produced and which today's code would give as 6.2, 7.3, At risk and −17. Records created on 10 August and resubmitted later hold the later figures, so a repeat submission overwrites the fields.

**Defaults.** Eleven custom fields show a grey value: 45, 20, 25, 7.4, 9.0, 6.1, Amber, Amber, 26, "MS Project" and "out the door". Headroom's is confirmed as its Sender default, and the other ten sit in the same place, so they are almost certainly defaults too. Sender's help page says a default "will now appear in the email or SMS campaign if the [field] is included, but no information is available under a particular subscriber". The numbers are exactly what the two pre-PR1 records hold. The three words are strings the tool has never sent: a search of the full history of index.html and worker.js finds no commit containing any of them. The defaults are harmless today only because the template uses none of these fields. Once the Part A replacements go in, any blank field would print one of these values as though it belonged to the respondent. Clear all eleven before the template changes.

---

## 4. Part C: automation

**C1. The band mix.** No respondent data exists: all eight subscribers in the export are you or Norm. What the thresholds establish is this. On the PM measure, At risk moved from above 12 concurrent projects per PM to above 7.0, and Watch moved from above 8 and up to 12 to above 5.0 and up to 7.0 (pre-PR1 code in section 1; current bands in master §2.1). The segment rule at worker.js 284–287 puts a lead in red if either measure is At risk, so every department above 7.0 per PM now enters the red sequence, whatever its BAU rating. Fixture 8.A, at 9.0 per PM, was amber under the old bands and is red under the new ones. Because the nurture is not yet written, this is a design constraint rather than a fix: write the At risk sequence on the assumption that it may be the path most leads take. It should not present itself as an escalation or tell the reader they are unusual, because a sequence that asserts things about a department nobody has seen reads as a script, which is the reasoning behind PR7's §0.11.

**C2. Duplicate first touches, and what a repeat respondent gets.** Resolved from the account's configuration and Tests A to C.

- **Where the two groups come from.** The Worker adds each respondent to Capacity Check Leads (`av5xEM`; the activity log shows "Source: API"). The flag group is added with "Source: Automation". The report automation has a single send step, so the other automation, "Flag - Understated Project Costs" (active, no emails sent), is the only candidate. It adds those whose budgets answer is not the tracked sentence: Test A was not added.
- **The "two campaigns" are not campaigns.** "Subscribed to Email campaign" and "Subscribed to Transactional email campaign" are the two subscription statuses Sender records when the API adds someone.
- **No address receives the report email twice.** The report automation's trigger is "Subscriber joins a group" and Repeat workflow is off, which Sender's documentation says limits each contact to one pass. Test C, a repeat submission from Test A's address, produced no second email. The flag automation has sent no email, although its steps are unaudited. A respondent who passes the gate again under a different address becomes a new subscriber, and would normally get a new email.
- **The flip side: a repeat respondent gets no new email.** Their fields are overwritten with the new figures (Test C, and the records created on 10 August and resubmitted later), but the only report email they hold carries the first run's link. The gate's "Email me my report" is not kept for a second run.
- **A later change of budgets answer did not flag.** Test A answered "tracked" and was not flagged. Test C then answered "Out-the-door spend only" from the same address, and was still not flagged. That fits a flag set once, when a subscriber first passes through the flag automation. But the reverse case (flagged first, tracked later) was not tested, and the three records created on 10 August are flagged although `budget_tracking` did not reach Sender until 19 August. Until the automation's settings are seen (section 1, item 4), treat the flag group and the Budget Tracking field as able to disagree.
- **The page the email opens can prompt a second submission.** Your own PDF on 10 September was produced this way: you opened mark+pjr1's email, and passed the gate again on that page as mark+pjr2 at 09:42:56 UTC, one second before the PDF was saved. Because the address was new, that created a new subscriber. A respondent re-entering their own address would take the update path above.

---

## 5. Sender configuration, and what needs a code change

### STOP & REFLECT: the email, before launch

- **Issue.** Each new subscriber the automation emails receives an email whose subject ends in an empty colon, whose preheader promises "the full picture", whose body shows four blank figures and a wrong page count and claims ProjexaR already keeps the picture current, and whose second button leads to the rejected offer. The three sends on 10 September confirm the template has not changed.
- **Impact.** No prospect has received it: every subscriber is you or Norm, and the site has not launched. It is a launch blocker, not an incident.
- **Options.** (a) The full rewrite in Part A, with defaults cleared and the render tests below. (b) A minimum version, if launch comes before the render tests can be run. (c) Launch as it stands, which is not defensible.
- **Recommendation.** Option (a), with (b) as the fallback. The minimum version uses the subject "Your Capacity Check results", the preheader "A link to your Capacity Check results", the headline "Your Capacity Check results", "Hello,", one paragraph ("Your results are ready. The link below opens them, and the full report can be saved from that page as a PDF."), and the first button relabelled "Open your results". Everything else is removed, including the second button and the product sentence. It uses no custom field except the permalink behind the button.

### Sender configuration

1. Clear the eleven default values.
2. Create a text custom field named exactly `report_consent`, so that the consent value the Worker already sends has somewhere to land. This changes Sender's field set but not the payload; master §6 froze both for the release window, and the payload has carried the key since 9 August.
3. Apply replacements A1 to A11, including removing the stray non-breaking space after each tag, and remove the second button.
4. Add the name fallback in note A4 if Liquid works in this account; otherwise use "Hello,".
5. Run render tests before launch, and check each email as received. Use a new address for each test, because an address only ever receives the report email once:
   - a normal submission;
   - no name, using Test B's link;
   - no project managers, which leaves `pm_load` and `rag_pm` blank;
   - no live projects, using the zero link in section 1, item 2;
   - a band straddle, at `https://projexar.com/capacity-check/?ch=800&st=30&m=3&l=26&a=40&sp=200000&cu=GBP&bs=12&bp=41&ct=2&tk=600&sx=70&tl=msproject&rv=manual&bt=outthedoor&ak=live`, where the tool sends `rag_bau` "Watch" and the report shows "Watch to Healthy".
6. Delete all test subscribers before launch: the eight in the export, and mark+testa and mark+testb. Otherwise the automation's statistics, and any nurture built later, start from records written by three versions of the tool.
7. When the nurture is built:
   - match "Healthy", "Watch" and "At risk" exactly;
   - base cost-blind targeting on the Budget Tracking field at send time, or have the flag re-evaluated on field updates, because a later change of answer did not update the group (Part C.2);
   - never segment on `headroom`, `effective_fte` or `projects_per_fte`;
   - decide what a repeat respondent should receive.
8. Minor, and outside the eight rules: the logo's alt text is "Logo", which is what an inbox that blocks images shows, and the footer carries Sender's free-plan badge.

### Code change, for the PR queue

1. **Report copy, rule 1.** The printed report's last page says "ProjexaR works from your actual projects and your actual people, with each person's operational commitment set and owned by their line manager, so when it changes every plan that depends on it changes with it." That is the same present-tense claim as A10, in the tool's own output, so fixing the email alone does not close the exposure. The copy-rule check cannot detect tense, so this needs a review item rather than an assertion.
2. **Offer, rule 8.** The check itself says "Unlimited 14-day trial" beside "Start free" links to `/start` (index.html 1151–1152 and 1182–1183). The two-projects offer appears on the home page, `/start`, `/pricing`, `/contact`, the Project Online migration page and the start flow in `site.js`. Only `/start` is logged as a launch blocker so far.
3. **Report copy, pluralisation.** "Your 1 contractor are counted separately" appears twice (report pp. 4 and 8). Master §2.7 requires every computed integer in prose to read correctly at a value of 1.
4. **Worker, consent.** `handleCapacityReport` never checks `ack`: the only reference to it in worker.js is line 333, which records "yes" or "no", and the respondent is subscribed either way. The page enforces the tick, but the Worker's own comments treat crafted requests as in scope, and a request without consent should not reach the nurture group.
5. **Comments, with no behaviour change.** worker.js 284–287 states the segment rules in red, amber and green; 289–292 still describes the clamped `headroom`; 312–314 gives the tag rule as "'tracked'". Correct all three, and name `headroom` there as an adverse-endpoint field, which the tool's payload comment already implies (index.html 4752). The tool comment at index.html 2502 describes straddle wording in the opposite order to the code beneath it. PR #14's manifest is historical, but its cost-blind line and its pre-PR7 licence line should not be copied into any successor.
6. **Specification, per the repository's INDEX.md rule.** Master §6 (line 504) carries both the stale "zero for two reasons" wording and the wrong null history, and master §2.4's "9–12" does not match the pre-PR1 code. Correct them in the repository copy, with the §11 register updated in the same commit.

### Decisions for you before any code

- **Whether the email link should re-gate.** A respondent who clicks through from the email is asked for their email again before they get the PDF, and passing the gate writes to Sender again. Skipping the gate for arrivals from the email is a tool change.
- **What a repeat respondent should receive.** Today they get updated fields and no email. Sender documents a "Subscriber field updated" trigger that could send a fresh email when Report Requested At changes; how it interacts with Repeat workflow is not documented and would need testing.
- **Blank optional answers on an update.** The Worker sends a blank company as an empty string, and on an update that erased the company an earlier run had stored (Test C). Names are sent the same way but were not tested. The Worker could omit blank optional fields instead, so earlier answers survive. Computed fields should still clear when blank, subject to section 1, item 1.
- **Whether the email should carry ranges.** The payload holds one endpoint each of `effective_fte`, `projects_per_fte` and `headroom`. Showing the report's ranges in the email means posting both ends, which changes what those fields mean and reopens the field contract master §6 froze. That is why the Part A replacements say less than the original email did.
- **`pm_load` formatting.** It arrives as 9 where the report prints 9.0. Fixing that means posting formatted text and changing the Sender field's type.

---

### Sources consulted outside the project and repository

- Sender, [Default custom fields list](https://www.sender.net/help/email-campaigns/default-custom-fields/)
- Sender, [Personalization basics](https://www.sender.net/help/email-campaigns/personalization-basics/)
- Sender, [Use liquid tags](https://www.sender.net/help/subscribers-and-segmentation/liquid-tags/)
- Sender, [View subscriber details](https://www.sender.net/help/subscribers-and-segmentation/view-subscriber-details/)
- Sender, [Export contacts](https://www.sender.net/help/subscribers-and-segmentation/export-contacts/)
- Sender, [Triggers explained](https://www.sender.net/help/automation/triggers-explained/)
- Sender API, [Create new subscriber](https://api.sender.net/subscribers/add-subscriber/) and [Update subscriber](https://api.sender.net/subscribers/update-subscriber/)
- GitHub, [PR #14 description, Sender payload manifest](https://github.com/sinbad0709/projexar/pull/14)
