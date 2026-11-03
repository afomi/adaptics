# Linked Data: Technical Strategies for DRY in the Generative Age

*From the perspective of a Creative Technologist*

## The Challenge, Restated

We need systems where:
1. **Data flows freely** (composability, accessibility)
2. **Sources remain connected** (lineage, authority)
3. **Updates propagate** (currency, consistency)
4. **Actors are incentivized** (sustainable maintenance)

LLMs broke the implicit social contract where effort-to-create constrained duplication. Now creation is free, but connection is still expensive. We need to **invert that ratio**: make connection cheap and disconnection expensive.

---

## Part I: Content-Addressable Everything

### The Core Primitive

**Content-addressing** means: the address of data IS its cryptographic hash.

```
address = hash(content)
```

Same content → same address, always. Different content → different address, always.

This gives us:
- **Automatic deduplication**: Store "the same thing" twice? You get one copy with two pointers.
- **Integrity verification**: Content at address X must hash to X, or it's corrupt/tampered.
- **Immutable references**: A link to a hash is a link to *that exact content* forever.

### IPFS as Foundation

IPFS (InterPlanetary File System) already does this:
```
ipfs add my-document.txt
> added QmXnnyufdzAWL5CqZ2RnSNgPbvCc1ALT73s6epPrRnZ1Xy my-document.txt
```

That `Qm...` hash IS the content. Anyone with the hash can verify they have the real thing.

### The Missing Layer: Mutable Pointers

Content-addressing solves integrity but creates a problem: content changes, but hashes don't.

**Solution**: IPNS (InterPlanetary Name System) and similar schemes.

```
/ipns/k51qzi5uqu5... → /ipfs/QmXnnyuf... (current version)
```

A stable name points to the current content hash. Update the content, update the pointer, but the name stays stable.

**Better solution**: DNS-style names that resolve to content addresses.

```
data.example.org/population/us/2024 → ipfs://QmABC123...
```

Human-readable, institutionally controlled, content-verified.

### Incentive Angle

**Problem**: Running IPFS nodes costs compute and bandwidth. Who pays?

**Solutions**:
- **Filecoin**: Pay to store, earn by storing. Economic layer on IPFS.
- **Pinning services**: SaaS model for persistence (Pinata, Infura).
- **Protocol incentives**: Built-in rewards for serving popular content.

**Novel idea**: **Canonical Source Staking**

If you claim to be THE authoritative source for some data:
1. Stake tokens on that claim
2. If your data is verified as accurate, you earn fees when referenced
3. If your data is shown to be wrong, you lose stake

This creates **economic skin in the game for accuracy**.

---

## Part II: Signed Data Graphs

### Beyond Files: Structured Claims

Content-addressing works for blobs. But data is often **structured claims**:

```json
{
  "subject": "United States",
  "predicate": "population",
  "object": 331900000,
  "asOf": "2024-01-01",
  "source": "census.gov"
}
```

This is a **triple** (subject-predicate-object) with metadata. The Semantic Web got this right conceptually but failed on adoption.

### Verifiable Credentials Model

W3C Verifiable Credentials give us:
```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential", "StatisticalClaim"],
  "issuer": "did:web:census.gov",
  "issuanceDate": "2024-01-15",
  "credentialSubject": {
    "id": "did:geo:us",
    "population": 331900000,
    "asOf": "2024-01-01"
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "verificationMethod": "did:web:census.gov#keys-1",
    "proofValue": "z58DAdFfa9SkqZMVPxAQp..."
  }
}
```

Now we have:
- **Issuer identity**: Cryptographically verified source
- **Claim content**: Structured, queryable
- **Proof**: Can't be forged or tampered
- **Timestamp**: When the claim was made

### Graph of Signed Claims

Build up a **knowledge graph** where every edge is a signed claim:

