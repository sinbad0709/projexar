/* =============================================================================
   ProjexaR marketing site — behaviour

   A direct port of the state held by `class Component extends DCLogic` in the
   Claude Design export. The prototype was one React component with an in-page
   router; the site is separate documents, so the three pieces of state that
   used to survive a route change (currency, billing period, and nothing else)
   are persisted to sessionStorage instead.

   Everything here is progressive enhancement: with JavaScript off, prices
   render in GBP monthly, every tab panel is visible, and the /start form is a
   plain three-section page.
   ============================================================================= */

(function () {
  "use strict";

  /* --- Commercial constants — Part A4 of the content brief. Fixed presentment
         currencies, never FX-converted. ------------------------------------ */
  var CUR = {
    GBP: { sym: "£", m: 10, y: 100 },
    USD: { sym: "$", m: 14, y: 140 },
    AUD: { sym: "A$", m: 20, y: 200 }
  };

  /* --- The offer, stated once. PR12.

         The decision of 1 September is one sequence, not two offers: 14 days
         of unlimited access in the customer's own tenant, contracting on day
         14 to the free tier of five managed resources. Neither half is ever
         shown alone. The sandbox half by itself reads as access that expires;
         the free half by itself understates day one. Presenting one half is
         what made the old copy contradict itself from page to page, and the
         PR12 §5 guard bans the retired wording outright, comments included,
         which is why this one describes it rather than quoting it.

         Two registers of one statement, per PR7 §6.2: the billing unit stays
         on the pricing page and in the licence line, and prose elsewhere talks
         about people. `full` and `fullBilling` are the same sentence in the
         two registers; `short` is register-neutral and used verbatim in both.

         The site has no build step, so this constant is not a partial that
         pages are compiled from. Every [data-offer] element carries the same
         text inline as its no-JS and crawler fallback, and check.mjs asserts
         the inline text matches this object byte for byte. That assertion, not
         this object, is what stops the two drifting apart. ------------------ */
  var OFFER = {
    full: "Start with 14 days of unlimited access, in your own tenant with your own data. "
        + "After that, ProjexaR stays free for up to five people with capacity recorded, "
        + "with no time limit.",
    fullBilling: "Start with 14 days of unlimited access, in your own tenant with your own data. "
        + "After that, ProjexaR stays free for up to five managed resources, "
        + "with no time limit.",
    short: "Free for five. 14 days unlimited to start."
  };

  var STORE_CURRENCY = "projexar-currency";
  var STORE_ANNUAL = "projexar-annual";

  function read(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function write(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  var state = {
    currency: CUR[read(STORE_CURRENCY)] ? read(STORE_CURRENCY) : "GBP",
    annual: read(STORE_ANNUAL) === "true"
  };

  function all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  /* ===========================================================================
     Currency and billing period
     Every price line on the site is a [data-price] element. The site is served
     as static assets, so the currency is a client-side choice with a visible
     selector and GBP as the default. Edge detection from CF-IPCountry (brief
     A4) needs a Worker in front of the assets and is deliberately not done here
     — a client-side guess would flash the wrong price.
     =========================================================================== */

  function renderPrices() {
    var cur = CUR[state.currency] || CUR.GBP;
    var annual = state.annual;

    var values = {
      current: cur.sym + (annual ? cur.y : cur.m),
      monthly: cur.sym + cur.m,
      free: cur.sym + "0",
      period: annual ? "per managed resource, per year" : "per managed resource, per month",
      "billing-note": annual
        ? "Two months free · 10% buffer"
        : "Change your licence count any time",
      "annual-badge": annual ? "Two months free + headroom" : "Two months free"
    };

    all("[data-price]").forEach(function (el) {
      var key = el.getAttribute("data-price");
      if (values[key] !== undefined) el.textContent = values[key];
    });

    all("[data-currency-tabs] [data-currency]").forEach(function (btn) {
      btn.setAttribute("aria-selected", String(btn.getAttribute("data-currency") === state.currency));
    });

    all("[data-annual-switch]").forEach(function (input) {
      input.checked = annual;
    });
  }

  function initCommercials() {
    all("[data-currency-tabs] [data-currency]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.currency = btn.getAttribute("data-currency");
        write(STORE_CURRENCY, state.currency);
        renderPrices();
      });
    });

    all("[data-annual-switch]").forEach(function (input) {
      input.addEventListener("change", function () {
        state.annual = input.checked;
        write(STORE_ANNUAL, String(state.annual));
        renderPrices();
      });
    });

    if (document.querySelector("[data-price]")) renderPrices();
  }

  /* Stamp the offer over every [data-offer] element. The inline text is already
     correct, so this changes nothing on a healthy page; it exists so that a
     page edited by hand is corrected at runtime rather than left to contradict
     the others until someone notices. */
  function initOffer() {
    all("[data-offer]").forEach(function (el) {
      var key = el.getAttribute("data-offer");
      if (OFFER[key] !== undefined) el.textContent = OFFER[key];
    });
  }

  /* ===========================================================================
     Tabs — the four pillars on Home and Product
     =========================================================================== */

  function initTabs() {
    all("[data-tabs]").forEach(function (list) {
      var group = list.getAttribute("data-tabs");
      var tabs = all("[data-tab]", list);
      var panels = all('[data-panel][data-panel-group="' + group + '"]');

      function select(id) {
        tabs.forEach(function (tab) {
          tab.setAttribute("aria-selected", String(tab.getAttribute("data-tab") === id));
        });
        panels.forEach(function (panel) {
          panel.hidden = panel.getAttribute("data-panel") !== id;
        });
      }

      tabs.forEach(function (tab) {
        tab.addEventListener("click", function () { select(tab.getAttribute("data-tab")); });
        tab.addEventListener("keydown", function (e) {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          var i = tabs.indexOf(tab);
          var next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
          next.focus();
          select(next.getAttribute("data-tab"));
        });
      });

      var initial = tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0] || tabs[0];
      if (initial) select(initial.getAttribute("data-tab"));
    });
  }

  /* ===========================================================================
     /start — the three-step workspace wizard
     =========================================================================== */

  /* PR12. Step 1's sub is the /start offer line, and /start is the page a
     prospect reads straight after a promise made somewhere else, so it carries
     the full statement rather than the short form. Steps 2 and 3 no longer
     count projects: projects are unlimited, and the five that are counted are
     people with capacity recorded. */
  var STEP_COPY = {
    1: {
      label: "Step 1 of 2",
      title: "Create your workspace",
      sub: OFFER.full
    },
    2: {
      label: "Step 2 of 2",
      title: "Set up your first project",
      sub: "Run as many projects as you like. It is the people with capacity recorded that are counted, and viewers and approvers are never counted at all."
    },
    3: {
      label: "Done",
      title: "You're all set",
      sub: OFFER.short
    }
  };

  function initStart() {
    var root = document.querySelector("[data-start]");
    if (!root) return;

    var steps = all("[data-step]", root);
    var label = root.querySelector("[data-step-label]");
    var title = root.querySelector("[data-step-title]");
    var sub = root.querySelector("[data-step-sub]");
    var org = root.querySelector("#org");
    var created = root.querySelector("[data-created-message]");
    var current = 1;

    function render() {
      steps.forEach(function (step) {
        step.hidden = Number(step.getAttribute("data-step")) !== current;
      });
      var copy = STEP_COPY[current];
      if (label) label.textContent = copy.label;
      if (title) title.textContent = copy.title;
      if (sub) sub.textContent = copy.sub;
      if (current === 3 && created) {
        created.textContent = ((org && org.value.trim()) || "Your workspace") + " is ready. Next: declare BAU.";
      }
    }

    all("[data-start-next]", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        current = Math.min(3, current + 1);
        render();
      });
    });
    all("[data-start-back]", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        current = Math.max(1, current - 1);
        render();
      });
    });

    render();
  }

  /* ===========================================================================
     Mobile navigation — not in the prototype, which had no small-screen state
     =========================================================================== */

  function initNav() {
    var header = document.querySelector("[data-site-header]");
    if (!header) return;
    var toggle = header.querySelector("[data-nav-toggle]");
    if (!toggle) return;

    toggle.addEventListener("click", function () {
      var open = header.getAttribute("data-open") === "true";
      header.setAttribute("data-open", String(!open));
      toggle.setAttribute("aria-expanded", String(!open));
    });
  }

  function init() {
    initCommercials();
    initOffer();
    initTabs();
    initStart();
    initNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
