/**
 * Business model — a business as stocks and the flows that cross its boundary,
 * and a workspace of such models combined by linking one's outputs to
 * another's inputs.
 *
 * Pure data and pure functions, no renderer: business.js draws what this
 * computes, and test/js/business_model.test.mjs checks it under `node --test`.
 *
 * Vocabulary
 *   resource   a kind of thing that flows: money, staff, talent, interest
 *   model      { id, name, stocks, inputs, outputs } — one business, household…
 *   flow       a named input (outside → stock) or output (stock → outside);
 *              rate per month = (base + Σ k · Π stocks) · scale, zero outside
 *              its window; outputs never draw a stock below zero
 *   link       { from: {model, flow}, to: {model, flow}, share } — `share` of
 *              one model's output becomes another model's input
 *   workspace  { months, models, links, snapshots } — what the page edits,
 *              persists and exports as JSON
 *   state      { t, stocks, flows } — one instant; a timeline is a list of them
 *
 * Combining is closed: `combine(workspace)` is itself a model (stocks keyed
 * "modelId:resource", flows with explicit from/to stocks), so it simulates
 * like any single model, and `wholeSpec` presents it as one business whose
 * inputs and outputs are exactly the unlinked ones.
 *
 * A link is valid when both ends carry the same resource, it joins two
 * different models, the input has no other source, and the shares drawn from
 * one output sum to at most 100%. Invalid links are reported, never applied.
 *
 * A flow with `conserved: false` is measured but depletes nothing — value
 * delivered to customers does not leave the business poorer the way payroll
 * does. Latent resources (interest) are held and moved like the others but
 * are not directly observable; the renderer draws them as ghosts.
 */

export const RESOURCES = {
  money:    { label: "Money",    unit: "k$",     color: 0xe8b84a, latent: false },
  staff:    { label: "Staff",    unit: "people", color: 0xe86f5a, latent: false },
  talent:   { label: "Talent",   unit: "skill",  color: 0x5ad19a, latent: false },
  interest: { label: "Interest", unit: "intent", color: 0xa78bfa, latent: true },
};

/**
 * Starting points for a model, smallest first. Amounts are per month; money
 * is in k$. Most are constant-rate (the 80/20 model: what comes in, what goes
 * out, how much); "startup" shows couplings between stocks.
 */
export const TEMPLATES = {
  simple: {
    label: "One in, one out",
    name: "Business",
    stocks: { money: 120 },
    inputs: [{ name: "Revenue", resource: "money", base: 50 }],
    outputs: [{ name: "Spend", resource: "money", base: 45 }],
  },
  cafe: {
    label: "Café",
    name: "Café",
    stocks: { money: 40 },
    inputs: [{ name: "Sales", resource: "money", base: 32 }],
    outputs: [
      { name: "Payroll", resource: "money", base: 14 },
      { name: "Rent", resource: "money", base: 6 },
      { name: "Supplies", resource: "money", base: 9 },
    ],
  },
  household: {
    label: "Household",
    name: "Household",
    stocks: { money: 8 },
    inputs: [{ name: "Wages", resource: "money", base: 5.5 }],
    outputs: [
      { name: "Rent", resource: "money", base: 2 },
      { name: "Groceries", resource: "money", base: 1.2 },
      { name: "Spending", resource: "money", base: 1.8 },
    ],
  },
  landlord: {
    label: "Landlord",
    name: "Landlord",
    stocks: { money: 30 },
    inputs: [{ name: "Rent", resource: "money", base: 8 }],
    outputs: [
      { name: "Mortgage", resource: "money", base: 5 },
      { name: "Maintenance", resource: "money", base: 1.5 },
    ],
  },
  startup: {
    label: "Startup · coupled flows",
    name: "Startup",
    stocks: { money: 300, staff: 10, talent: 20, interest: 15 },
    inputs: [
      { name: "Revenue", resource: "money", terms: [{ k: 2.0, of: ["talent"] }, { k: 1.2, of: ["interest"] }] },
      { name: "Investment", resource: "money", base: 240, window: [6, 7] },
      { name: "Hiring", resource: "staff", base: 0.5 },
      { name: "Onboarding", resource: "talent", base: 1.4 },
      { name: "Learning", resource: "talent", terms: [{ k: 0.05, of: ["interest"] }] },
      { name: "Attraction", resource: "interest", base: 0.6, terms: [{ k: 0.03, of: ["talent"] }] },
    ],
    outputs: [
      { name: "Payroll", resource: "money", terms: [{ k: 7, of: ["staff"] }] },
      { name: "Vendors", resource: "money", base: 12 },
      { name: "Attrition", resource: "staff", terms: [{ k: 0.035, of: ["staff"] }] },
      { name: "Departures", resource: "talent", terms: [{ k: 0.05, of: ["talent"] }] },
      { name: "Burnout", resource: "interest", terms: [{ k: 0.08, of: ["interest"] }] },
      { name: "Value delivered", resource: "talent", conserved: false, terms: [{ k: 0.9, of: ["talent"] }] },
    ],
  },
};