```
(US) --[population: 331.9M, signed by census.gov]--> (StatisticalFact)
(StatisticalFact) --[methodology: decennial-census]--> (Methodology)
(Methodology) --[documentation]--> ipfs://QmMethodologyDoc...
```

Queries can specify trust requirements:
```sparql
SELECT ?population WHERE {
  ?country :population ?population .
  ?population :signedBy ?issuer .
  FILTER (?issuer IN (census.gov, un.org, worldbank.org))
}
```

### Incentive Angle

**Problem**: Creating signed claims is more work than just stating things.

**Solutions**:

**Micropayments for citations**:
When an LLM (or any system) references your signed claim, you get paid. Tiny amount, but at scale it adds up.

```
Query: "US population"
→ Resolves to claim signed by census.gov
→ census.gov earns $0.0001
→ At 1B queries/day = $100K/day for maintaining authoritative data
```

**Reputation staking**:
Issuers stake reputation. Claims that hold up over time earn reputation. Claims that are refuted lose reputation. Reputation translates to:
- Priority in search results
- Higher micropayment rates
- Trust signals in UIs

**Credential marketplaces**:
Organizations can sell access to verified credentials:
- Free tier: Basic access, rate-limited
- Paid tier: Bulk access, real-time updates, premium SLAs

---

## Part III: Transclusion, Not Quotation

### The Ted Nelson Vision

Ted Nelson (inventor of hypertext) distinguished:
- **Quotation**: Copy content, paste elsewhere, lose connection
- **Transclusion**: Include by reference, content stays connected

```html
<!-- Quotation (bad) -->
<p>The population of the US is 331.9 million.</p>

<!-- Transclusion (good) -->
<p>The population of the US is <transclude src="census.gov/us/population" />.</p>
```

With transclusion:
- Source updates → all inclusions update
- Click the inclusion → go to source
- Source goes away → inclusion shows error (not stale data)

### Technical Implementation

**Server-side transclusion**:
```html
<data-include
  src="https://api.census.gov/data/2024/population/us"
  format="number"
  fallback="[population unavailable]"
  cache="1h"
  signed-by="did:web:census.gov">
</data-include>
```

Renderer fetches, verifies signature, displays. Caches for performance but revalidates.

**Client-side transclusion** (Web Component):
```javascript
class DataInclude extends HTMLElement {
  async connectedCallback() {
    const src = this.getAttribute('src');
    const signer = this.getAttribute('signed-by');

    const { data, signature, valid } = await fetchVerified(src, signer);

    if (valid) {
      this.innerHTML = formatData(data);
      this.classList.add('verified');
    } else {
      this.innerHTML = this.getAttribute('fallback') || '[unverified]';
      this.classList.add('unverified');
    }
  }
}
customElements.define('data-include', DataInclude);
```

### LLM Integration

LLMs should output transclusions, not quotations:

**Current (bad)**:
```
The population of the United States is approximately 331.9 million.
```

**Better (good)**:
```
The population of the United States is <ref src="census.gov/population/us/2024" verified="true">331,900,000</ref>.
```

The ref tag:
- Links to source
- Shows current value at render time
- Can revalidate
- Carries verification status

### Incentive Angle

**Display incentives**:
Browsers/readers could show visual indicators:
- ✓ Green: Verified, current source
- ⚠ Yellow: Cached, may be stale
- ✗ Red: Unverified or source unavailable
- 📋 Gray: Quotation, no source

Users learn to trust green, distrust gray. **Social pressure toward transclusion**.

**Platform incentives**:
Publishing platforms (Medium, Substack, etc.) could:
- Boost content with verified transclusions in rankings
- Show "source quality score" on articles
- Require transclusion for factual claims in certain categories

**Author incentives**:
- Transcluded content is automatically updated (less maintenance)
- Verification badges for content with high transclusion rates
- Liability protection ("I transcluded authoritative source")

---

## Part IV: Diff-Aware Derivations

### The Problem with Transformations

