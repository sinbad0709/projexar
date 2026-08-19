/**
 * ProjexaR site Worker.
 *
 * Three jobs:
 *   POST /api/contact         — spam-check the contact form and email it to the inbox.
 *   POST /api/capacity-report — push a Capacity Check report request into Sender.
 *   everything else           — hand the request back to the static assets in ./public.
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

    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return seeOther("/contact?error=1");
  }

  const field = (name) => String(form.get(name) ?? "").trim();

  // Honeypot. It is display:none, so a human never fills it in and anything
  // in it is a bot. Answer with the redirect a success gets — a bot told it
  // failed will retry or adapt; one told it succeeded moves on.
  if (field("hp_field") !== "") return seeOther("/contact?sent=1");

  const name = field("name");
  const email = field("email");
  const company = field("company");
  const message = field("message");

  if (!name || !email || !message) return seeOther("/contact?error=1");
  if (!isEmail(email)) return seeOther("/contact?error=1");
  if (
    name.length > LIMITS.name ||
    email.length > LIMITS.email ||
    company.length > LIMITS.company ||
    message.length > LIMITS.message
  ) {
    return seeOther("/contact?error=1");
  }

  const passed = await verifyTurnstile(
    form.get("cf-turnstile-response"),
    env.TURNSTILE_SECRET,
    request.headers.get("CF-Connecting-IP"),
  );
  if (!passed) return seeOther("/contact?error=1");

  try {
    await env.SEND_EMAIL.send(
      new EmailMessage(FROM, TO, buildMime({ name, email, company, message })),
    );
  } catch (err) {
    // The enquirer only ever sees the generic error; the detail goes to logs.
    console.error("contact form send failed:", err);
    return seeOther("/contact?error=1");
  }

  return seeOther("/contact?sent=1");
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

  // The permalink is built in the browser, so a crafted request can put any URL
  // in it and the template would render our own domain's link to it. Blank
  // anything that is not ours rather than rejecting: the subscriber record and
  // the consent still matter, only the link is lost.
  if (
    typeof body.permalink !== "string" ||
    !body.permalink.startsWith(`${ORIGIN}/`)
  ) {
    console.warn("capacity report permalink rejected:", body.permalink);
    body.permalink = "";
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
  // Nurture segmentation runs on rag_pm and rag_bau only:
  //   red    — rag_pm is 'red'   OR rag_bau is 'red'
  //   amber  — neither is red    AND either is 'amber'
  //   green  — both are 'green'
  //
  // headroom is used in email copy only and must NEVER be used as a
  // segment filter. It reads 0 both when a tile is already past its red
  // threshold and when the portfolio sits exactly at the limit, and blank
  // when nothing is live. Those are materially different prospects.
  //
  // budget_tracking drives a 'cost-blind' tag applied Sender-side for any
  // value other than 'tracked'. It cuts across all three segments rather
  // than forming a fourth.
  //
  // Note the tool sends rag_pm and rag_bau as the words the report shows the
  // respondent — "At risk", "Watch", "Healthy" — not red/amber/green. The
  // segment rules above are stated in RAG terms; map them on that basis.
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
    "{{report_permalink}}": body.permalink,
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
function buildMime({ name, email, company, message }) {
  const body = [
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Company: ${company || "(not given)"}`,
    "",
    "Message:",
    message.replace(/\r\n|\r|\n/g, "\r\n"),
    "",
    "-- ",
    "Sent from the contact form at projexar.com",
  ].join("\r\n");

  return [
    `From: ProjexaR website <${FROM}>`,
    `To: <${TO}>`,
    `Reply-To: ${encodeHeaderWord(name)} <${headerSafe(email)}>`,
    `Message-ID: <${crypto.randomUUID()}@projexar.com>`,
    `Date: ${rfc5322Date()}`,
    `Subject: ${encodeHeaderWord(`Contact form enquiry from ${name}`)}`,
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
