# Continuous Process Audit as a Managed Service

Continuous process audit is a new category sitting between traditional audit, business intelligence, and process improvement consulting.

## The core idea

Process mining conformance checking as a billable service:
- **Ideal model**: BPMN the client provides or co-develops
- **Observed model**: inferred from event logs (ERP, CRM, ticketing, workflow systems)
- **Delta**: the waste map — Muda/Mura/Muri tagged to specific transitions
- **Continuous**: embedded in the client's data pipeline, not point-in-time

## Target market

Mid-market: regional governments, mid-size healthcare, professional services, utilities.
- Have complex regulated processes and audit obligations
- Messy heterogeneous systems (not SAP monocultures)
- No budget for Celonis (dominates enterprise/Fortune 500)
- IT consultants already have data relationships

## Service layers

1. **Discovery** — extract logs, infer actual Markov chain, produce as-is model
2. **Conformance** — diff against should-be BPMN, score per process/case/actor, produce waste map
3. **Continuous monitoring** — live conformance in client data pipeline, anomaly alerts; recurring revenue

## Land-and-expand

Data strategy engagement precedes conformance work:
- Most orgs record states, not transitions; timestamps unreliable; actor attribution missing
- "Before we can audit your process, we need to instrument it" = separate billable workstream
- Permanently improves client data infrastructure

## Tools

- PM4Py (Python, open source)
- ProM (Java, academic)
- Neither productized for non-technical clients — gap between "tool that works" and "service a CFO can buy" is the business model

## Competitive positioning

Compliance audits already require process documentation.
This makes documentation executable and audit continuous rather than annual.
Sold as a service methodology, not a software license.
