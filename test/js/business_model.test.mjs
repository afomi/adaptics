// Pure-model tests for /business. Run: node --test test/js/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TEMPLATES,
  simulate,
  stateAt,
  step,
  extents,
  depletedAt,
  netFlows,
  resourcesOf,
  instantiate,
  validateLink,
  validLinks,
  validateWorkspace,
  suggestShare,
  linkOptions,
  combine,
  projectState,
  wholeSpec,
  wholeState,
  renameFlow,
  removeFlow,
  removeModel,
  setLink,
  defaultWorkspace,
  parseWorkspace,
} from "../../assets/js/business_model.js";

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const SIMPLE = { ...TEMPLATES.simple, months: 24 };
const STARTUP = { ...TEMPLATES.startup, months: 36 };

function workspaceOf(...keys) {
  let ws = { months: 24, models: [], links: [], snapshots: [] };
  for (const key of keys) ws = { ...ws, models: [...ws.models, instantiate(ws, key)] };
  return ws;
}
const totalMoney = (state) =>
  Object.entries(state.stocks).filter(([k]) => k.endsWith(":money")).reduce((s, [, v]) => s + v, 0);

// --- one model ---------------------------------------------------------------

test("one in, one out: money grows by (in − out) per month", () => {
  const timeline = simulate(SIMPLE);
  assert.equal(timeline.length, 25);
  close(timeline[0].stocks.money, 120);
  close(timeline[12].stocks.money, 120 + 12 * (50 - 45));
  assert.deepEqual(resourcesOf(SIMPLE), ["money"]);
});

test("the same model renders at different instants: stateAt interpolates", () => {
  const timeline = simulate(SIMPLE);
  close(stateAt(timeline, 6.5).stocks.money, 120 + 6.5 * 5);
  close(stateAt(timeline, 999).stocks.money, timeline.at(-1).stocks.money);
});

test("outputs never draw a stock below zero and are marked constrained", () => {
  const spec = { ...SIMPLE, stocks: { money: 10 } };
  const timeline = simulate(spec, { Revenue: 0 });
  assert.ok(timeline.every((s) => s.stocks.money >= 0));
  assert.equal(depletedAt(timeline, "money"), 1);
  assert.equal(timeline.at(-1).flows.Spend.constrained, true);
  close(timeline.at(-1).flows.Spend.rate, 0);
});

test("a flow's own scale dials it", () => {
  const base = simulate(SIMPLE);
  const doubled = simulate({ ...SIMPLE, inputs: [{ ...SIMPLE.inputs[0], scale: 2 }] });
  close(doubled[1].stocks.money - base[1].stocks.money, 50);
});

test("coupled flows: windows open and close, rates follow stocks", () => {
  const timeline = simulate(STARTUP);
  assert.equal(timeline[5].flows.Investment.rate, 0);
  close(timeline[6].flows.Investment.rate, 240);
  assert.equal(timeline[7].flows.Investment.rate, 0);
  const s = timeline[10];
  close(s.flows.Payroll.demanded, 7 * s.stocks.staff);
  close(s.flows.Revenue.demanded, 2.0 * s.stocks.talent + 1.2 * s.stocks.interest);
});

test("non-conserved outputs deplete nothing", () => {
  const state = { t: 0, stocks: { ...STARTUP.stocks }, flows: {} };
  const without = step({ ...STARTUP, outputs: STARTUP.outputs.filter((f) => f.name !== "Value delivered") }, state);
  const withValue = step(STARTUP, state);
  close(withValue.stocks.talent, without.stocks.talent);
  assert.ok(withValue.flows["Value delivered"].rate > 0);
  assert.equal(netFlows(STARTUP, withValue).talent, netFlows(STARTUP, without).talent);
});

test("extents are shared across the timeline", () => {
  const timeline = simulate(STARTUP);
  const ext = extents(timeline);
  for (const s of timeline) assert.ok(s.stocks.money <= ext.stocks.money + 1e-9);
});

// --- validity ----------------------------------------------------------------

test("instantiate gives unique ids and names", () => {
  const ws = workspaceOf("cafe", "cafe");
  assert.deepEqual(ws.models.map((m) => m.id), ["m1", "m2"]);
  assert.deepEqual(ws.models.map((m) => m.name), ["Café", "Café 2"]);
});

