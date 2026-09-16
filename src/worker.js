/**
 * ProjexaR site Worker.
 *
 * Five jobs:
 *   POST /api/contact             — spam-check the contact form and email it to the inbox.
 *   POST /api/capacity-report     — push a Capacity Check report request into Sender.
 *   POST /api/verify-report-link  — verify a signed, gate-skipping permalink from an email.
 *   POST /api/capacity-capture    — write a Capacity Check submission or gate-pass into Supabase.
 *   everything else               — hand the request back to the static assets in ./public.
 *
 * The assets layer answers first for any path that matches a file, so in
 * practice this Worker only sees /api/* (pinned ahead of assets by
 * run_worker_first in wrangler.jsonc) and paths with no asset behind them.
 * Those fall through to env.ASSETS.fetch, which applies not_found_handling
 * and serves public/404.html — the behaviour the site had before the Worker.
 */

import { EmailMessage } from "cloudflare:email";

/** Must match destination_address in wrangler.jsonc — the binding allows no other. */
const TO = "mark@douc.tech";

/**
 * Envelope sender. Must be on a domain in this Cloudflare account, and is
 * never a mailbox anyone reads — Reply-To carries the enquirer's address so a
 * reply from the receiving inbox goes straight back to them.
 */
const FROM = "noreply@projexar.com";

const TURNSTILE_VERIFY =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const SENDER_SUBSCRIBERS = "https://api.sender.net/v2/subscribers";

/**
 * The only origin a Capacity Check permalink may point at. Matched with a
 * trailing slash appended — "https://projexar.com" alone is also the start of
 * https://projexar.com.evil.com/ and https://projexar.com@evil.com/, neither of
 * which is us.
 */
const ORIGIN = "https://projexar.com";

/**
 * Matches the client-side check in public/capacity-check/index.html, so the
 * Worker never rejects an address the gate has already accepted.
 */
const GATE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Mirrors the maxlength attributes on the form; see public/contact.html. */
const LIMITS = { name: 200, email: 254, company: 200, message: 5000 };

/**
 * The same control for the Capacity Check gate, which had none.
 *
 * The gate's own maxlength attributes mirror the first three of these. Those
 * are the convenience: they stop a paste from overflowing a field whose end the
 * respondent cannot see. This table is the control, because an attribute is
 * advice to a browser and this endpoint is reachable without one.
 *
 * Oversize is REJECTED, never truncated. A truncated email address is a lead
 * that fails silently — the subscriber is written, the report is templated, and
 * it goes to an address that does not exist. The respondent is told nothing,
 * because the endpoint is fire-and-forget; they simply never receive it. A
 * rejection at least leaves a 400 in the logs against a real address.
 *
 *   email 254        RFC 5321's maximum path length, and the number
 *                    /api/contact already uses. One cap for an email address in
 *                    this Worker, not two.
 *   firstname 100    The gate splits one name across two fields. 100 each keeps
 *   lastname  100    the pair at /api/contact's 200 for a whole name.
 *   company   200    The same field and the same cap as /api/contact.
 *
 * The rest are not typed by anyone: the tool computes them and the browser
 * posts them, which means a crafted request can put anything in them. The
 * longest legitimate value any of them takes across the tool's whole shape
 * corpus is 41 characters, a dropdown's own words. 64 leaves room for a longer
 * option without leaving a hole.
 *
 * `permalink` is absent deliberately and handled below, on the rule that
 * already governs it. `turnstile_token` is a control input rather than a field:
 * a Cloudflare token runs to a few hundred characters, and 2048 stops an
 * unbounded body being relayed to the siteverify endpoint.
 */
const REPORT_LIMITS = {
  email: 254, firstname: 100, lastname: 100, company: 200,
  name: 200,
  it_staff: 64, bau_staff: 64, licence_count: 64, effective_fte: 64, pm_load: 64,
  projects_per_fte: 64, rag_pm: 64, rag_bau: 64, headroom: 64, toolset: 64,
  budget_tracking: 64,
  turnstile_token: 2048,
};

