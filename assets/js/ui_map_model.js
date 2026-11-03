/**
 * /ui-map — the model: a pyramid of user interface, from the browser's
 * substrate up to human needs. Pure data + pure functions; ui_map.js draws it.
 *
 * Each node sits on a level and `uses` nodes on its own level or below —
 * what it is made of (patterns are built from patterns, features from
 * features; never from anything above, and never in a cycle). Read downward,
 * a node's *composition*; read upward, its *reach*: everything that
 * ultimately depends on it.
 *
 * Tests: node --test test/js/ui_map_model.test.mjs
 */

export const LEVELS = [
  { id: 0, name: "Substrate", lens: "web", note: "What the browser gives us before we design anything." },
  { id: 1, name: "Elements", lens: "web", note: "Native HTML: each one already carries meaning, focus and keyboard behavior." },
  { id: 2, name: "Components", lens: "web", note: "A few elements that always travel together, with one job." },
  { id: 3, name: "Patterns", lens: "web", note: "Familiar arrangements of components that people already know how to read." },
  { id: 4, name: "Views", lens: "web", note: "A screen: one URL, one question it answers, and every state it can be in." },
  { id: 5, name: "Operations", lens: "both", note: "What people can do to things: CRUD and its relatives." },
  { id: 6, name: "Features", lens: "both", note: "A coherent capability: operations on a kind of thing, across several views." },
  { id: 7, name: "Tasks", lens: "hcd", note: "What a person is trying to get done — the reason to open the app at all." },
  { id: 8, name: "Needs", lens: "hcd", note: "Why the task matters to them: what they keep when it goes well." },
];