Real use cases require transformation:
- Summarization
- Translation
- Format conversion
- Contextualization

These create derivatives. How do we maintain connection?

### Operational Transformation

Represent derivations as **operations on sources**:

```json
{
  "source": "ipfs://QmOriginalDoc...",
  "operations": [
    {"op": "extract", "selector": "section.methodology"},
    {"op": "summarize", "model": "gpt-4", "maxLength": 200},
    {"op": "translate", "to": "es"}
  ],
  "result": "ipfs://QmDerivedDoc...",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

Now we have:
- **Lineage**: Where did this come from?
- **Reproducibility**: Run operations again on updated source
- **Transparency**: What transformations were applied?

### Merkle DAG of Derivations

Build a directed acyclic graph where:
- Nodes are content (addressed by hash)
- Edges are operations (also content-addressed)

```
QmOriginal
  → [summarize] → QmSummary
  → [translate:es] → QmSpanish
  → [extract:methodology + summarize] → QmMethodSummary
```

Any node can be traced back to its sources.

### Regeneration on Source Update

When source updates:
1. System detects new version at canonical pointer
2. Traces all derivations that depend on old version
3. Offers to regenerate with same operations on new source
4. Or flags as "derived from stale source"

```
⚠ This summary was generated from census.gov data as of 2023-01-01.
   Source has been updated (2024-01-15).
   [Regenerate] [Keep stale] [View diff]
```

### Incentive Angle

**Regeneration services**:
Pay-per-regeneration. Your derivative content stays fresh for a fee.

```
Subscription: Keep my 50 blog posts updated with fresh sources
Cost: $5/month
Service: Monitors sources, regenerates derivatives, notifies of changes
```

**Derivative marketplaces**:
High-quality derivations (good summaries, accurate translations) are valuable.

```
"This Spanish translation of the WHO guidelines was derived from
 the official English source (verified) using certified translator
 Maria Garcia, accuracy score 98%."

 License: $0.10/access or $100/year unlimited
```

**Staleness penalties**:
Platforms penalize stale derivatives:
- Drop in search rankings over time
- Visual decay indicators ("last verified 6 months ago")
- Automatic archival of abandoned derivatives

---

## Part V: LLM-Native Citation Infrastructure

### The Citation Layer

Every LLM should have a **citation layer** between generation and output:

```
┌─────────────────────────────────────────────┐
│ User Query                                  │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ Retrieval: Find relevant authoritative      │
│ sources from knowledge graph                │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ Generation: Produce response grounded in    │
│ retrieved sources                           │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ Citation Layer: Map claims to sources,      │
│ verify consistency, attach proofs           │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ Output: Response with inline citations,     │
│ confidence scores, source links             │
└─────────────────────────────────────────────┘
```

### Claim Decomposition

LLM outputs decompose into **atomic claims**:

```
Input: "Tell me about France"

