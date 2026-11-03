# DRY Data: Sources of Truth in the Age of Generative AI

## The Software Principle

**DRY—Don't Repeat Yourself**—is a fundamental software engineering principle:

> Every piece of knowledge must have a single, unambiguous, authoritative representation within a system.

The principle exists because **duplication creates divergence**:
- Copy a value, change one copy, now you have two "truths"
- Which is authoritative? Neither? Both?
- Maintenance burden multiplies
- Bugs emerge from inconsistency
- Trust erodes

In code, DRY is enforced through abstraction: functions, modules, references. You don't copy code; you call it. The source remains single; the uses are many.

---

## Part I: The Platonic Frame

### Data as Shadow of Form

In Platonic terms:
- **Forms** (εἶδος): The true, unchanging reality
- **Particulars**: Imperfect copies, shadows on the cave wall

Applied to data:
- **Canonical source**: The authoritative representation of a fact
- **Copies/derivatives**: Reproductions for various uses

The Platonic intuition: **truth is singular**. There is one fact about when you were born, one fact about the current temperature, one fact about the balance in an account. Copies may proliferate, but they are shadows—useful, perhaps, but not the thing itself.

### The Cost of Shadow Proliferation

When copies multiply:
- **Divergence**: Copies drift from source and each other
- **Confusion**: Which version is true?
- **Maintenance**: Updating N copies costs N times as much
- **Storage**: Redundant data consumes resources
- **Trust erosion**: Inconsistency breeds doubt

In software, we've learned this painfully. The same lesson applies to data at civilizational scale.

### The Value of Canonical Reference

A single source of truth provides:
- **Consistency**: One answer to any query
- **Efficiency**: Update once, propagate everywhere
- **Auditability**: Clear lineage, traceable changes
- **Trust**: Known authority, verifiable accuracy

This is why we have:
- Legal registries (who owns what)
- Vital records (births, deaths, marriages)
- Scientific journals (peer-reviewed findings)
- Financial ledgers (authoritative balances)

These are **institutions of canonical reference**—socially agreed sources of truth.

---

## Part II: LLMs and the Duplication Explosion

### The Generative Problem

Large Language Models are, fundamentally, **duplication machines**. They:
- Absorb vast text (copying into weights)
- Generate new text (producing copies/derivatives)
- Operate without reference to canonical sources
- Create plausible-sounding content regardless of truth

Every LLM output is a **derivative work** with no traceable lineage to authoritative sources. The model doesn't "know" facts; it has statistical patterns over text that contained facts, opinions, errors, and fabrications—all blended.

### The Acceleration of Copy Creation

Before LLMs:
- Creating text required human effort
- Effort constrained duplication
- Most copies were intentional, traceable

With LLMs:
- Text generation is nearly free
- Duplication is effortless
- Copies proliferate without intention or traceability

We're experiencing **copy inflation**—exponential increase in derivative content with unclear relationship to original sources.

### The Authority Vacuum

LLM outputs have:
- No author (in the traditional sense)
- No source citation (unless specifically prompted, and then unreliably)
- No accountability
- No correction mechanism
- No version control

They exist in an **authority vacuum**—asserting facts without grounding, creating shadows without forms.

---

## Part III: The Tensions

### Tension 1: Duplication vs. Authoritativeness

**Duplication benefits**:
- Availability (data where you need it)
- Performance (local copies are faster)
- Resilience (redundancy survives failures)
- Adaptation (copies can be modified for context)

**Authoritativeness benefits**:
- Consistency (one truth)
- Efficiency (maintain once)
- Trust (known source)
- Accountability (someone responsible)

The tension: you can't have both maximal availability and perfect consistency. Copies enable use; copies enable divergence.

### Tension 2: Structured vs. Unstructured Data

**Structured data** (databases, schemas):
- Precise semantics
- Machine-queryable
- Enforceable constraints
- Harder to create and modify

**Unstructured data** (text, documents):
- Flexible expression
- Human-readable
- No enforced constraints
- Easy to create and modify

LLMs operate primarily on unstructured data. They can generate structured output, but they don't *think* in structures. The explosion is in unstructured content—which is precisely where authority is hardest to establish.

### Tension 3: Canonical Reference vs. Contextual Composition

**Canonical reference**:
- Point to the source
- Don't duplicate, link
- Preserve single truth

**Contextual composition**:
- Combine sources for specific use
- Transform data for audience
- Create derived works for purpose

Human use cases require composition. A report combines data from many sources. A summary extracts and condenses. A translation transforms. An explanation contextualizes.

These compositions are valuable—but they're also duplications that can diverge.

### Tension 4: Creation Incentives vs. Maintenance Incentives

**Creating** new content is:
- Rewarded (publication, views, engagement)
- Visible (new things attract attention)
- Exciting (novelty bias)