// [id, level, label, note, uses]
const RAW = [
  // 0 — substrate
  ["url", 0, "URL", "An address; a stable URL makes any state shareable and bookmarkable.", []],
  ["http", 0, "HTTP", "Requests and responses: the round trip behind every load and submit.", ["url"]],
  ["document", 0, "HTML document", "Text with structure; meaning comes before looks.", ["http"]],
  ["dom", 0, "DOM", "The live tree the document becomes; scripts read and change it.", ["document"]],
  ["css", 0, "CSS", "Layout, type and color applied to the tree.", ["dom"]],
  ["events", 0, "Events", "Clicks, keys, focus, input: the DOM telling us what a person did.", ["dom"]],
  ["a11y", 0, "Accessibility tree", "The DOM as assistive tech sees it: roles, names, states.", ["dom"]],

  // 1 — elements
  ["text", 1, "Paragraph / text", "<p>, <span>, <strong>: prose, one idea per paragraph.", ["document", "css"]],
  ["heading", 1, "Heading", "<h1>–<h6>: the outline people and screen readers skim.", ["document", "a11y"]],
  ["link", 1, "Link", "<a href>: go somewhere. Navigation, not action.", ["url", "events", "a11y"]],
  ["button", 1, "Button", "<button>: do something here. Focusable, keyboard-ready.", ["events", "a11y"]],
  ["input", 1, "Input", "<input>, <textarea>: a person types or picks a value.", ["events", "a11y"]],
  ["select", 1, "Select / choice", "<select>, radio, checkbox: pick from known options.", ["events", "a11y"]],
  ["label", 1, "Label", "<label>: names an input, for eyes and for screen readers.", ["a11y"]],
  ["image", 1, "Image / icon", "<img>, <svg>: pictures need alt text or a hidden role.", ["document", "a11y"]],
  ["list-el", 1, "List", "<ul>, <ol>, <li>: a set of like things, announced with a count.", ["document", "a11y"]],
  ["table-el", 1, "Table", "<table>: rows × columns, with headers that name each cell.", ["document", "a11y"]],
  ["details", 1, "Details / summary", "<details>: native show-and-hide, no script needed.", ["events", "a11y"]],
  ["dialog-el", 1, "Dialog", "<dialog>: a modal layer that traps focus.", ["events", "a11y"]],
  ["form-el", 1, "Form", "<form>: groups inputs and submits them together.", ["http", "events"]],

  // 2 — components
  ["field", 2, "Field", "Label + input + hint + error: the unit of every form.", ["label", "input", "text"]],
  ["search-box", 2, "Search box", "One input, one submit, a clear way to reset.", ["form-el", "input", "button", "label"]],
  ["card", 2, "Card", "A summary of one thing with a way into it.", ["heading", "text", "link", "image"]],
  ["list-item", 2, "List item", "One row of a collection: title, meta, action.", ["list-el", "link", "text"]],
  ["menu", 2, "Menu", "A list of commands or destinations behind one trigger.", ["button", "list-el", "link"]],
  ["tab", 2, "Tab", "One labelled panel among siblings.", ["button", "a11y"]],
  ["accordion-item", 2, "Accordion item", "A heading that shows or hides its panel.", ["details", "heading"]],
  ["modal", 2, "Modal", "Interrupts to ask or confirm; must be escapable.", ["dialog-el", "heading", "button"]],
  ["toast", 2, "Toast / flash", "Brief feedback after something happened.", ["text", "a11y"]],
  ["pagination", 2, "Pagination", "Where you are in a long list and how to move.", ["link", "list-el"]],
  ["breadcrumb", 2, "Breadcrumb / back", "Where this sits and the way back up.", ["link"]],
  ["badge", 2, "Badge / status", "A short label for state: draft, 3 new, failed.", ["text"]],
  ["table-row", 2, "Table row", "One record across named columns.", ["table-el", "text", "link"]],
  ["empty-note", 2, "Empty message", "What to say, and offer, when there is nothing yet.", ["text", "button"]],

  // 3 — patterns
  ["form", 3, "Form", "Fields, validation and one clear submit.", ["form-el", "field", "button", "toast"]],
  ["collection", 3, "Collection / list", "Many like things, scannable at a glance.", ["list-item", "pagination", "empty-note"]],
  ["data-table", 3, "Data table", "Records to compare across columns.", ["table-row", "pagination", "empty-note"]],
  ["navigation", 3, "Navigation", "The map of where you can go.", ["menu", "link", "breadcrumb"]],
  ["accordion", 3, "Accordion", "Many sections; open what you need.", ["accordion-item"]],
  ["tabs", 3, "Tabs", "Siblings that share one space.", ["tab"]],
  ["master-detail", 3, "Master–detail", "A list beside the selected item's detail.", ["collection", "card"]],
  ["wizard", 3, "Wizard / steps", "A long task broken into ordered steps.", ["form", "breadcrumb", "button"]],
  ["feed", 3, "Feed / timeline", "Things in time order, newest first.", ["collection", "card"]],
  ["toolbar", 3, "Filter / sort bar", "Narrow and order a collection.", ["select", "search-box", "button", "badge"]],

  // 4 — views
  ["index-view", 4, "Index view", "All the things of a kind.", ["collection", "data-table", "toolbar", "navigation"]],
  ["detail-view", 4, "Detail view", "One thing, fully.", ["heading", "text", "accordion", "tabs", "breadcrumb"]],
  ["edit-view", 4, "Edit view", "Change one thing, with a way out.", ["form", "breadcrumb", "modal"]],
  ["new-view", 4, "New view", "Make a thing; often the same form as edit.", ["form", "wizard"]],
  ["results-view", 4, "Search results", "What matched, and why it matched.", ["collection", "search-box", "toolbar", "empty-note"]],
  ["dashboard", 4, "Dashboard", "Many summaries, one glance.", ["card", "data-table", "badge"]],
  ["settings-view", 4, "Settings", "How the app behaves for me.", ["form", "tabs"]],
  ["states", 4, "States", "Loading, empty, error, partial, done: every view has all five.", ["empty-note", "toast", "badge"]],

  // 5 — operations
  ["create", 5, "Create", "Bring a thing into being.", ["new-view", "form", "toast"]],
  ["read", 5, "Read", "Find and look at a thing.", ["index-view", "detail-view"]],
  ["update", 5, "Update", "Change a thing, safely.", ["edit-view", "form", "toast"]],
  ["delete", 5, "Delete", "Remove a thing — confirm, or better, allow undo.", ["modal", "button", "toast"]],
  ["list", 5, "List", "See many things at once.", ["index-view", "collection", "pagination"]],
  ["search", 5, "Search", "Find by what you remember.", ["results-view", "search-box"]],
  ["filter-sort", 5, "Filter & sort", "Narrow and order what you see.", ["toolbar", "index-view"]],
  ["undo", 5, "Undo / history", "Take it back; see what changed.", ["toast", "feed"]],
  ["share", 5, "Share / export", "Hand a thing to someone or somewhere else.", ["url", "menu", "modal"]],

  // 6 — features
  ["records", 6, "Record management", "CRUD for one kind of thing.", ["create", "read", "update", "delete", "list"]],
  ["findability", 6, "Findability", "Search, filters and sensible order.", ["search", "filter-sort", "list"]],
  ["notifications", 6, "Notifications", "Tell me when something needs me.", ["feed", "badge", "toast", "settings-view"]],
  ["history", 6, "Versioning & audit", "Who changed what, and back again.", ["undo", "feed", "read"]],
  ["collab", 6, "Collaboration", "Several people on the same thing.", ["share", "notifications", "history", "update"]],
  ["onboarding", 6, "Onboarding", "The first useful minute.", ["wizard", "empty-note", "states"]],
  ["ex-transcripts", 6, "e.g. Transcript browser", "adaptics /transcripts: projects → sessions → turns, sort, search.", ["list", "read", "search", "filter-sort", "master-detail", "accordion", "breadcrumb"]],
  ["ex-wiki", 6, "e.g. Wiki", "adaptics /wiki: pages with edit and history.", ["records", "history", "search"]],

  // 7 — tasks (HCD)
  ["find", 7, "Find something", "I know it's in here somewhere.", ["findability", "read", "ex-transcripts"]],
  ["make", 7, "Make something", "Put something new into the world.", ["create", "records", "onboarding"]],
  ["change", 7, "Change something", "Fix it, improve it, keep it current.", ["update", "history"]],
  ["decide", 7, "Decide", "Compare options and choose with confidence.", ["dashboard", "data-table", "findability"]],
  ["work-together", 7, "Work together", "Coordinate with the people involved.", ["collab", "notifications", "ex-wiki"]],
  ["understand", 7, "Understand", "Make sense of what's here and why.", ["detail-view", "read", "ex-transcripts"]],
  ["keep-track", 7, "Keep track", "Know what's happening without hunting for it.", ["notifications", "dashboard", "history"]],

  // 8 — needs (HCD)
  ["competence", 8, "Competence", "I can do this, and do it well.", ["make", "change", "understand"]],
  ["autonomy", 8, "Autonomy / control", "I'm in charge; I can undo and choose.", ["change", "decide", "find"]],
  ["trust", 8, "Trust", "It does what it says and keeps what's mine safe.", ["keep-track", "change", "understand"]],
  ["relatedness", 8, "Relatedness", "I'm doing this with and for other people.", ["work-together"]],
  ["time", 8, "Time well spent", "It got me there without friction.", ["find", "make", "decide", "keep-track"]],
];