Output (internal representation):
[
  {claim: "France is a country", source: "wikidata:Q142", confidence: 0.99},
  {claim: "Capital is Paris", source: "wikidata:Q90", confidence: 0.99},
  {claim: "Population ~67M", source: "insee.fr/pop/2024", confidence: 0.95},
  {claim: "Known for cuisine", source: null, confidence: 0.7, type: "common knowledge"},
  {claim: "Eiffel Tower is iconic", source: null, confidence: 0.8, type: "cultural"}
]
```

Claims with sources are grounded. Claims without sources are flagged.

### Citation Protocols

Standardized protocols for LLM ↔ Source interaction:

**Query protocol**:
```
GET /claims?subject=France&predicate=population
Accept: application/ld+json
X-Require-Signature: true
X-Max-Age: 86400
```

**Response**:
```json
{
  "@context": "https://schema.org",
  "claim": {
    "subject": "wd:Q142",
    "predicate": "population",
    "value": 67390000,
    "asOf": "2024-01-01"
  },
  "signature": "...",
  "issuer": "did:web:insee.fr",
  "cacheUntil": "2024-06-01"
}
```

**Payment protocol** (integrated):
```
X-Payment-Channel: lightning:lnbc1...
X-Payment-Amount: 100 sats
```

Micropayment attached to query. Source earns for serving authoritative data.

### Incentive Angle

**LLM providers pay for grounding**:
Better grounding = better outputs = more users = more revenue.

Business model:
- LLM provider pays sources for citations
- Passes cost to users (or absorbs for premium UX)
- Sources earn proportional to citation frequency

**Quality competition among sources**:
Multiple sources may offer same data type:
- census.gov: Population data, high trust, $0.001/query
- wikipedia: Population data, medium trust, free
- random-blog: Population data, low trust, free

LLMs (and users) choose based on trust/cost tradeoff. **Market for authoritative data emerges**.

**Claim bounties**:
Want authoritative data on something obscure? Post a bounty.

```
BOUNTY: Verified daily PM2.5 readings for Ulaanbaatar, Mongolia
Reward: $500 for first verified source maintaining 1-year history
Verification: Cross-check with WHO standards, signature from recognized monitor
```

---

## Part VI: Social Verification Layer

### Beyond Cryptographic Verification

Cryptography proves **who said something**. It doesn't prove **whether it's true**.

For truth, we need social layers:
- Expert attestation
- Community verification
- Prediction market validation
- Replication/reproduction

### Attestation Networks

Experts stake reputation on claims:

```json
{
  "attestation": {
    "claim": "ipfs://QmClaimAboutClimate...",
    "attester": "did:orcid:0000-0001-2345-6789",
    "credentials": ["PhD Climate Science", "IPCC Author"],
    "statement": "I have reviewed this claim and find it consistent with current scientific consensus.",
    "confidence": 0.9,
    "stake": 100
  },
  "signature": "..."
}
```

Aggregated attestations create **trust scores**:
- 5 climate scientists attested (avg confidence 0.85) → high trust
- 2 random accounts attested → low trust
- 1 expert contested → disputed

### Prediction Markets for Facts

For verifiable claims, prediction markets can provide truth discovery:

```
Market: "US GDP growth Q1 2024 will be reported as > 2%"
Resolution: Official BEA release
Current price: $0.65 (implies 65% probability)
```

After resolution:
- Correct predictors earn
- Incorrect predictors lose
- Market price history becomes signal of claim uncertainty

### Replication Registries

For scientific claims:

```json
{
  "original": "doi:10.1234/original-study",
  "replications": [
    {"doi": "10.5678/replication-1", "result": "confirmed", "lab": "MIT"},
    {"doi": "10.9012/replication-2", "result": "partial", "lab": "Oxford"},
    {"doi": "10.3456/replication-3", "result": "failed", "lab": "Stanford"}
  ],
  "replicationScore": 0.67,
  "status": "partially replicated"
}
```

LLMs can weight claims by replication status.

### Incentive Angle

**Attestation rewards**:
Attesters earn when their attested claims hold up, lose when refuted.

Long-term, accurate attesters build valuable reputation → can charge for attestations.

**Market maker rewards**:
Prediction market liquidity providers earn spreads → incentive to create markets for important claims.

**Replication funding**:
Automated systems identify high-impact, low-replication claims → fund replication attempts.

```
This claim has 1000 citations but 0 replications.
Replication bounty: $50,000
Funded by: Scientific Integrity DAO
```

---

## Part VII: Economic Primitives

### Attention Markets

Attention is scarce. Sources compete for it. Currently competition is based on engagement (clickbait wins).

**Alternative**: Attention markets where quality competes.

```
User: "What's the US population?"

Auction (invisible, milliseconds):
- census.gov bids $0.001 (authoritative, verified)
- wikipedia bids $0.0005 (good, community-maintained)
- random-seo-site bids $0.01 (high bid, low quality)