/** A permalink is not typed by anyone either, but it is a URL and 2048 is what a URL gets. */
const PERMALINK_MAX = 2048;

/**
 * PR17 §6. A signed permalink is what lets the link in a Capacity Check
 * email skip the gate on return, while the on-page "copy link" control never
 * can — the browser that renders that control never holds REPORT_LINK_SECRET.
 *
 * Ninety days, not thirty: raised on review. A capacity report is a document
 * people sit on and return to, and a respondent coming back in month two on
 * the shorter window is re-gated and creates the duplicate subscriber this
 * work exists to stop.
 */
const REPORT_LINK_TTL_SECONDS = 90 * 24 * 60 * 60;

/** Mirrors PERMALINK_MAX for the permalink half; the token itself never runs this long. */
const VERIFY_LIMITS = { permalink: PERMALINK_MAX, t: 512 };

/**
 * PR17 §2-§5. Captures every "Show my capacity" submission and every
 * email-gate pass, so the respondents who never convert stop being invisible
 * — see claude/capacity-check-change-spec-sep-2026.md §10 for the decisions
 * this rests on, and claude/capacity-check-capture-queries.md for what the
 * store is for. Nothing published changes: this endpoint has no reader on
 * the page or in the report, only in Supabase.
 *
 * Split out of the PR17 brief at gate 1.1, which this now clears: the table
 * exists with the columns below, SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY
 * are Worker secrets, the key is a publishable, insert-only key — row level
 * security applies — and it goes in the `apikey` header, never
 * `Authorization: Bearer`, which is for a user JWT and this key is not one.
 *
 * No Turnstile here. #gate's widget cannot be reused without relocating it —
 * its container sits inside `#report[hidden]`, so it does not render until a
 * report already exists — and relocating, duplicating or repointing it was
 * ruled out on review. CAPTURE_LIMITER is the only defence against a flood,
 * so handleCapacityCapture treats a limit() error as over-limit rather than
 * waving the request through.
 */
const SUPABASE_TABLE = "capacity_check_submissions";

/**
 * Mirrors the <select> option VALUES in public/capacity-check/index.html —
 * the internal codes, never selText()'s display text. Everything else that
 * leaves this page uses the display text a respondent actually read; this
 * store has no respondent reader, only an analyst, and a code survives a
 * copy rewrite that a label does not. A value outside these lists did not
 * come from the form and is rejected rather than stored as a code nothing
 * downstream can interpret.
 */
const CAPTURE_ENUMS = {
  toolset: ["excel", "msproject", "planner", "ppm", "mixed", "none", "other"],
  single_view: ["dedicated", "manual", "none"],
  budget_tracking: ["tracked", "partial", "varies", "outthedoor"],
  who_on_what: ["live", "stale", "none"],
  currency: ["GBP", "USD", "EUR", "AUD", "NZD", "CAD"],
};

/** The ten-point band low endpoints both share questions offer. */
const SHARE_BANDS = [1, 11, 21, 31, 41, 51, 61, 71, 81, 91];

/**
 * Every numeric input the form can send, and a generous ceiling that catches
 * Infinity, a string coerced to a number, and a crafted magnitude — not a
 * restatement of the form's own min/max, which stays the client's job. This
 * is the Worker-side control PR9's REPORT_LIMITS comment describes: an
 * attribute is advice to a browser, and this endpoint is reachable without
 * one.
 */
const CAPTURE_NUMERIC_MAX = {
  company_headcount: 1e9, it_staff: 1e9, pm_count: 1e9, live_projects: 1e9,
  annual_projects: 1e9, project_spend: 1e9, bau_staff: 1e9, contractors: 1e9,
  tickets_per_month: 1e9, run_share: 1e9, median_salary: 1e9,
};

const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validCaptureNumber(v, max) {
  return v === null || (typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= max);
}

function validEnum(v, name) {
  return typeof v === "string" && CAPTURE_ENUMS[name].includes(v);
}