const DT = 0.25; // months per integration step
const EPS = 1e-9;

const fmt = (v) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));
const pct = (v) => `${Math.round(v * 100)}%`;
const clone = (v) => JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------------------
// One model
// ---------------------------------------------------------------------------

/** Every flow of a model with its direction attached, inputs first. */
export function flowsOf(spec) {
  return [
    ...spec.inputs.map((f) => ({ ...f, direction: "in" })),
    ...spec.outputs.map((f) => ({ ...f, direction: "out" })),
  ];
}

/** Resources a model touches, in RESOURCES order. */
export function resourcesOf(spec) {
  const used = new Set([
    ...Object.keys(spec.stocks),
    ...flowsOf(spec).map((f) => f.resource),
  ]);
  return Object.keys(RESOURCES).filter((r) => used.has(r));
}

/** True when a flow's rate depends on stocks (not a plain amount). */
export function isCoupled(flow) {
  return (flow.terms || []).length > 0;
}

/**
 * Unconstrained rate of a flow at time t given stocks: (base + Σ k·Π stocks)
 * times the flow's own scale and factor (a link's share), times an optional
 * external dial, zero outside its window.
 */
export function demandedRate(flow, stocks, t, scales = {}) {
  if (flow.window && (t < flow.window[0] || t >= flow.window[1])) return 0;
  let rate = flow.base || 0;
  for (const term of flow.terms || []) {
    rate += term.k * term.of.reduce((p, r) => p * (stocks[r] || 0), 1);
  }
  const dial = scales[flow.scaleKey ?? flow.name] ?? 1;
  return Math.max(0, rate * (flow.scale ?? 1) * (flow.factor ?? 1) * dial);
}

/**
 * Normal form: one list of flows, each with an id and explicit `from`/`to`
 * stock keys (null = outside). A single model's stocks are keyed by
 * resource; a combined model's by "modelId:resource".
 */
export function normalize(spec) {
  if (spec.flows) return spec;
  return {
    months: spec.months,
    stocks: spec.stocks,
    flows: [
      ...spec.inputs.map((f) => ({ ...f, id: f.name, from: null, to: f.resource })),
      ...spec.outputs.map((f) => ({ ...f, id: f.name, from: f.resource, to: null })),
    ],
  };
}

/**
 * Advance stocks by dt. Arrivals from outside land first; conserved drains
 * then share what each stock holds — if they demand more than is there, every
 * drain on that stock is cut back proportionally and marked constrained.
 * Transfers between stocks land last, at their constrained rate, so a combined
 * model conserves exactly what its links move.
 */