Quality-adjusted ranking:
1. census.gov (high quality × low bid = best value)
2. wikipedia (medium quality × very low bid = good value)
3. random-seo-site (low quality × high bid = poor value)
```

Users get quality. Sources earn for quality. Spam is economically unviable.

### Data DAOs

Decentralized Autonomous Organizations for data maintenance:

```
ClimateDataDAO:
- Mission: Maintain authoritative climate data
- Funding: Grants, subscriptions, citation fees
- Governance: Token-weighted voting by contributors
- Contributors: Scientists, maintainers, validators
- Outputs: Signed datasets, verified claims, API access
```

DAOs can:
- Pool resources for expensive data collection
- Distribute maintenance across many contributors
- Create sustainable funding for public goods
- Maintain independence from capture

### Futarchy for Data Governance

Use prediction markets to govern data decisions:

```
Proposal: Add satellite imagery source X to our land use dataset
Market: "If we add source X, our accuracy score will improve"
If market predicts improvement → add source
If market predicts decline → reject
```

Decisions are made by those with skin in the game (market participants) rather than politics.

---

## Part VIII: Developer Experience

### Making It Easy

All this infrastructure is useless if it's hard to use. Developer experience must be **radically simple**.

### SDK Design

```javascript
import { LinkedData } from '@linked-data/sdk';

// Initialize with identity and payment channel
const ld = new LinkedData({
  identity: 'did:web:myapp.com',
  payment: process.env.LIGHTNING_CHANNEL,
});

// Fetch verified data (handles signatures, caching, payment)
const population = await ld.get('census.gov/population/us/2024');
console.log(population.value); // 331900000
console.log(population.verified); // true
console.log(population.source); // 'did:web:census.gov'
console.log(population.cost); // 0.0001 USD

// Create signed claim
const myClaim = await ld.claim({
  subject: 'did:geo:us',
  predicate: 'gdp-growth-q1-2024',
  value: 0.023,
  evidence: 'ipfs://QmMyAnalysis...',
});
await ld.publish(myClaim);

// Subscribe to updates
ld.subscribe('census.gov/population/*', (update) => {
  console.log('Population updated:', update);
  regenerateMyDerivatives(update);
});
```

### LLM Integration

```python
from linked_llm import GroundedLLM

llm = GroundedLLM(
    model="gpt-4",
    sources=["census.gov", "who.int", "wikidata.org"],
    require_citation=True,
    max_ungrounded_claims=0,
    payment_budget=0.10,  # USD per query
)

response = llm.query("What is the population and life expectancy in Japan?")

print(response.text)
# "Japan has a population of 125.1 million[1] and a life expectancy of 84.3 years[2]."

print(response.citations)
# [1]: {source: "census.go.jp", claim: "...", verified: True}
# [2]: {source: "who.int", claim: "...", verified: True}

