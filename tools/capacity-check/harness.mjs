/* Render harness for the Capacity Check.
   ---------------------------------------------------------------------------
   The tool is a single self-contained HTML file with no build step, so there is
   nothing to import. This harness loads the file, pulls out the main IIFE, runs
   it inside a `vm` context against a DOM stub, and hands back the `__ProjexaR`
   surface plus the stubbed nodes the script writes its output into.

   Two things make the stub more than a formality:

   - The <select> options are parsed out of the real markup, so `selText()`
     returns the words a respondent actually read. The printed report and the
     Sender payload both go through it, and the copy-rule check in §3.11 reads
     that output.
   - Date is frozen. `renderPrint` stamps today's date onto page 1, and a
     baseline that changes at midnight is not a baseline.

   The suite drives the real submit handler rather than calling `compute` on its
   own, so every DOM write the page performs — screen and print — is exercised
   and captured. */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
/* CAPACITY_CHECK_HTML points the harness at a different copy of the tool, so a
   baseline can be captured from an older commit without moving the working
   tree — `git show <ref>:public/capacity-check/index.html > /tmp/old.html`. */
export const TOOL_PATH = process.env.CAPACITY_CHECK_HTML
  || join(HERE, '..', '..', 'public', 'capacity-check', 'index.html');

/* The tool's own script is the last one in the file. */
function extractScript(html) {
  const open = html.lastIndexOf('<script>');
  const close = html.lastIndexOf('</script>');
  if (open < 0 || close < open) throw new Error('could not find the tool script');
  return html.slice(open + '<script>'.length, close);
}

/* <select id="x"><option value="v">Text</option>… → { x: [[v, Text], …] } */
function extractSelects(html) {
  const out = {};
  const selectRe = /<select id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g;
  let m;
  while ((m = selectRe.exec(html))) {
    const opts = [];
    const optRe = /<option(?:\s+value="([^"]*)")?[^>]*>([\s\S]*?)<\/option>/g;
    let o;
    while ((o = optRe.exec(m[2]))) {
      const text = o[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      opts.push([o[1] === undefined ? text : o[1], decodeEntities(text)]);
    }
    out[m[1]] = opts;
  }
  return out;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&pound;/g, '£').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—');
}

function makeNode(id, selectOptions) {
  const node = {
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    checked: false,
    hidden: true,
    className: '',
    style: {},
    selectedIndex: -1,
    options: [],
    _handlers: {},
    addEventListener(type, fn) { (this._handlers[type] ||= []).push(fn); },
    removeAttribute() {},
    setAttribute() {},
    focus() {},
    scrollIntoView() {},
    querySelector() { return null; },
    classList: { add() {}, remove() {}, toggle() {} },
  };
  if (selectOptions) {
    node.options = selectOptions.map(([value, text]) => ({ value, text }));
    /* selText() reads options[selectedIndex].text, so the index has to track
       whatever value the suite assigns. */
    let raw = '';
    Object.defineProperty(node, 'value', {
      get: () => raw,
      set(v) { raw = v; node.selectedIndex = node.options.findIndex((o) => o.value === v); },
    });
  }
  return node;
}

export function loadTool(path = TOOL_PATH) {
  const html = readFileSync(path, 'utf8');
  const source = extractScript(html);
  const selects = extractSelects(html);
  const nodes = new Map();

  const getNode = (id) => {
    if (!nodes.has(id)) nodes.set(id, makeNode(id, selects[id]));
    return nodes.get(id);
  };

  const FROZEN = new Date('2026-09-04T09:00:00Z').getTime();
  class FrozenDate extends Date {
    constructor(...args) { super(...(args.length ? args : [FROZEN])); }
    static now() { return FROZEN; }
  }

  const sender = [];
  const events = [];
  const sandbox = {
    console,
    Date: FrozenDate,
    setTimeout: () => 0,
    clearTimeout: () => {},
    URLSearchParams,
    document: {
      getElementById: getNode,
      querySelector: () => null,
      querySelectorAll: () => [],
    },
    location: { origin: 'https://projexar.com', pathname: '/capacity-check/', search: '' },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.window.print = () => {};
  sandbox.window.submitToSender = (payload) => { sender.push(payload); };
  sandbox.window.plausible = (name, o) => { events.push([name, o && o.props]); };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'capacity-check.js' });

  return {
    api: sandbox.window.__ProjexaR,
    node: getNode,
    nodes,
    selects,
    sender,
    events,
    /* Fire a handler the page registered on one of its own nodes. */
    fire(id, type, evt = { preventDefault() {} }) {
      const hs = getNode(id)._handlers[type] || [];
      if (!hs.length) throw new Error(`no ${type} handler on #${id}`);
      hs.forEach((fn) => fn.call(getNode(id), evt));
    },
  };
}