export function step(spec, state, dt = DT, scales = {}) {
  const { flows: defs } = normalize(spec);
  const { t, stocks } = state;
  const next = { ...stocks };
  const flows = {};

  for (const f of defs) {
    const rate = demandedRate(f, stocks, t, scales);
    flows[f.id] = { rate, demanded: rate, constrained: false };
  }
  for (const f of defs) {
    if (f.from == null && f.to != null) next[f.to] = (next[f.to] || 0) + flows[f.id].rate * dt;
  }

  const drains = {};
  for (const f of defs) {
    if (f.from != null && f.conserved !== false) {
      drains[f.from] = (drains[f.from] || 0) + flows[f.id].rate * dt;
    }
  }
  const share = {};
  for (const [key, want] of Object.entries(drains)) {
    const have = next[key] || 0;
    share[key] = want > have ? have / want : 1;
    next[key] = Math.max(0, have - want * share[key]);
  }
  for (const f of defs) {
    if (f.from != null && f.conserved !== false && share[f.from] < 1) {
      flows[f.id].rate *= share[f.from];
      flows[f.id].constrained = true;
    }
  }

  for (const f of defs) {
    if (f.from != null && f.to != null) next[f.to] = (next[f.to] || 0) + flows[f.id].rate * dt;
  }

  return { t: t + dt, stocks: next, flows };
}

/**
 * Run a model (single or combined) from month 0 to its horizon. Returns one
 * state per whole month (months + 1 states); each state's flows are the rates
 * in force at that instant, so state 0 already shows what is flowing.
 */
export function simulate(spec, scales = {}) {
  const norm = normalize(spec);
  const months = spec.months ?? 24;
  const timeline = [];
  let state = { t: 0, stocks: { ...norm.stocks }, flows: {} };
  const perMonth = Math.round(1 / DT);
  for (let month = 0; month <= months; month++) {
    const probe = step(norm, state, DT, scales);
    timeline.push({ t: month, stocks: state.stocks, flows: probe.flows });
    for (let i = 0; i < perMonth; i++) state = step(norm, state, DT, scales);
    state = { ...state, t: month + 1 };
  }
  return timeline;
}

/** State at a fractional month: stocks and rates interpolated linearly. */
export function stateAt(timeline, t) {
  const last = timeline.length - 1;
  const clamped = Math.max(0, Math.min(last, t));
  if (last === 0) return timeline[0];
  const i = Math.min(last - 1, Math.floor(clamped));
  const a = timeline[i];
  const b = timeline[i + 1];
  const u = clamped - i;
  const stocks = {};
  for (const key of Object.keys(a.stocks)) {
    stocks[key] = a.stocks[key] + (b.stocks[key] - a.stocks[key]) * u;
  }
  const flows = {};
  for (const key of Object.keys(a.flows)) {
    const fa = a.flows[key];
    const fb = b.flows[key] || fa;
    flows[key] = {
      rate: fa.rate + (fb.rate - fa.rate) * u,
      demanded: fa.demanded + (fb.demanded - fa.demanded) * u,
      constrained: u < 0.5 ? fa.constrained : fb.constrained,
    };
  }
  return { t: clamped, stocks, flows };
}

/**
 * Per-stock and per-flow maxima over a timeline, so every rendered state
 * shares one scale and side-by-side states are directly comparable.
 */
export function extents(timeline) {
  const stocks = {};
  const flows = {};
  for (const state of timeline) {
    for (const [k, v] of Object.entries(state.stocks)) stocks[k] = Math.max(stocks[k] || 0, v);
    for (const [k, f] of Object.entries(state.flows)) flows[k] = Math.max(flows[k] || 0, f.demanded);
  }
  return { stocks, flows };
}

/** First month a stock reaches zero, or null — runway, for money. */
export function depletedAt(timeline, key) {
  const hit = timeline.find((s) => s.t > 0 && key in s.stocks && s.stocks[key] <= EPS);
  return hit ? hit.t : null;
}

/** Net flow per resource (inputs − conserved outputs) for one state. */
export function netFlows(spec, state) {
  const net = {};
  for (const flow of flowsOf(spec)) {
    if (flow.direction === "out" && flow.conserved === false) continue;
    const rate = state.flows[flow.name]?.rate || 0;
    net[flow.resource] = (net[flow.resource] || 0) + (flow.direction === "in" ? rate : -rate);
  }
  return net;
}

// ---------------------------------------------------------------------------
// Workspace: many models, linked
// ---------------------------------------------------------------------------

