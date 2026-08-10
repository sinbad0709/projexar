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

  var STEP_COPY = {
    1: {
      label: "Step 1 of 2",
      title: "Create your workspace",
      sub: "Two projects, free forever. No card, no time limit."
    },
    2: {
      label: "Step 2 of 2",
      title: "Set up your first two projects",
      sub: "Bring in as many people as you like — nobody is counted on the free plan."
    },
    3: {
      label: "Done",
      title: "You're all set",
      sub: "Two active projects, and no card until you need a third."
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
