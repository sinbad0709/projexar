/* =============================================================================
   Trust Centre — behaviour

   Two jobs, both scoped to /trust:

   1. The Our Commitments tiles flip on click. Each tile is a <button> with
      aria-expanded, so a tap, a click, Enter and Space all take the same
      route — a :hover flip would leave the tiles unopenable on a phone, which
      is why there isn't one. The face that is turned away is marked
      aria-hidden so a screen reader is read the side that is showing rather
      than both at once.

   2. The "Last verified" dates come from /trust/commitments.json, not from the
      markup. Whoever verifies a commitment edits one line of that file and
      nothing else; the tile copy stays where it is. Until the fetch resolves
      the line stays hidden, and it stays hidden if the file cannot be read —
      an empty "Last verified:" would be worse than no line at all.

   Everything here is progressive enhancement. With JavaScript off the noscript
   block in the page head unstacks the two faces, so every claim and every
   piece of evidence is still on the page; only the dates and the flip are lost.
   ============================================================================= */

(function () {
  "use strict";

  var CONFIG = "/trust/commitments.json";

  function all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  /* ---------------------------------------------------------------------------
     Flip
     --------------------------------------------------------------------------- */

  function faces(tile) {
    return {
      front: tile.querySelector(".commitment__face--front"),
      back: tile.querySelector(".commitment__face--back")
    };
  }

  function apply(tile, expanded) {
    var f = faces(tile);
    tile.setAttribute("aria-expanded", String(expanded));
    /* The turned-away face is hidden from assistive technology only — never
       with [hidden] or display:none, which would collapse the grid cell the
       flip rotates through. */
    if (f.front) f.front.setAttribute("aria-hidden", String(expanded));
    if (f.back) f.back.setAttribute("aria-hidden", String(!expanded));
  }

  function initFlip() {
    var tiles = all("[data-commitment]");
    if (!tiles.length) return;

    tiles.forEach(function (tile) {
      apply(tile, false);
      tile.addEventListener("click", function () {
        apply(tile, tile.getAttribute("aria-expanded") !== "true");
      });
    });

    /* Escape turns the focused tile back to its claim. */
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var tile = document.activeElement;
      if (!tile || !tile.hasAttribute || !tile.hasAttribute("data-commitment")) return;
      if (tile.getAttribute("aria-expanded") !== "true") return;
      apply(tile, false);
    });
  }

  /* ---------------------------------------------------------------------------
     Verification dates
     --------------------------------------------------------------------------- */

  /* "2026-08-26" -> "26 August 2026". Parsed field by field rather than handed
     to Date(), which reads a bare YYYY-MM-DD as UTC midnight and can render it
     as the day before in any timezone west of Greenwich. */
  var MONTHS = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];

  function formatDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    if (!m) return null;
    var month = MONTHS[Number(m[2]) - 1];
    if (!month) return null;
    return Number(m[3]) + " " + month + " " + m[1];
  }

  function stampDates(verified) {
    all("[data-verified]").forEach(function (el) {
      var iso = verified[el.getAttribute("data-verified")];
      var readable = formatDate(iso);
      if (!readable) return;

      var time = el.querySelector("time");
      if (time) {
        time.setAttribute("datetime", iso);
        time.textContent = readable;
      }
      el.hidden = false;
    });
  }

  function initDates() {
    if (!document.querySelector("[data-verified]")) return;
    if (typeof fetch !== "function") return;

    fetch(CONFIG, { headers: { Accept: "application/json" } })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data && data.lastVerified) stampDates(data.lastVerified);
      })
      .catch(function () { /* No dates rather than empty ones. */ });
  }

  function init() {
    initFlip();
    initDates();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