export const linkId = (l) => `${l.from.model}:${l.from.flow}→${l.to.model}:${l.to.flow}`;
const inKey = (modelId, name) => `${modelId}:in:${name}`;
const outKey = (modelId, name) => `${modelId}:out:${name}`;
const stockKey = (modelId, resource) => `${modelId}:${resource}`;

export function modelById(ws, id) {
  return ws.models.find((m) => m.id === id);
}

const sameFrom = (a, b) => a.from.model === b.from.model && a.from.flow === b.from.flow;
const sameTo = (a, b) => a.to.model === b.to.model && a.to.flow === b.to.flow;

/** A new model from a template, with an id and name unique in the workspace. */
export function instantiate(ws, templateKey) {
  const template = TEMPLATES[templateKey];
  const ids = new Set(ws.models.map((m) => m.id));
  let n = 1;
  while (ids.has(`m${n}`)) n++;
  const names = new Set(ws.models.map((m) => m.name));
  let name = template.name;
  for (let i = 2; names.has(name); i++) name = `${template.name} ${i}`;
  const { label, ...body } = clone(template);
  return { ...body, id: `m${n}`, name, template: templateKey };
}

/** Share of an output already promised to links (other than `except`). */
export function allocated(ws, from, except = null) {
  return ws.links
    .filter((l) => sameFrom(l, { from }) && !(except && sameTo(l, except)))
    .reduce((sum, l) => sum + l.share, 0);
}

/**
 * Errors make a link invalid (it is not applied); warnings flag an
 * expectation gap — the receiver planned a different amount than it gets.
 * `others` are the links it must coexist with.
 */
export function validateLink(ws, link, others = ws.links.filter((l) => l !== link)) {
  const errors = [];
  const warnings = [];
  const src = modelById(ws, link.from.model);
  const dst = modelById(ws, link.to.model);
  const out = src?.outputs.find((f) => f.name === link.from.flow);
  const inp = dst?.inputs.find((f) => f.name === link.to.flow);
  if (!out) errors.push(`No output "${link.from.flow}" on ${src?.name ?? link.from.model}`);
  if (!inp) errors.push(`No input "${link.to.flow}" on ${dst?.name ?? link.to.model}`);
  if (errors.length) return { errors, warnings };

  const label = (m, f) => `${m.name} · ${f.name}`;
  if (src.id === dst.id) errors.push(`${src.name} can't feed itself — a link joins two models`);
  if (out.resource !== inp.resource) {
    errors.push(
      `${label(src, out)} carries ${RESOURCES[out.resource].label.toLowerCase()}; ` +
        `${label(dst, inp)} takes ${RESOURCES[inp.resource].label.toLowerCase()}`
    );
  }
  if (others.some((l) => sameTo(l, link))) errors.push(`${label(dst, inp)} already has a source`);
  if (!(link.share > 0 && link.share <= 1 + EPS)) errors.push("Share must be between 1% and 100%");
  const taken = others.filter((l) => sameFrom(l, link)).reduce((s, l) => s + l.share, 0);
  if (taken + link.share > 1 + EPS) {
    errors.push(`${label(src, out)} is ${pct(taken)} allocated; ${pct(link.share)} more would exceed 100%`);
  }

  if (!errors.length) {
    const sent = demandedRate(out, src.stocks, 0) * link.share;
    const expected = demandedRate(inp, dst.stocks, 0);
    if (expected > 0 && Math.abs(sent - expected) / expected > 0.15) {
      warnings.push(
        `${label(dst, inp)} expected ${fmt(expected)} ${RESOURCES[inp.resource].unit}/mo; ` +
          `${label(src, out)} sends ${fmt(sent)}`
      );
    }
  }
  return { errors, warnings };
}

/** Links applied, in order: each is checked against the ones accepted before it. */
export function validLinks(ws) {
  const accepted = [];
  for (const link of ws.links) {
    if (validateLink(ws, link, accepted).errors.length === 0) accepted.push(link);
  }
  return accepted;
}

/**
 * The share that delivers what the receiver expected at month 0, capped by
 * what is left of the output; null when nothing is left to give.
 */