export const NODES = RAW.map(([id, level, label, note, uses]) => ({ id, level, label, note, uses }));

/** Qualities that cut through every layer; drawn as rails beside the pyramid. */
export const QUALITIES = [
  { id: "accessible", label: "Accessible", from: 0, to: 8, note: "From the accessibility tree up to who gets to take part at all." },
  { id: "feedback", label: "Feedback & states", from: 1, to: 7, note: "Every action answers: pressed, saving, saved, failed — and what now." },
  { id: "consistent", label: "Consistent", from: 1, to: 6, note: "The same thing looks and behaves the same everywhere." },
  { id: "content", label: "Content & words", from: 1, to: 8, note: "Labels, headings and messages in the person's own language." },
  { id: "responsive", label: "Responsive", from: 0, to: 4, note: "Works on a phone, a big screen and a keyboard alone." },
  { id: "private", label: "Private & safe", from: 0, to: 8, note: "From HTTPS to whether people feel safe trusting it with their things." },
];

// -- queries -----------------------------------------------------------------

const byId = new Map(NODES.map((n) => [n.id, n]));

export function node(id) {
  return byId.get(id);
}

/** Direct users of a node (one level of reach). */
export function usedBy(id) {
  return NODES.filter((n) => n.uses.includes(id)).map((n) => n.id);
}