/**
 * Builds the row to insert, or names the first field that failed — the same
 * "name of the first failure, or nothing" shape as oversizeField, and for the
 * same reason: reject, never truncate or coerce. Reads named properties off
 * `body` one at a time rather than spreading it into the row, so an extra key
 * on a crafted request can never smuggle a column onto a row §5 says carries
 * none.
 */
function captureRowFromBody(body, cf) {
  if (typeof body.session_id !== "string" || !SESSION_ID_RE.test(body.session_id)) {
    return { error: "session_id" };
  }
  if (typeof body.tool_version !== "number" || !Number.isFinite(body.tool_version)) {
    return { error: "tool_version" };
  }
  // No created_at here. The column defaults to now(), and two mechanisms
  // producing one value means only one is in effect and it is not obvious
  // which — the database owns it, and nothing this Worker sends can
  // override it.
  const base = {
    session_id: body.session_id,
    tool_version: body.tool_version,
  };

  // §5. No personal data, and no input either: the session identifier, the
  // event and the version are the whole of it.
  if (body.event === "gate_passed") {
    return { row: { ...base, event: "gate_passed" } };
  }
  if (body.event !== "submit") return { error: "event" };

  for (const [name, max] of Object.entries(CAPTURE_NUMERIC_MAX)) {
    if (!validCaptureNumber(body[name], max)) return { error: name };
  }
  for (const name of Object.keys(CAPTURE_ENUMS)) {
    if (name === "currency") continue;
    if (!validEnum(body[name], name)) return { error: name };
  }
  if (!validEnum(body.currency, "currency")) return { error: "currency" };
  if (body.pm_share_band !== null && !SHARE_BANDS.includes(body.pm_share_band)) {
    return { error: "pm_share_band" };
  }
  if (!SHARE_BANDS.includes(body.bau_share_band)) return { error: "bau_share_band" };

  return {
    row: {
      ...base,
      event: "submit",
      // Cloudflare request properties, never client-supplied — the browser
      // never holds an IP address to post, per §4's "never store" list.
      country: (cf && cf.country) || null,
      city: (cf && cf.city) || null,
      company_headcount: body.company_headcount,
      it_staff: body.it_staff,
      pm_count: body.pm_count,
      pm_share_band: body.pm_share_band,
      live_projects: body.live_projects,
      annual_projects: body.annual_projects,
      currency: body.currency,
      project_spend: body.project_spend,
      bau_staff: body.bau_staff,
      bau_share_band: body.bau_share_band,
      contractors: body.contractors,
      tickets_per_month: body.tickets_per_month,
      run_share: body.run_share,
      toolset: body.toolset,
      single_view: body.single_view,
      budget_tracking: body.budget_tracking,
      who_on_what: body.who_on_what,
      // The eighteenth input, added after gate 1.2: the editable ONS salary
      // override. Without it a stored row cannot reproduce its own cost
      // figures. Nullable like the other optional numerics — the client
      // sends null when the field still holds the sourced default rather
      // than a value the respondent chose (see index.html's captureRow).
      median_salary: body.median_salary,
    },
  };
}

/**
 * Every capped field, measured as the string it will be sent as.
 *
 * Returns the name of the first field that fails, or null. An object or array
 * value fails too: `String({})` is "[object Object]", which is inside every cap
 * above and is not a value any of these fields can legitimately hold, so a
 * length check on its own would wave it through into the subscriber record.
 */
function oversizeField(body) {
  for (const [name, max] of Object.entries(REPORT_LIMITS)) {
    const value = body[name];
    if (value === undefined || value === null) continue;
    if (typeof value === "object") return name;
    if (String(value).length > max) return name;
  }
  return null;
}

/**
 * The contact form is on more than one page, and each one wants the visitor
 * back where they started rather than on /contact. A form declares which page
 * it is with a hidden `source` field; this maps that to a path and a subject
 * line.
 *
 * A fixed table, and never the submitted value itself: `source` arrives from
 * the browser, so echoing it into the Location header would turn this endpoint
 * into an open redirect. Anything not in the table falls back to /contact.
 */