print(response.cost)
# 0.0023 USD (0.002 LLM + 0.0003 citations)
```

### CMS/Publishing Integration

WordPress plugin, Ghost integration, etc.:

```
[linked-data source="census.gov/population/us" format="number" /]
```

Renders as:
```
331,900,000 ✓
└─ Source: U.S. Census Bureau (verified)
└─ Updated: Jan 2024
└─ [Refresh] [View source]
```

When source updates, content updates. No manual maintenance.

### Incentive Angle

**Developer incentives**:
- Easier than copying (SDK handles everything)
- Cheaper than maintaining (updates are automatic)
- Better UX (verification badges, freshness indicators)
- Legal protection (cited sources, not assertions)

**Platform incentives**:
- SEO benefits for linked content (Google could rank this higher)
- Trust signals increase engagement
- Reduced moderation burden (verified ≠ misinformation)

---

## Part IX: Migration Path

### From Here to There

We can't rebuild the internet. We need migration paths.

### Phase 1: Shadow Infrastructure

Build the new alongside the old:
- Content-addressed mirrors of authoritative sources
- Verification layers on existing APIs
- Citation plugins for existing LLMs
- Opt-in transclusion for early adopters

No one has to change. New capabilities are additive.

### Phase 2: Incentive Gradients

Create economic pressure toward the new:
- Platforms boost linked content
- Search engines rank verified higher
- LLM providers offer discounts for grounded queries
- Insurance/liability benefits for cited content

Actors choose the new because it's better, not because it's mandated.

### Phase 3: Network Effects

Tipping point dynamics:
- Enough sources are linked that linking is default
- Enough consumers expect linking that non-linked is suspicious
- Enough infrastructure exists that custom solutions are unnecessary

The old way becomes technical debt that everyone wants to retire.

### Phase 4: New Equilibrium

Linked data is just "data." Unlinked data is anomalous.
- New content is born linked
- Legacy content is gradually migrated or deprecated
- Institutions are funded to maintain canonical sources
- LLMs are grounded by default

---

## Part X: What We Build First

### Minimum Viable Linked Data

1. **Content-addressed storage layer** (IPFS or similar)
   - Any data can be stored and addressed by hash
   - Persistence through economic incentives

2. **Identity and signing** (DIDs + VCs)
   - Issuers have verifiable identities
   - Claims are cryptographically signed

3. **Resolution protocol**
   - Human-readable names → content addresses
   - Includes signature verification
   - Supports micropayments

4. **SDK for developers**
   - Radically simple API
   - Handles all complexity internally
   - Works with existing stacks

5. **LLM integration**
   - RAG with verified sources
   - Citation in outputs
   - Quality-based source selection

6. **Economic layer**
   - Micropayments for citations
   - Staking for claims
   - Markets for attestation

### First Use Cases

**High-value, high-stakes data**:
- Financial data (prices, rates, filings)
- Legal data (statutes, regulations, cases)
- Scientific data (published findings, datasets)
- Government data (statistics, records)

These have:
- Clear authoritative sources
- High cost of errors
- Existing demand for verification
- Willingness to pay

Start here. Build trust. Expand.

---

## Conclusion: Making Connection Cheaper Than Copying

The fundamental shift:

| Today | Tomorrow |
|-------|----------|
| Copy is free, connection is expensive | Connection is free, copy is expensive |
| Duplication is default | Reference is default |
| Sources decay | Sources are funded |
| LLMs generate freely | LLMs cite rigorously |
| Trust is scarce | Trust is verified |
| Maintenance is invisible | Maintenance is rewarded |

The technical pieces exist. The incentive designs are feasible. The migration path is clear.

What's needed is **coordination**—actors choosing to build the new rather than patch the old.

The prize is an information ecosystem where:
- Truth is findable
- Sources are sustainable
- Derivatives stay connected
- Actors are accountable
- Knowledge accumulates rather than fragments

We can build this. The question is whether we will.

---

## Appendix: Technical References

### Protocols and Standards
- **IPFS**: https://ipfs.io
- **Filecoin**: https://filecoin.io
- **DIDs**: https://www.w3.org/TR/did-core/
- **Verifiable Credentials**: https://www.w3.org/TR/vc-data-model/
- **JSON-LD**: https://json-ld.org
- **SPARQL**: https://www.w3.org/TR/sparql11-query/

### Existing Projects
- **Ceramic Network**: Mutable streams on IPFS
- **The Graph**: Indexing protocol for blockchain data
- **Ocean Protocol**: Data marketplace
- **Chainlink**: Oracle network for real-world data
- **Perplexity**: LLM with citations
- **Hypothes.is**: Web annotation layer

### Research
- Nelson, T. "Literary Machines" (transclusion concept)
- Berners-Lee, T. "Linked Data Principles"
- Sporny, M. et al. "Verifiable Credentials Data Model"
- Benet, J. "IPFS - Content Addressed, Versioned, P2P File System"