**Maintaining** existing sources is:
- Unrewarded (no credit for upkeep)
- Invisible (good maintenance isn't noticed)
- Boring (no novelty)

This asymmetry means: **copies proliferate while sources decay**.

LLMs amplify this by making creation trivially easy while doing nothing for maintenance. The incentive gap widens.

---

## Part IV: Costs of the Current Trajectory

### Cost 1: Epistemic Pollution

When derivative content floods information spaces:
- Signal-to-noise ratio plummets
- Finding authoritative sources becomes harder
- Trust in any particular source declines
- "Truth" becomes a matter of volume, not validity

We're already seeing this: search results contaminated with AI-generated content, circular citations where AI cites AI, "facts" that exist only because an LLM hallucinated them and they were indexed.

### Cost 2: Maintenance Debt

Every copy is a maintenance liability:
- Source changes, copies become stale
- Stale copies mislead users
- Correcting copies costs effort
- Some copies can't be found or updated

At civilizational scale, we're accumulating **maintenance debt** faster than we can service it.

### Cost 3: Authority Collapse

When authoritative sources are buried under derivatives:
- Expertise is indistinguishable from plausible-sounding nonsense
- Institutions lose their epistemic function
- "Do your own research" becomes impossible (no way to trace to source)
- Consensus fragments into incompatible "truth" pools

### Cost 4: Coordination Failure

Shared knowledge enables coordination:
- We can plan together because we share facts
- Contracts work because terms have shared meaning
- Science progresses because findings accumulate

When facts fragment:
- Coordination becomes costly (must verify everything)
- Trust becomes scarce (can't assume shared reality)
- Collaboration becomes difficult (which version are we using?)

---

## Part V: Value of Canonical References

### Value 1: Coordination Efficiency

A shared source of truth reduces coordination costs:
- Everyone references the same data
- Disagreements can be resolved by checking source
- Updates propagate through references
- No need to reconcile conflicting copies

This is the value of standards, registries, and authoritative databases.

### Value 2: Accountability and Correction

Canonical sources have:
- Known maintainers
- Correction mechanisms
- Version history
- Audit trails

When errors occur (they will), they can be fixed *once* and the fix propagates.

### Value 3: Composability with Integrity

If compositions reference rather than duplicate:
- Derived works stay current
- Lineage is traceable
- Updates flow through
- Truth is preserved in transformation

This is the difference between:
- Copying a statistic into your document (snapshot, will diverge)
- Referencing a live data source (current, stays accurate)

### Value 4: Epistemic Infrastructure

Canonical sources are **epistemic infrastructure**—the shared foundation that enables knowledge to function socially.

Like physical infrastructure (roads, grids, pipes), epistemic infrastructure:
- Enables activity that couldn't otherwise happen
- Is underinvested because benefits are diffuse
- Degrades without maintenance
- Is most noticed when it fails

---

## Part VI: Incentive Structures

### Current Incentives (Misaligned)

| Actor | Incentive | Effect on DRY |
|-------|-----------|---------------|
| Content creators | Engagement, views | Produce new, don't maintain |
| Platforms | Time-on-site, ads | Maximize content volume |
| LLM providers | Usage, capability demonstration | Generate freely, no source |
| Users | Convenience, speed | Accept copies, skip verification |
| Maintainers | None (invisible work) | Underfunded, burned out |

The system **rewards duplication and penalizes maintenance**.

### Needed Incentive Shifts

**For creators**:
- Credit for maintaining authoritative sources
- Citation metrics that value being referenced
- Reputation systems tied to accuracy over time

**For platforms**:
- Quality metrics alongside quantity
- Canonical source promotion
- Duplicate detection and linking

**For LLM providers**:
- Grounding in authoritative sources
- Citation requirements in outputs
- Fact-checking integration
- Liability for propagating errors?

**For users**:
- Tools that surface sources
- Friction for unverified claims
- Rewards for verification behavior

**For maintainers**:
- Direct funding for curation
- Recognition and status
- Sustainable institutional support

### The Public Good Problem

Canonical data sources are **public goods**:
- Non-excludable (hard to prevent access)
- Non-rivalrous (use doesn't deplete)

Public goods are underproduced by markets. This is why we have:
- Government statistical agencies
- Publicly funded research
- Nonprofit standards bodies

The LLM era may require **new epistemic public goods institutions**—entities funded to maintain authoritative sources that LLMs and users can reference.

---

## Part VII: Coordination Costs and Value

### The Cost of Not Coordinating

Without shared sources of truth:
- Every actor must verify independently (N times the work)
- Disagreements can't be resolved by reference
- Collaboration requires extensive reconciliation
- Trust is expensive to establish

This is the **coordination tax** of fragmented data.

### The Cost of Coordinating

Establishing shared sources requires:
- Agreement on what's authoritative
- Governance for maintenance
- Standards for access and update
- Enforcement of reference practices

These are **coordination costs**—real effort to establish and maintain shared infrastructure.

### The Value Equation

Net value of canonical reference = (Coordination tax avoided) - (Coordination costs to establish)

For high-use, high-stakes data (financial records, legal status, scientific findings):
- Coordination tax is huge (everyone needs it, errors are costly)
- Coordination cost is worth paying
- Canonical sources are clearly valuable

For low-use, low-stakes data:
- Coordination tax is small
- Coordination cost may exceed benefit
- Duplication may be acceptable

### The LLM Shift

LLMs change the equation by:
- Massively increasing copy volume (more coordination tax)
- Reducing copy creation cost (more duplication)
- Not reducing coordination cost (still hard to establish authority)

The gap widens. Canonical sources become more valuable, but the incentives to create them don't improve.

---

## Part VIII: Technical Approaches

### Content-Addressable Storage

**Concept**: Data identified by hash of content, not location.
- Same content always has same address
- Copies are automatically deduplicated
- References are to content, not copies

**Examples**: IPFS, Git, content-addressed databases

**Benefit**: Duplication becomes reference. Storing the "same" data twice is impossible; you just have two pointers to one content.

**Limitation**: Doesn't solve the authority problem. Many hashes can exist; which is "true"?

### Signed Data and Verifiable Credentials

**Concept**: Data cryptographically signed by issuing authority.
- Signature proves provenance
- Tampering is detectable
- Authority is verifiable

**Examples**: X.509 certificates, verifiable credentials, signed API responses

**Benefit**: Copies can be verified against authority. Even if duplicated, signature traces to source.

**Limitation**: Requires trust in signers. Who decides who's authoritative?

### Linked Data and Semantic Web

**Concept**: Data with explicit relationships and shared ontologies.
- URIs identify things
- Relationships are typed
- Meaning is explicit

**Examples**: RDF, JSON-LD, schema.org, knowledge graphs

**Benefit**: Composition with preserved semantics. References instead of copies.

**Limitation**: Adoption is limited. Creating and maintaining linked data is effortful.

### LLM Grounding and Citation

**Concept**: LLMs that ground claims in verifiable sources.
- Retrieval-augmented generation (RAG)
- Explicit citation in outputs
- Confidence calibration
- Source verification

**Examples**: Perplexity, Bing Chat with citations, custom RAG systems

**Benefit**: Outputs trace to sources. Users can verify.

**Limitation**: Quality of retrieval limits quality of grounding. Citations can still be wrong.

### Version Control for Data

**Concept**: Track changes over time with full history.
- Every change recorded
- Previous states recoverable
- Divergent copies can be reconciled

**Examples**: Git (for code), Dolt (for databases), data versioning systems

**Benefit**: Temporal dimension preserved. "Which version?" becomes answerable.

**Limitation**: Not all data fits version control models. Merge conflicts in data are hard.

---

## Part IX: Governance and Institutions

### What Authoritative Looks Like

An authoritative source has:
1. **Legitimacy**: Recognized right to declare truth
2. **Competence**: Capability to maintain accuracy
3. **Accountability**: Responsibility for errors
4. **Accessibility**: Available to those who need it
5. **Transparency**: Methods and changes visible
6. **Stability**: Persistent over time

### Existing Models

**Government registries**: Birth records, property titles, corporate filings
- Legitimacy from law
- Accountability through politics
- Funding through taxes

**Scientific journals**: Peer-reviewed findings
- Legitimacy from peer review
- Accountability through retraction
- Funding through subscriptions, grants

**Standards bodies**: Technical specifications (ISO, W3C, IETF)
- Legitimacy from adoption
- Accountability through process
- Funding through membership

**Professional associations**: Best practices, certifications
- Legitimacy from expertise
- Accountability through membership
- Funding through dues

### Gaps in Current Institutions

Existing institutions don't cover:
- Real-time data (events, prices, status)
- Aggregate data (statistics, trends)
- Informal knowledge (how-to, cultural)
- Personal data (your data about you)
- AI-generated content (who's responsible?)

These are precisely the areas where LLM-driven duplication is exploding.

### Possible New Institutions

**Data trusts**: Fiduciary management of shared data
- Accountable to beneficiaries
- Funded by data value generated
- Governed by stakeholders

**Epistemic cooperatives**: Member-owned sources of truth
- Democratic governance
- Distributed maintenance
- Shared benefit

**Public data utilities**: Government-provided authoritative data
- Tax-funded
- Universally accessible
- Legally authoritative

**Decentralized attestation networks**: Consensus-based truth
- No single authority
- Reputation-weighted agreement
- Cryptographic verification

---

## Part X: Practical Tradeoffs

### When to Duplicate

Duplication is acceptable when:
- Access to source is unreliable (offline use, latency)
- Source may disappear (archival, resilience)
- Transformation is needed (format conversion, summarization)
- Privacy requires separation (local-only data)
- Cost of reference exceeds cost of copy

But duplicate consciously:
- Note the source and timestamp
- Plan for update/reconciliation
- Accept divergence as technical debt

### When to Reference

Reference rather than copy when:
- Source is reliable and persistent
- Currency matters (need latest)
- Accountability matters (who said this?)
- Maintenance burden is high
- Multiple parties need same data

Build systems that:
- Prefer references to copies
- Cache rather than duplicate (time-limited copies)
- Update references when sources change
- Surface lineage to users

### When to Create New Sources

Create new authoritative sources when:
- No adequate source exists
- Existing sources are unreliable
- Aggregation creates new value
- Your context requires distinct truth

But accept the responsibility:
- Commit to maintenance
- Establish governance
- Document methods
- Enable verification

---

## Part XI: The LLM Design Space

### Current State: Untethered Generation

Most LLM deployments:
- Generate without grounding
- Assert without citation
- Produce derivatives without lineage
- Create copies that float free

This maximizes capability demonstration but undermines epistemic infrastructure.

### Better State: Grounded Generation

LLMs designed for epistemic health would:
- Ground claims in verifiable sources
- Cite authorities for factual claims
- Distinguish known facts from inference/opinion
- Refuse to assert without basis
- Expose uncertainty explicitly

### Best State: Infrastructure-Aware Generation

LLMs as **good citizens of epistemic infrastructure**:
- Consume from authoritative sources
- Produce with traceable lineage
- Contribute to source improvement (feedback, corrections)
- Respect canonical boundaries (don't assert beyond source)
- Support rather than undermine shared truth

This requires:
- Technical integration with authoritative sources
- Incentive alignment for LLM providers
- User demand for grounded outputs
- Institutional support for canonical sources

---

## Part XII: A Path Forward

### For Individuals

- Prefer sources over derivatives
- Verify before trusting LLM outputs
- Demand citations
- Support authoritative institutions
- Practice epistemic hygiene

### For Organizations

- Establish internal sources of truth
- Reference rather than copy where possible
- Maintain data lineage
- Fund data curation
- Use LLMs with grounding

### For LLM Developers

- Build grounding into systems
- Require citations for factual claims
- Integrate with authoritative sources
- Expose uncertainty
- Design for epistemic health, not just capability

### For Policymakers

- Fund epistemic public goods
- Establish liability for AI-propagated misinformation
- Support open authoritative data
- Create incentives for maintenance
- Regulate against epistemic pollution

### For Society

- Recognize epistemic infrastructure as infrastructure
- Value curation and maintenance
- Resist the creation bias
- Invest in shared truth
- Preserve the commons against copy inflation

---

## Conclusion: The Platonic Ideal in Practice

The Platonic intuition is correct: **truth is singular**. There is one fact about how many people live in a city, one fact about when a treaty was signed, one fact about the melting point of iron.

Copies are useful—they make truth accessible, adaptable, resilient. But they are not truth itself. They are shadows that should point to, not replace, the form.

LLMs threaten to flood us with shadows untethered from forms—plausible-seeming content with no ground in authoritative sources. The cost is epistemic: we lose the ability to know what's true, to coordinate on shared facts, to hold anyone accountable for claims.

The response is not to reject LLMs but to **integrate them with epistemic infrastructure**:
- Canonical sources that LLMs can reference
- Grounding requirements in LLM design
- Incentives for maintenance over creation
- Institutions that preserve shared truth
- Technical systems that trace lineage

DRY for data means: **don't proliferate copies without connection to source**. In an age of generative AI, this is harder than ever—and more important than ever.

The forms exist. Our task is to keep pointing to them, even as the shadows multiply.

---

## Further Reading

- **Hunt, A. & Thomas, D.** *The Pragmatic Programmer* (1999) — Origin of DRY principle
- **Berners-Lee, T.** *Weaving the Web* (1999) — Vision for linked data
- **Floridi, L.** *The Philosophy of Information* (2011) — Information ontology
- **Zuboff, S.** *The Age of Surveillance Capitalism* (2019) — Data as power
- **O'Neil, C.** *Weapons of Math Destruction* (2016) — Algorithmic accountability
- **Pasquale, F.** *The Black Box Society* (2015) — Transparency and accountability
- **Benkler, Y.** *The Wealth of Networks* (2006) — Commons-based production
- **Ostrom, E.** *Governing the Commons* (1990) — Collective management of shared resources
- **Swartz, A.** Various writings on open access and linked data
- **W3C** — Linked Data principles and standards