export function suggestShare(ws, from, to) {
  const src = modelById(ws, from.model);
  const dst = modelById(ws, to.model);
  const out = src?.outputs.find((f) => f.name === from.flow);
  const inp = dst?.inputs.find((f) => f.name === to.flow);
  if (!out || !inp) return null;
  // Shares are whole percents; snapping avoids 1 − 0.7 = 0.30000000000000004.
  const remaining = Math.floor((1 - allocated(ws, from, { to })) * 100 + 1e-6) / 100;
  if (remaining < 0.01) return null;
  const sent = demandedRate(out, src.stocks, 0);
  const expected = demandedRate(inp, dst.stocks, 0);
  const ideal = sent > 0 && expected > 0 ? expected / sent : 1;
  return Math.max(0.01, Math.min(remaining, Math.round(ideal * 100) / 100));
}

/**
 * Every output that could feed this input: same resource, another model.
 * Each option says whether linking is valid now, and why not if it isn't.
 */
export function linkOptions(ws, modelId, inputName) {
  const dst = modelById(ws, modelId);
  const inp = dst?.inputs.find((f) => f.name === inputName);
  if (!inp) return [];
  const to = { model: modelId, flow: inputName };
  const others = ws.links.filter((l) => !sameTo(l, { to }));
  const options = [];
  for (const src of ws.models) {
    if (src.id === modelId) continue;
    for (const out of src.outputs) {
      if (out.resource !== inp.resource) continue;
      const from = { model: src.id, flow: out.name };
      const share = suggestShare(ws, from, to) ?? 0.01;
      const { errors } = validateLink(ws, { from, to, share }, others);
      options.push({
        from,
        share,
        label: `${src.name} · ${out.name}`,
        rate: demandedRate(out, src.stocks, 0),
        ok: errors.length === 0,
        reason: errors[0] || null,
      });
    }
  }
  return options;
}

/** Everything wrong or worth a look in a workspace, errors first. */
export function validateWorkspace(ws) {
  const issues = [];
  for (const m of ws.models) {
    if (!m.name.trim()) issues.push({ level: "error", text: `A model (${m.id}) has no name` });
    for (const [direction, list] of [["input", m.inputs], ["output", m.outputs]]) {
      const seen = new Set();
      for (const f of list) {
        if (!f.name.trim()) issues.push({ level: "error", text: `${m.name} has an unnamed ${direction}` });
        if (seen.has(f.name)) issues.push({ level: "error", text: `${m.name} has two ${direction}s named "${f.name}"` });
        seen.add(f.name);
        if ((f.base || 0) < 0) issues.push({ level: "error", text: `${m.name} · ${f.name} is negative` });
      }
    }
  }
  const accepted = [];
  for (const link of ws.links) {
    const { errors, warnings } = validateLink(ws, link, accepted);
    if (errors.length) {
      issues.push({ level: "error", text: `Link not applied: ${errors[0]}`, link });
    } else {
      accepted.push(link);
      for (const w of warnings) issues.push({ level: "warning", text: w, link });
    }
  }
  return issues.sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1));
}

/**
 * Flatten a workspace into one model. Each valid link becomes a transfer
 * between two models' stocks at `share` of the output's rate; whatever share
 * is left unlinked still leaves to the outside. Linked inputs take their rate
 * from the link and ignore their own planned amount.
 */
