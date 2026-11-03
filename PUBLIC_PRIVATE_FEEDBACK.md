# Public–Private Feedback Architecture

A symmetric framing of public and private sector failure modes, with mitigations for each, holding meaningful employment as the cross-cutting constraint.
Companion to [GOVERNANCE.md](GOVERNANCE.md) (accountability mechanisms) and [docs/continuous_process_audit.md](docs/continuous_process_audit.md) (the evidence engine for control re-pricing).

## Core thesis

Both sectors fail through their feedback architecture, in opposite directions.

- **Public sector: feedback too weak.**
  No exit, no price signal; the only feedback is political — slow, noisy, and asymmetric (visible failure is punished, quiet effectiveness is unrewarded).
  Waste and process accrete invisibly.
- **Private sector: feedback too narrow.**
  The firm hears only the revenue channel.
  Any value not priced in — durability, customer data, externalities, the future — gets strip-mined.

Neither failure is about the people in the buildings; both are about what signals the system can hear.
Mitigation is therefore never "be more like the other sector."
It is: **add signal to the public side; broaden signal on the private side.**

## The ratchet (public failure mechanism)

Public agencies operate under an asymmetric risk regime: visible failure (scandal, audit finding, headline) is career-ending, while quiet effectiveness goes unrewarded.
The rational response to every failure is to add a control — a review step, a sign-off, a procurement rule.
No mechanism ever removes a control, because removing one means personally owning the risk it guarded.
Rules accrete monotonically; that is the ratchet.

Reinforcing loops:

- Budget logic funds inputs, not outcomes; spend-it-or-lose-it; baseline-plus budgeting.
- The reward for efficiency is a smaller budget next year — the ratchet's enforcement mechanism.
- Pay compression drives senior skills out; the agency buys them back through contractors at 3x (the hollow state), further eroding in-house mastery.
- POSIWID: when jobs themselves become a constituency, the system's purpose quietly becomes maintaining the jobs.

Steelman: some public "inefficiency" is load-bearing.
Agencies are optimized against worst-case outcomes (corruption, capture, denial of due process), not average-case throughput.
Universality means serving the hardest 5% of cases a private firm would cream-skim away.
The pathology is not that controls exist — it is that they are never re-priced.

## Extraction (private failure mechanism)

Both named pathologies reduce to "unpriced value gets extracted":

- **Engineered obsolescence** is durability arbitrage — extract now, let the customer pay later.
- **Lock-in / enshittification** is exit-cost arbitrage — degrade the product exactly as fast as switching costs allow.

Time preference is the driver: quarterly-optimized capital strip-mines what patient capital would maintain.

## Mirror-image future theft

Both sectors steal from the future.
Engineered obsolescence pushes cost onto the customer's future; **deferred maintenance is the public sector's engineered obsolescence** — the road looks fine this budget cycle, and the balloon payment lands on a future council.
Any KPI system that does not make future-theft visible will be gamed by it.

## Public mitigations: making the missing signal

### Unit-cost KPIs, with two design rules

**Rule 1 — every efficiency metric travels with an effectiveness metric and a coverage metric.**
Cost-per-unit alone rewards service degradation and cream-skimming (Goodhart doing to the KPI what markets do to unpriced value).
The triad is cost / quality / coverage.

Infrastructure:

- Cost per lane-mile-year of maintenance, paired with pavement condition index.
- Cost per sewer-mile, paired with overflow and infiltration events.
- **Deferred-maintenance backlog as % of asset replacement value** — the single most important anti-ratchet number; future-theft made legible on one line.

Services:

- Cost per case or transaction (permit, benefit determination, inspection), paired with cycle time and error/rework rate.
- Share of the eligible population actually reached — the hard 5% is where public obligation lives, and exactly what a naive cost metric punishes.

**Rule 2 — comparison substitutes for competition.**
An agency cannot lose customers, but it can be compared.
Publishing unit costs across peer jurisdictions (yardstick competition — Shleifer, 1985) creates market-like pressure without privatizing anything.
Open unit-cost data also puts citizens in the feedback loop with something sharper than a complaint line (Beer's cyberfolk).

### Structural anti-ratchet mechanisms

- **Control re-pricing.**
  Every internal control gets a sunset date and periodic evidence review: does this sign-off still buy more risk reduction than it costs in delivery?
  Nobody removes a control on judgment alone (career risk); evidence gives them cover.
  Continuous process audit / conformance checking is the evidence engine.
- **Risk symmetry / gainsharing.**
  Agencies retain a share of verified savings for discretionary use.
  Teams that own a metric and benefit from moving it recover mastery feedback — an efficiency intervention and a meaningfulness intervention at once.

## Private mitigations: broadening the signal

### Against engineered obsolescence

- **Total-cost-of-ownership purchasing.**
  Buy on lifetime cost, not sticker price.
  The strongest lever is public procurement itself: government is a large enough buyer that demanding 10-year parts availability and repairability shifts what manufacturers build for everyone.
  This is the hinge where the two sectors meet — a public sector disciplined by unit costs becomes the customer that disciplines private durability.
- **Right to repair + durability disclosure.**
  France's repairability index is the working example: a mandated label scoring spare-part availability and disassembly ease, converting durability from an invisible attribute into a priced, comparable one.
  Warranty-duration floors work from the liability side.

### Against extraction and lock-in

- **Exit restoration.**
  Data portability and interoperability mandates are the market analogue of due process — they keep the exit option real, which is the only thing keeping the price channel honest.
- **Ownership structures with long horizons.**
  Steward-ownership, ESOPs, co-ops change whose feedback the firm hears.
  Simultaneously a meaningful-employment intervention: worker-owners get purpose and autonomy structurally, not by managerial grace.

### The hybrid case (private delivery of public services)

Where the worst of both sectors meet.
Outcome-based contracts need quality floors, must-serve clauses, and risk-adjusted payments — otherwise the contractor cream-skims cheap cases, returns the hard 5% to the agency, and pollutes the public unit-cost metrics.

## Cross-cutting test: meaningfulness

Meaningful work ≈ autonomy × mastery × purpose.
The sectors starve different terms: public work offers purpose but starves autonomy (procedural constraint) and mastery (pay compression, hollow-state contracting); private work offers autonomy and mastery but purpose is contingent on what the firm sells.
Mission-driven people enter government for the purpose term and burn out on the other two.

Every mitigation above must be scored on this axis, because measurement regimes can kill what they measure.
Unit-cost KPIs imposed top-down become surveillance — autonomy collapses, the mission people leave, the ratchet is traded for demoralization.
The same KPIs owned by the teams — self-serve dashboards, team-level gainsharing, the metric as instrument rather than leash — restore exactly the mastery feedback public work usually starves.

**The frame in one line: weak signal → add it; narrow signal → broaden it; and always route the new signal through the people doing the work, not just over them.**

## Adaptics connection

- `/agents` (econ_agents.js) could make the tradeoff explorable rather than argued: exit asymmetry / ratchet as a dial (private under-delivery → firm death vs. public friction accretion reset only by rare reform events); meaningfulness as skill–role congruence feeding productivity; public output as an infrastructure field multiplying local exchange efficiency.
  Sweep public-sector share against feedback strength; watch where meaningful employment × service quality peaks.
- [docs/continuous_process_audit.md](docs/continuous_process_audit.md) is the commercial expression of the control re-pricing mitigation.
- [GOVERNANCE.md](GOVERNANCE.md) catalogs the accountability mechanisms this framing organizes by feedback direction.
- [HUMAN_AND_AI_LABOR.md](HUMAN_AND_AI_LABOR.md) shares the meaningfulness axis.