/** Everything a node is made of, transitively (its composition). */
export function composition(id) {
  return closure(id, (x) => node(x).uses);
}

/** Everything that depends on a node, transitively (its reach). */
export function reach(id) {
  return closure(id, usedBy);
}

function closure(id, next) {
  const seen = new Set();
  const stack = [...next(id)];
  while (stack.length) {
    const x = stack.pop();
    if (seen.has(x)) continue;
    seen.add(x);
    stack.push(...next(x));
  }
  return seen;
}

/**
 * What emerges when the map is unfolded up to `upTo`:
 *  - keystones: per layer, the piece with the most reach among visible nodes
 *  - reused: the pieces used directly by the most other visible pieces
 *  - lateral: uses within a layer — composition that isn't strictly layered
 *  - layers: per layer, how many nodes and how many uses
 */
export function emergence(upTo = LEVELS.length - 1, top = 5) {
  const visible = NODES.filter((n) => n.level <= upTo);
  const ids = new Set(visible.map((n) => n.id));
  const reachOf = (id) => [...reach(id)].filter((x) => ids.has(x)).length;
  const scored = visible.map((n) => ({
    id: n.id,
    label: n.label,
    level: n.level,
    reach: reachOf(n.id),
    usedBy: usedBy(n.id).filter((x) => ids.has(x)).length,
  }));
  const byReach = (a, b) => b.reach - a.reach || a.label.localeCompare(b.label);

  const keystones = LEVELS.filter((l) => l.id < upTo)
    .map((l) => scored.filter((n) => n.level === l.id).sort(byReach)[0])
    .filter((k) => k && k.reach > 0);

  const reused = scored
    .filter((n) => n.usedBy > 0)
    .sort((a, b) => b.usedBy - a.usedBy || byReach(a, b))
    .slice(0, top);

  const lateral = visible.flatMap((n) =>
    n.uses.filter((u) => node(u).level === n.level).map((u) => ({ from: n.id, to: u, level: n.level }))
  );

  const layers = LEVELS.filter((l) => l.id <= upTo).map((l) => {
    const here = visible.filter((n) => n.level === l.id);
    return { level: l.id, name: l.name, nodes: here.length, uses: here.reduce((s, n) => s + n.uses.length, 0) };
  });

  return {
    keystones,
    reused,
    lateral,
    layers,
    nodes: visible.length,
    edges: visible.reduce((s, n) => s + n.uses.length, 0),
  };
}

/** Structural problems in the data (empty when the map is sound). */
export function validate(nodes = NODES) {
  const ids = new Map(nodes.map((n) => [n.id, n]));
  const problems = [];
  if (ids.size !== nodes.length) problems.push("duplicate ids");
  for (const n of nodes) {
    for (const u of n.uses) {
      const target = ids.get(u);
      if (!target) problems.push(`${n.id} uses unknown ${u}`);
      else if (target.level > n.level) problems.push(`${n.id} (L${n.level}) uses higher ${u} (L${target.level})`);
    }
    if (n.uses.includes(n.id) || [...closureIn(ids, n.id)].includes(n.id)) problems.push(`${n.id} is in a cycle`);
    if (n.level > 0 && n.uses.length === 0) problems.push(`${n.id} is made of nothing`);
    if (n.level < LEVELS.length - 1 && !nodes.some((m) => m.uses.includes(n.id))) problems.push(`${n.id} is used by nothing`);
  }
  return problems;
}

// composition over an arbitrary node map (validate may be given test data)
function closureIn(ids, id) {
  const seen = new Set();
  const stack = [...(ids.get(id)?.uses ?? [])];
  while (stack.length) {
    const x = stack.pop();
    if (seen.has(x) || !ids.has(x)) continue;
    seen.add(x);
    stack.push(...ids.get(x).uses);
  }
  return seen;
}