export function combine(ws) {
  const links = validLinks(ws);
  const fed = new Set(links.map((l) => `${l.to.model}:${l.to.flow}`));
  const stocks = {};
  const flows = [];

  for (const m of ws.models) {
    for (const r of resourcesOf(m)) stocks[stockKey(m.id, r)] = m.stocks[r] || 0;
  }

  for (const m of ws.models) {
    const carry = (f) => ({
      name: f.name,
      model: m.id,
      resource: f.resource,
      base: f.base,
      window: f.window,
      conserved: f.conserved,
      scale: f.scale,
      terms: f.terms?.map((t) => ({ k: t.k, of: t.of.map((r) => stockKey(m.id, r)) })),
    });
    for (const f of m.inputs) {
      if (fed.has(`${m.id}:${f.name}`)) continue;
      flows.push({ ...carry(f), id: inKey(m.id, f.name), from: null, to: stockKey(m.id, f.resource) });
    }
    for (const f of m.outputs) {
      const out = links.filter((l) => l.from.model === m.id && l.from.flow === f.name);
      let used = 0;
      for (const l of out) {
        used += l.share;
        flows.push({
          ...carry(f),
          id: linkId(l),
          link: l,
          factor: l.share,
          from: stockKey(m.id, f.resource),
          to: stockKey(l.to.model, f.resource),
        });
      }
      const rest = Math.max(0, 1 - used);
      if (rest > EPS) {
        flows.push({ ...carry(f), id: outKey(m.id, f.name), factor: rest, from: stockKey(m.id, f.resource), to: null });
      }
    }
  }

  return { months: ws.months, stocks, flows, links };
}

const ZERO = { rate: 0, demanded: 0, constrained: false };
const addFlow = (a, b) => ({
  rate: a.rate + b.rate,
  demanded: a.demanded + b.demanded,
  constrained: a.constrained || b.constrained,
});

/**
 * One model's view of a combined state, in that model's own names: its
 * stocks, its inputs (linked ones at the link's rate) and its outputs (the
 * sum of every linked share plus what still leaves to the outside).
 */
export function projectState(ws, combined, state, modelId) {
  const m = modelById(ws, modelId);
  const prefix = `${modelId}:`;
  const stocks = {};
  for (const r of resourcesOf(m)) stocks[r] = state.stocks[prefix + r] || 0;
  const flows = {};
  for (const f of m.inputs) {
    const l = combined.links.find((x) => x.to.model === modelId && x.to.flow === f.name);
    flows[f.name] = (l ? state.flows[linkId(l)] : state.flows[inKey(modelId, f.name)]) || ZERO;
  }
  for (const f of m.outputs) {
    let acc = state.flows[outKey(modelId, f.name)] || ZERO;
    for (const l of combined.links) {
      if (l.from.model === modelId && l.from.flow === f.name) acc = addFlow(acc, state.flows[linkId(l)] || ZERO);
    }
    flows[f.name] = acc;
  }
  return { t: state.t, stocks, flows };
}

/**
 * The workspace as one business: stocks summed per resource; inputs are the
 * unlinked inputs, outputs the outputs (or remainders) that still leave.
 * Internal links do not appear — they net to zero inside the whole.
 */
export function wholeSpec(ws, combined = combine(ws)) {
  const stocks = {};
  for (const [key, v] of Object.entries(combined.stocks)) {
    const r = key.split(":")[1];
    stocks[r] = (stocks[r] || 0) + v;
  }
  const label = (f) => `${modelById(ws, f.model).name} · ${f.name}`;
  const pick = (f) => ({ name: label(f), resource: f.resource, conserved: f.conserved, key: f.id });
  return {
    name: "Whole",
    months: ws.months,
    stocks,
    inputs: combined.flows.filter((f) => f.from == null).map(pick),
    outputs: combined.flows.filter((f) => f.to == null).map(pick),
  };
}

/** A combined state seen as the whole business. */
export function wholeState(whole, state) {
  const stocks = {};
  for (const [key, v] of Object.entries(state.stocks)) {
    const r = key.split(":")[1];
    stocks[r] = (stocks[r] || 0) + v;
  }
  const flows = {};
  for (const f of [...whole.inputs, ...whole.outputs]) flows[f.name] = state.flows[f.key] || ZERO;
  return { t: state.t, stocks, flows };
}

// ---------------------------------------------------------------------------
// Edits — pure, each returns a new workspace with links kept consistent
// ---------------------------------------------------------------------------

export function updateModel(ws, id, fn) {
  return { ...ws, models: ws.models.map((m) => (m.id === id ? fn(clone(m)) : m)) };
}