const SOURCES = {
  trust: { path: "/trust/", label: "Trust Centre" },
};
const DEFAULT_SOURCE = { path: "/contact", label: "contact form" };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", {
          status: 405,
          headers: { Allow: "POST" },
        });
      }
      return handleContact(request, env);
    }

    if (url.pathname === "/api/capacity-report") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", {
          status: 405,
          headers: { Allow: "POST" },
        });
      }
      return handleCapacityReport(request, env);
    }

    if (url.pathname === "/api/verify-report-link") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", {
          status: 405,
          headers: { Allow: "POST" },
        });
      }
      return handleVerifyReportLink(request, env);
    }

    if (url.pathname === "/api/capacity-capture") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", {
          status: 405,
          headers: { Allow: "POST" },
        });
      }
      return handleCapacityCapture(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return seeOther(`${DEFAULT_SOURCE.path}?error=1`);
  }

  const field = (name) => String(form.get(name) ?? "").trim();

  // Which page posted, and therefore where the result is shown. Resolved once,
  // before any of the checks below, so every exit lands the visitor back on the
  // form they filled in. Object.hasOwn, not a plain lookup: `source` is
  // attacker-controlled, and "__proto__" or "constructor" would otherwise
  // resolve to something off Object.prototype instead of falling back.
  const declared = field("source");
  const source = Object.hasOwn(SOURCES, declared) ? SOURCES[declared] : DEFAULT_SOURCE;

  // Honeypot. It is display:none, so a human never fills it in and anything
  // in it is a bot. Answer with the redirect a success gets — a bot told it
  // failed will retry or adapt; one told it succeeded moves on.
  if (field("hp_field") !== "") return seeOther(`${source.path}?sent=1`);

  const name = field("name");
  const email = field("email");
  const company = field("company");
  const message = field("message");

  if (!name || !email || !message) return seeOther(`${source.path}?error=1`);
  if (!isEmail(email)) return seeOther(`${source.path}?error=1`);
  if (
    name.length > LIMITS.name ||
    email.length > LIMITS.email ||
    company.length > LIMITS.company ||
    message.length > LIMITS.message
  ) {
    return seeOther(`${source.path}?error=1`);
  }

  const passed = await verifyTurnstile(
    form.get("cf-turnstile-response"),
    env.TURNSTILE_SECRET,
    request.headers.get("CF-Connecting-IP"),
  );
  if (!passed) return seeOther(`${source.path}?error=1`);

  try {
    await env.SEND_EMAIL.send(
      new EmailMessage(
        FROM,
        TO,
        buildMime({ name, email, company, message, source: source.label }),
      ),
    );
  } catch (err) {
    // The enquirer only ever sees the generic error; the detail goes to logs.
    console.error("contact form send failed:", err);
    return seeOther(`${source.path}?error=1`);
  }

  return seeOther(`${source.path}?sent=1`);
}

/**
 * Takes the JSON the Capacity Check gate posts and puts it in Sender, where the
 * report email is templated from the custom fields. The browser fires this and
 * forgets it — the report opens regardless — so the response body is only ever
 * read by anything watching the network tab.
 */