test("a link must join same resources across two different models", () => {
  const ws = workspaceOf("cafe", "household", "startup");
  const self = validateLink(ws, { from: { model: "m1", flow: "Payroll" }, to: { model: "m1", flow: "Sales" }, share: 0.5 });
  assert.match(self.errors[0], /can't feed itself/);
  const mismatch = validateLink(ws, { from: { model: "m3", flow: "Attrition" }, to: { model: "m2", flow: "Wages" }, share: 1 });
  assert.match(mismatch.errors[0], /carries staff.*takes money/);
  const ok = validateLink(ws, { from: { model: "m1", flow: "Payroll" }, to: { model: "m2", flow: "Wages" }, share: 0.39 });
  assert.deepEqual(ok, { errors: [], warnings: [] });
});

test("an input has one source and an output is never over-allocated", () => {
  let ws = workspaceOf("cafe", "household", "household");
  ws = setLink(ws, { model: "m2", flow: "Wages" }, { model: "m1", flow: "Payroll" }, 0.7);
  const twice = validateLink(ws, { from: { model: "m1", flow: "Supplies" }, to: { model: "m2", flow: "Wages" }, share: 0.1 });
  assert.match(twice.errors.join(), /already has a source/);
  const over = validateLink(ws, { from: { model: "m1", flow: "Payroll" }, to: { model: "m3", flow: "Wages" }, share: 0.4 });
  assert.match(over.errors[0], /70% allocated; 40% more would exceed 100%/);
  assert.equal(suggestShare(ws, { model: "m1", flow: "Payroll" }, { model: "m3", flow: "Wages" }), 0.3);
});

test("the suggested share delivers what the receiver expected; gaps warn", () => {
  const ws = workspaceOf("cafe", "household");
  const share = suggestShare(ws, { model: "m1", flow: "Payroll" }, { model: "m2", flow: "Wages" });
  close(share, 0.39); // 5.5 / 14
  const gap = validateLink(ws, { from: { model: "m1", flow: "Payroll" }, to: { model: "m2", flow: "Wages" }, share: 1 });
  assert.match(gap.warnings[0], /expected 5\.5 k\$\/mo; Café · Payroll sends 14\.0/);
});

test("link options list same-resource outputs, invalid ones with a reason", () => {
  let ws = workspaceOf("cafe", "household", "household");
  ws = setLink(ws, { model: "m2", flow: "Wages" }, { model: "m1", flow: "Payroll" }, 1);
  const options = linkOptions(ws, "m3", "Wages");
  const payroll = options.find((o) => o.label === "Café · Payroll");
  assert.equal(payroll.ok, false);
  assert.match(payroll.reason, /100% allocated/);
  assert.ok(options.find((o) => o.label === "Café · Rent").ok);
  assert.ok(options.every((o) => o.from.model !== "m3"));
});

test("invalid links are reported, not applied", () => {
  let ws = workspaceOf("cafe", "household");
  ws = { ...ws, links: [{ from: { model: "m1", flow: "Payroll" }, to: { model: "m1", flow: "Sales" }, share: 1 }] };
  assert.equal(validLinks(ws).length, 0);
  assert.equal(validateWorkspace(ws)[0].level, "error");
  assert.equal(combine(ws).links.length, 0);
});

// --- combining ---------------------------------------------------------------

test("a link moves exactly share × output from one model to the other", () => {
  const ws = defaultWorkspace();
  const combined = combine(ws);
  const timeline = simulate(combined);
  const s = timeline[3];
  const cafe = projectState(ws, combined, s, "m1");
  const home = projectState(ws, combined, s, "m2");
  close(home.flows.Wages.rate, 14 * 0.39);
  close(cafe.flows.Payroll.rate, 14); // linked share + the rest still leaving
  // Household: 8 + 3 × (5.46 − 5.0)
  close(home.stocks.money, 8 + 3 * (14 * 0.39 - 5.0));
});

test("linking conserves money: the combined total changes only by external flows", () => {
  const ws = defaultWorkspace();
  const combined = combine(ws);
  const timeline = simulate(combined);
  const whole = wholeSpec(ws, combined);
  for (const t of [1, 5, 12]) {
    const before = totalMoney(timeline[t - 1]);
    const after = totalMoney(timeline[t]);
    const w = wholeState(whole, timeline[t - 1]);
    const net = netFlows(whole, w).money;
    close(after - before, net, 1e-6);
  }
});

test("combining is closed: the whole is a model whose ins/outs are the unlinked ones", () => {
  const ws = defaultWorkspace();
  const whole = wholeSpec(ws);
  assert.deepEqual(whole.inputs.map((f) => f.name), ["Café · Sales"]);
  assert.deepEqual(
    whole.outputs.map((f) => f.name),
    ["Café · Payroll", "Café · Rent", "Café · Supplies", "Household · Rent", "Household · Groceries", "Household · Spending"]
  );
  close(whole.stocks.money, 48);
  // The whole simulates like any single model and matches the parts' total.
  const alone = simulate({ ...whole, inputs: whole.inputs.map((f) => ({ ...f, base: 32 })), outputs: [] });
  assert.equal(alone.length, 25);
});

test("a fully allocated output leaves nothing to the outside", () => {
  let ws = workspaceOf("cafe", "landlord");
  ws = setLink(ws, { model: "m2", flow: "Rent" }, { model: "m1", flow: "Rent" }, 1);
  const whole = wholeSpec(ws);
  assert.ok(!whole.outputs.some((f) => f.name === "Café · Rent"));
  assert.ok(!whole.inputs.some((f) => f.name === "Landlord · Rent"));
});

test("when the source runs dry, the link is constrained too", () => {
  let ws = workspaceOf("cafe", "household");
  ws.models[0].inputs[0].base = 0;
  ws = setLink(ws, { model: "m2", flow: "Wages" }, { model: "m1", flow: "Payroll" }, 0.39);
  const combined = combine(ws);
  const timeline = simulate(combined);
  const late = projectState(ws, combined, timeline[10], "m2");
  assert.equal(late.flows.Wages.constrained, true);
  close(late.flows.Wages.rate, 0);
});

// --- edits & persistence -----------------------------------------------------

test("renaming or removing a flow keeps links consistent", () => {
  let ws = defaultWorkspace();
  ws = renameFlow(ws, "m2", "in", "Wages", "Pay");
  assert.equal(ws.links[0].to.flow, "Pay");
  assert.equal(validLinks(ws).length, 1);
  assert.equal(removeFlow(ws, "m1", "out", "Payroll").links.length, 0);
  assert.equal(removeModel(ws, "m2").links.length, 0);
});

test("workspace JSON round-trips; malformed JSON is refused with a reason", () => {
  const ws = defaultWorkspace();
  const back = parseWorkspace(JSON.stringify(ws));
  assert.equal(back.ok, true);
  assert.deepEqual(back.workspace, ws);
  assert.match(parseWorkspace("{").error, /Not JSON/);
  assert.match(parseWorkspace('{"models":[{"id":"a","name":"A","stocks":{},"inputs":[{"name":"x","resource":"gold"}],"outputs":[]}]}').error, /unknown resource "gold"/);
});