export function removeModel(ws, id) {
  return {
    ...ws,
    models: ws.models.filter((m) => m.id !== id),
    links: ws.links.filter((l) => l.from.model !== id && l.to.model !== id),
  };
}

/** Rename a flow; links follow the new name. */
export function renameFlow(ws, id, direction, from, to) {
  const listKey = direction === "in" ? "inputs" : "outputs";
  const end = direction === "in" ? "to" : "from";
  const next = updateModel(ws, id, (m) => {
    m[listKey] = m[listKey].map((f) => (f.name === from ? { ...f, name: to } : f));
    return m;
  });
  next.links = ws.links.map((l) =>
    l[end].model === id && l[end].flow === from ? { ...l, [end]: { model: id, flow: to } } : l
  );
  return next;
}

/** Remove a flow and any link that used it. */
export function removeFlow(ws, id, direction, name) {
  const listKey = direction === "in" ? "inputs" : "outputs";
  const end = direction === "in" ? "to" : "from";
  const next = updateModel(ws, id, (m) => {
    m[listKey] = m[listKey].filter((f) => f.name !== name);
    return m;
  });
  next.links = ws.links.filter((l) => !(l[end].model === id && l[end].flow === name));
  return next;
}

/** Feed an input from an output (replacing any source it had), or unlink with from = null. */
export function setLink(ws, to, from, share) {
  const links = ws.links.filter((l) => !sameTo(l, { to }));
  if (from) links.push({ from, to, share });
  return { ...ws, links };
}

export function defaultWorkspace() {
  let ws = { months: 24, models: [], links: [], snapshots: [] };
  for (const key of ["cafe", "household"]) ws = { ...ws, models: [...ws.models, instantiate(ws, key)] };
  const from = { model: "m1", flow: "Payroll" };
  const to = { model: "m2", flow: "Wages" };
  ws = setLink(ws, to, from, suggestShare(ws, from, to));
  ws.snapshots = [0, 8, 16, 24].map((t) => ({ t, name: `Month ${t}` }));
  return ws;
}

/**
 * Parse workspace JSON (an export, or saved state). Returns
 * { ok: true, workspace } or { ok: false, error } — never a half-read
 * workspace.
 */
export function parseWorkspace(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `Not JSON: ${e.message}` };
  }
  const fail = (error) => ({ ok: false, error });
  if (!data || !Array.isArray(data.models)) return fail("Expected an object with a models list");
  const ids = new Set();
  for (const m of data.models) {
    if (typeof m.id !== "string" || !m.id || m.id.includes(":")) return fail("Every model needs an id without ':'");
    if (ids.has(m.id)) return fail(`Duplicate model id ${m.id}`);
    ids.add(m.id);
    if (typeof m.name !== "string") return fail(`Model ${m.id} needs a name`);
    if (!m.stocks || typeof m.stocks !== "object") return fail(`${m.name} needs stocks`);
    for (const list of [m.inputs, m.outputs]) {
      if (!Array.isArray(list)) return fail(`${m.name} needs inputs and outputs lists`);
      for (const f of list) {
        if (typeof f.name !== "string") return fail(`${m.name} has a flow without a name`);
        if (!RESOURCES[f.resource]) return fail(`${m.name} · ${f.name}: unknown resource "${f.resource}"`);
        if (f.base !== undefined && typeof f.base !== "number") return fail(`${m.name} · ${f.name}: amount must be a number`);
      }
    }
  }
  const links = data.links ?? [];
  if (!Array.isArray(links)) return fail("links must be a list");
  for (const l of links) {
    if (!l.from?.model || !l.from?.flow || !l.to?.model || !l.to?.flow || typeof l.share !== "number") {
      return fail("Each link needs from {model, flow}, to {model, flow} and a numeric share");
    }
  }
  const months = Number.isFinite(data.months) && data.months > 0 ? Math.min(240, Math.round(data.months)) : 24;
  const snapshots = Array.isArray(data.snapshots)
    ? data.snapshots.filter((s) => Number.isFinite(s.t) && typeof s.name === "string")
    : [];
  return { ok: true, workspace: { months, models: data.models, links, snapshots } };
}