async function handleCapacityReport(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || !GATE_EMAIL.test(body.email || "")) {
    return json({ ok: false }, 400);
  }

  // Length caps, before the token is spent verifying and before anything
  // reaches Sender. Rejected rather than truncated: see REPORT_LIMITS.
  const oversize = oversizeField(body);
  if (oversize) {
    console.warn("capacity report field rejected as oversize:", oversize);
    return json({ ok: false }, 400);
  }

  // Consent, before the token is spent verifying and before anything reaches
  // Sender. The page enforces the tick and will not submit without it, but the
  // checks above this one exist because a crafted request does not go through
  // the page, and consent is the one input where that distinction is not a
  // matter of data quality. A request without it must not create a subscriber.
  //
  // Strict `true`, not truthy. The page sends a checkbox's `.checked`, so the
  // only honest value is a boolean, and a string "false" is truthy.
  //
  // This is the gate. The `report_consent` field below RECORDS the value and
  // has never gated anything: it wrote "no" and subscribed regardless.
  if (body.ack !== true) {
    console.warn("capacity report rejected without consent:", body.email);
    return json({ ok: false }, 400);
  }

  // Turnstile, before anything reaches Sender. This endpoint writes to the
  // subscriber list, so an unprotected POST pollutes it and burns free-tier
  // allowance. Same check, same secret binding and same helper as
  // /api/contact — there is one verification path in this Worker, not two.
  //
  // verifyTurnstile returns false on an absent token, which is what arrives
  // when the widget's script is blocked in the visitor's browser. That is the
  // intended outcome: Sender is not written, and the page still gives them
  // their report and their permalink. The gate never waits on this response.
  const verified = await verifyTurnstile(
    body.turnstile_token,
    env.TURNSTILE_SECRET,
    request.headers.get("CF-Connecting-IP"),
  );
  if (!verified) {
    console.warn("capacity report turnstile failed for:", body.email);
    return json({ ok: false }, 403);
  }

  // The permalink is built in the browser, so a crafted request can put any URL
  // in it and the template would render our own domain's link to it. Blank
  // anything that is not ours rather than rejecting: the subscriber record and
  // the consent still matter, only the link is lost.
  //
  // Length joins that rule rather than the one above it. An oversize permalink
  // is the same class of defect as a foreign one — a value nobody typed, from a
  // request nobody made through the page — and it takes the same remedy, for
  // the same reason. The tool's own links run to about 180 characters.
  if (
    typeof body.permalink !== "string" ||
    body.permalink.length > PERMALINK_MAX ||
    !body.permalink.startsWith(`${ORIGIN}/`)
  ) {
    console.warn("capacity report permalink rejected");
    body.permalink = "";
  }

  // PR17 §6. Only the copy going into the email is signed. The on-page share
  // control reads permalink() straight off the browser, which never holds
  // REPORT_LINK_SECRET and so can never produce a token — that asymmetry is
  // the whole mechanism, not an extra check layered on top of it. A missing
  // secret fails open on convenience, not on security: the link still works,
  // it simply re-gates like every link did before this existed.
  let emailPermalink = body.permalink;
  if (emailPermalink && env.REPORT_LINK_SECRET) {
    emailPermalink += `&t=${await signPermalink(emailPermalink, env.REPORT_LINK_SECRET)}`;
  }

  // Sender's template placeholders, filled from the figures the tool computed.
  //
  // These track the Capacity Check's v5 BAU capacity model. The v4 set
  // (project_people, commitments, load_per_person, bau_band, bau_people_low,
  // bau_people_high, exposure, rag) no longer exists and any Sender template
  // still referencing it needs updating alongside this.
  //
  // HOW THESE ARE CONSUMED DOWNSTREAM
  //
  // Nurture segmentation runs on rag_pm and rag_bau only. The values below are
  // the exact strings this Worker posts, because those are what a Sender
  // condition has to match. They are the words the report shows the
  // respondent, not RAG codes:
  //   at risk — rag_pm is 'At risk'   OR rag_bau is 'At risk'
  //   watch   — neither is 'At risk'  AND either is 'Watch'
  //   healthy — both are 'Healthy'
  //
  // This block used to state the same three rules in red, amber and green. No
  // such value has ever been posted, so a condition written from it matches
  // nobody and the segment silently stays empty.
  //
  // headroom is an ADVERSE-ENDPOINT field: it is the low end of the blended
  // band, which is the less favourable one, and not a midpoint or a range. It
  // is used in email copy only and must NEVER be used as a segment filter.
  //
  // It is signed and unclamped, and has been since PR1. Zero means one thing —
  // the portfolio sits exactly at the limit — and a tile already past its
  // threshold reads NEGATIVE rather than flooring at zero. Blank is the value
  // carrying two meanings: nothing live, or no BAU capacity to divide by.
  // Those are materially different prospects.
  //
  // The tool calls this figure the "portfolio growth ceiling" on screen and in
  // the printed report from v5.1. The field keeps the name `headroom` because
  // it already exists in Sender and renaming it would break the account. Same
  // number, same arithmetic — only the label the visitor reads has changed.
  //
  // rag_pm is the band value from the capacity model and nothing else.
  //
  // This paragraph used to describe a PM-tile escalation driven by the toolset
  // answer, and to say the escalated value was withheld from this field. PR1
  // removed the escalation. There is no escalated value left to withhold, and
  // no toolset input reaches rag_pm, rag_bau or any other rating anywhere in
  // the tool. The claim is not restated here in its own words on purpose: a
  // reader grepping for it should find it nowhere in this file.
  //
  // What has not changed is what a segment can express. Sender still receives
  // `toolset` alongside both ratings, so a segment wanting the compound
  // condition writes it as rag_pm + toolset and still needs no new field.
  //
  // budget_tracking drives a 'cost-blind' tag applied Sender-side for any
  // answer other than the budgeted-and-tracked one. It cuts across all three
  // segments rather than forming a fourth.
  //
  // The rule used to be written here as the bare word 'tracked'. That is the
  // option's value attribute in the form's markup and it is never posted: the
  // tool sends the option's full display text, the same sentence the
  // respondent read, so the condition is on "Internal BAU time is budgeted and
  // tracked" and the other three are the tag's population. The behaviour was
  // always right; only this description of it was wrong.
  //
  // Note the tool sends rag_pm and rag_bau as the words the report shows the
  // respondent — "At risk", "Watch", "Healthy" — not red/amber/green. This
  // paragraph used to end by saying the segment rules above were stated in RAG
  // terms and had to be mapped onto those words. They are stated in the posted
  // words now, so there is nothing left to map, and a caveat sitting thirty
  // lines below the rules it corrects was never the right place for it.
  const fields = {
    "{{company}}": body.company || "",
    "{{it_staff}}": body.it_staff,
    "{{bau_staff}}": body.bau_staff,
    "{{licence_count}}": body.licence_count,
    "{{effective_fte}}": body.effective_fte,
    "{{pm_load}}": body.pm_load,
    "{{projects_per_fte}}": body.projects_per_fte,
    "{{rag_pm}}": body.rag_pm,
    "{{rag_bau}}": body.rag_bau,
    "{{headroom}}": body.headroom,
    "{{toolset}}": body.toolset,
    "{{budget_tracking}}": body.budget_tracking,
    "{{report_permalink}}": emailPermalink,
    // Records consent; it does not gate it. The gate is the `body.ack !== true`
    // rejection above, so this can only read "yes" today. The ternary stays as
    // the second line of defence if that check is ever moved or loosened, not
    // because "no" is reachable from here.
    //
    // The Sender custom field with this code was created on 10 September, so
    // the value now lands. It did not before: the payload had carried the key
    // since 9 August with nothing in the account to receive it, and Sender
    // discarded it on arrival. Nothing was deployed to close that — the field
    // began recording the moment it existed, which is the property worth
    // knowing if the field is ever renamed or removed.
    "{{report_consent}}": body.ack ? "yes" : "no",
    // Stamped here rather than taken from body.submitted_at. The browser's
    // value came off the visitor's own clock, which can be arbitrarily wrong
    // and is trivially forged in a crafted request. Sender's date fields take
    // "YYYY-MM-DD hh:mm:ss" or "YYYY-MM-DD", so toISOString() is not usable
    // directly — its "T" separator, milliseconds and trailing "Z" are outside
    // that format. This is the same instant in UTC, written the way Sender
    // documents. Sender does not auto-populate custom fields, so if we do not
    // send this the field stays empty.
    "{{report_requested_at}}": new Date()
      .toISOString()
      .replace("T", " ")
      .slice(0, 19),
  };

  // The gate splits the one name field it collects, so both halves land in the
  // matching Sender params rather than the whole name going into firstname.
  const senderBody = {
    email: body.email,
    firstname: body.firstname || "",
    lastname: body.lastname || "",
    groups: [env.SENDER_GROUP_ID],
    fields,
  };

  const headers = {
    Authorization: `Bearer ${env.SENDER_API_TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  let res;
  try {
    res = await fetch(SENDER_SUBSCRIBERS, {
      method: "POST",
      headers,
      body: JSON.stringify(senderBody),
    });

    // A create that fails is nearly always someone already on the list —
    // running the check a second time, or already subscribed. Update instead,
    // so the newest report's figures are the ones the email templates from.
    if (!res.ok) {
      res = await fetch(
        `${SENDER_SUBSCRIBERS}/${encodeURIComponent(body.email)}`,
        { method: "PATCH", headers, body: JSON.stringify(senderBody) },
      );
    }
  } catch (err) {
    console.error("capacity report subscribe failed:", err);
    return json({ ok: false }, 502);
  }

  if (!res.ok) {
    console.error("capacity report subscribe rejected:", res.status);
  }
  return json({ ok: res.ok }, res.ok ? 200 : 502);
}

/**
 * PR17 §6. Verifies the signature handleCapacityReport adds to an emailed
 * report link, so the page can tell a genuine returning respondent from an
 * edited or copied one without a store — this half does not depend on the
 * Supabase table §2-§5 need, and does not exist yet.
 *
 * POST, not GET: raised on review. A GET would put every input value the
 * permalink carries into Cloudflare's own request logs for no reason — the
 * permalink already carries them by design, so this is not a new exposure,
 * but there is nothing to gain from adding it to access logs when a body
 * does the job.
 *
 * No Turnstile and no rate limit here, unlike the write endpoint above: this
 * call writes nothing and calls no paid API, and the one thing it can answer
 * is yes or no to a signature nobody can produce without REPORT_LINK_SECRET —
 * holding that to the same gate as an endpoint that creates a subscriber
 * would buy nothing. It fails closed regardless: no secret, no match, no.
 */
async function handleVerifyReportLink(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.permalink !== "string" || typeof body.t !== "string") {
    return json({ ok: false }, 400);
  }
  if (
    body.permalink.length > VERIFY_LIMITS.permalink ||
    body.t.length > VERIFY_LIMITS.t ||
    !body.permalink.startsWith(`${ORIGIN}/`)
  ) {
    return json({ ok: false }, 400);
  }
  if (!env.REPORT_LINK_SECRET) return json({ ok: false }, 500);

  const valid = await verifyPermalinkToken(body.permalink, body.t, env.REPORT_LINK_SECRET);
  return json({ ok: valid }, 200);
}

/**
 * Fire-and-forget from the browser: by the time this call is made the report
 * is already rendered and on screen (§1.2), so nothing here may affect what
 * the visitor sees, and nothing here is awaited on the page.
 */
async function handleCapacityCapture(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ ok: false }, 400);

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  let allowed;
  try {
    ({ success: allowed } = await env.CAPTURE_LIMITER.limit({ key: ip }));
  } catch (err) {
    // Fail closed. A row that never gets captured costs nothing; an endpoint
    // with no back-stop the one time the binding itself errors is the actual
    // risk, and that is the choice being made here, not an oversight.
    console.error("capacity capture rate limiter error:", err);
    allowed = false;
  }
  if (!allowed) {
    console.warn("capacity capture rejected: rate limit", ip);
    return json({ ok: false }, 429);
  }

  const built = captureRowFromBody(body, request.cf);
  if (built.error) {
    console.warn("capacity capture field rejected:", built.error);
    return json({ ok: false }, 400);
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    console.error("capacity capture: Supabase not configured");
    return json({ ok: false }, 500);
  }

  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
      method: "POST",
      headers: {
        // §1.1. Publishable, insert-only, row-level-security key — goes in
        // apikey, never Authorization: Bearer, which is for a user JWT.
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(built.row),
    });
    if (!res.ok) {
      console.error("capacity capture insert rejected:", res.status);
      return json({ ok: false }, 502);
    }
  } catch (err) {
    console.error("capacity capture insert failed:", err);
    return json({ ok: false }, 502);
  }

  return json({ ok: true }, 201);
}

/**
 * Signs `${permalink}.${exp}` and returns `${exp}.${signature}` — the expiry
 * travels inside the token, so verification needs no store and no clock but
 * its own. Editing the permalink after the link is issued (PR10's returning
 * reader lands on a collapsed but editable form) produces a different string
 * and therefore a token that no longer matches, which is deliberate: a
 * materially different set of answers must not inherit a gate-skip signed for
 * another report. §6's "survive an edit" requirement is met on the page, not
 * here — see public/capacity-check/index.html's reportLinkVerified — by
 * verifying once against the link the reader arrived on and holding that
 * result rather than re-deriving it on every render.
 */
async function signPermalink(permalink, secret) {
  const exp = Math.floor(Date.now() / 1000) + REPORT_LINK_TTL_SECONDS;
  const signature = await hmacSign(`${permalink}.${exp}`, secret);
  return `${exp}.${signature}`;
}

/** The other half of signPermalink. Constant-time by construction: crypto.subtle.verify does the comparison, never a `===` on decoded bytes. */
async function verifyPermalinkToken(permalink, token, secret) {
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const exp = Number(token.slice(0, dot));
  if (!Number.isInteger(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  let signatureBytes;
  try {
    signatureBytes = base64urlDecode(token.slice(dot + 1));
  } catch {
    return false;
  }
  const key = await hmacKey(secret);
  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(`${permalink}.${exp}`),
  );
}

async function hmacSign(data, secret) {
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return base64url(new Uint8Array(signature));
}

function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str) {
  let padded = str.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4) padded += "=";
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function verifyTurnstile(token, secret, ip) {
  if (!token || !secret) return false;

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", String(token));
  if (ip) body.append("remoteip", ip);

  try {
    const res = await fetch(TURNSTILE_VERIFY, { method: "POST", body });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("turnstile verification failed:", err);
    return false;
  }
}

/** Builds the RFC 5322 message. Cloudflare rejects anything without a Message-ID. */
function buildMime({ name, email, company, message, source }) {
  const from = source || DEFAULT_SOURCE.label;
  const body = [
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Company: ${company || "(not given)"}`,
    `Form:    ${from}`,
    "",
    "Message:",
    message.replace(/\r\n|\r|\n/g, "\r\n"),
    "",
    "-- ",
    `Sent from the ${from} at projexar.com`,
  ].join("\r\n");

  return [
    `From: ProjexaR website <${FROM}>`,
    `To: <${TO}>`,
    `Reply-To: ${encodeHeaderWord(name)} <${headerSafe(email)}>`,
    `Message-ID: <${crypto.randomUUID()}@projexar.com>`,
    `Date: ${rfc5322Date()}`,
    `Subject: ${encodeHeaderWord(
      from === DEFAULT_SOURCE.label
        ? `Contact form enquiry from ${name}`
        : `${from} enquiry from ${name}`,
    )}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(base64(body)),
  ].join("\r\n");
}

/**
 * A bare CR or LF in a header value would let a sender inject headers of their
 * own, so every interpolated value is flattened to one line first.
 */
function headerSafe(value) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/** RFC 2047 — a header carrying non-ASCII has to be encoded, or it is malformed. */
function encodeHeaderWord(value) {
  const safe = headerSafe(value);
  if (/^[\x20-\x7E]*$/.test(safe)) return safe;
  return `=?UTF-8?B?${base64(safe)}?=`;
}

function base64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** RFC 5322 caps a line at 998 characters; base64 conventionally wraps at 76. */
function wrap76(str) {
  return (str.match(/.{1,76}/g) ?? []).join("\r\n");
}

function rfc5322Date() {
  // toUTCString gives "Fri, 07 Aug 2026 09:12:44 GMT"; RFC 5322 wants a
  // numeric zone in the current syntax.
  return new Date().toUTCString().replace(/GMT$/, "+0000");
}

function isEmail(value) {
  return /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(value);
}

function json(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * 303 rather than 302 so the browser follows up with a GET — a refresh on the
 * result page must not re-post the form.
 */
function seeOther(location) {
  return new Response(null, {
    status: 303,
    headers: { Location: location, "Cache-Control": "no-store" },
  });
}
