/**
 * ProjexaR site Worker.
 *
 * Two jobs:
 *   POST /api/contact — spam-check the contact form and email it to the inbox.
 *   everything else   — hand the request back to the static assets in ./public.
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
