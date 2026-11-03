# Wiki Entities: NER-Seeded Topics for an Elixir Wiki

## The Idea

spaCy's named entity recognition extracts structured mentions from unstructured text: people, organizations, places, laws, events. These map naturally to wiki topics. Upload a batch of city council documents and the system surfaces a web of interconnected pages — "Portland", "Mary Johnson", "S.B. 275", "Parks Committee" — before anyone writes a single wiki entry.

The entity becomes the seed. The wiki page grows around it.

## Entity Types as Topic Categories

spaCy's `en_core_web_sm` model recognizes 18 entity types. Not all are useful as wiki topics. The ones that map well:

| spaCy Type | Wiki Category | Example |
|------------|---------------|---------|
| PERSON | People | "Mary Johnson", "Ward Cunningham" |
| ORG | Organizations | "Portland City Council", "EPA" |
| GPE | Places (political) | "Portland", "Oregon" |
| LOC | Places (physical) | "Willamette River", "Mt. Hood" |
| FAC | Facilities | "Pioneer Courthouse Square" |
| LAW | Legislation | "S.B. 275", "Clean Air Act" |
| EVENT | Events | "2024 Budget Hearing" |
| WORK_OF_ART | Works | Referenced reports, publications |
| NORP | Groups | "Democrats", "Methodists" |
| PRODUCT | Products | Named systems, tools |

Types like DATE, TIME, MONEY, PERCENT, CARDINAL, ORDINAL, QUANTITY are metadata — useful as document attributes but not as standalone topics.

## The False Match Problem

NER is imperfect. Real output from government documents includes:

- **Truncated references**: "S.B. 275 65" (bill number with a page number stuck on)
- **Name fragments**: "Paul A. Cutler 2" (name with a footnote marker attached)
- **Over-extraction**: "Section 4" tagged as a work of art
- **Under-extraction**: acronyms like "DEQ" missed entirely

This is a feature, not just a bug. It creates a curation workflow:

1. **Extract** — NER runs, entities become candidate topics
2. **Review** — humans confirm, merge, split, or dismiss candidates
3. **Link** — confirmed topics become wiki pages, cross-referenced with source documents

The wiki page for "Paul A. Cutler" starts as an auto-generated stub showing every document that mentions him. A human cleans up the false match ("Paul A. Cutler 2"), adds context, and now there's a living page that grows with each new document upload.

## Instiki's Vibe

Instiki (Jacques Distler's Ruby wiki) had qualities worth preserving:

- **Self-contained**: install Ruby, run one command, you have a wiki. No database setup, no configuration ritual. The tool gets out of the way.
- **Batteries included**: built-in web server, revision history, RSS, multiple markup syntaxes (Markdown, Textile, RDoc). Everything works on first boot.
- **Academic sensibility**: first-class LaTeX/MathML support. The nLab mathematics wiki ran on an Instiki fork. It treated structured knowledge seriously without being enterprise software.
- **Webs**: multiple independent wiki namespaces in one instance, each with its own access controls. A "web" for public documents, another for internal notes.
- **Pretty by default**: clean, readable pages. The emphasis was on content, not chrome.

For an Elixir wiki, the equivalent would be:

- Phoenix LiveView for real-time collaborative editing — no JavaScript framework, just the server pushing updates
- Markdown with optional LaTeX (KaTeX renders fast)
- `mix phx.server` and you're running
- SQLite option for single-user/small-team, Postgres for production
- Webs as first-class concept — each organization or project gets its own namespace

## Ward Cunningham's Federated Wiki

Cunningham's Smallest Federated Wiki (SFW) introduced ideas that are more relevant now than when he built it:

### The Journal

Every page has a **story** (the content you see) and a **journal** (every edit that produced it). The journal is append-only. Edits are paragraph-level, not page-level. Each action records who made it and where.

This is a natural fit for entity-seeded pages. The journal for "Portland City Council" might look like:

```
[auto-created from document: budget_2024.pdf]
[entity: ORG, confidence: 0.95, mentions: 12]
[user: ryan, added context paragraph]
[auto-updated from document: minutes_jan_2025.pdf]
[entity: ORG, new mentions: 3]
[user: ryan, merged with "City Council" topic]
```

Machine actions and human actions live in the same journal. Provenance is always visible.

### The Fork

In federated wiki, you don't edit someone else's page — you **fork** it. Your version diverges. Later, a reader sees both versions and the chorus of voices that shaped the content.

For a document-processing wiki, forking means:
- An organization publishes their entity-extracted topics
- Another organization forks a shared topic ("Portland") and adds their own documents
- Both versions exist, both are valid, readers see the full picture

### The Neighborhood

Your wiki's **neighborhood** is the set of other wiki instances you've interacted with. Pages in your neighborhood can be linked by name alone. You can search across all of them.

This maps to a network of organizations each running their own wiki, sharing topics through federation. The "Portland" page on the city's wiki links naturally to the "Portland" page on the county's wiki and the state's wiki.

## Architecture for an Elixir Wiki

### Entity Pipeline (already built)

```
Document Upload
  → ExtractTextWorker (pdftotext)
  → ExtractEntitiesWorker (spaCy NER)
  → Topic candidates stored as document_attributes
```

### Wiki Layer (to build)

```
Topics
  ├── auto-created from confirmed entities
  ├── manually created by users
  └── forked from federated neighbors

Topic Pages
  ├── story: rendered Markdown content
  ├── journal: append-only edit history
  ├── mentions: documents that reference this entity
  └── related: other topics co-occurring in same documents

Federation
  ├── each instance exposes a sitemap (JSON)
  ├── topics linkable across instances by name
  ├── fork/merge via journal reconciliation
  └── neighborhood discovery through shared topics
```

### Schema Sketch

```elixir
# A wiki topic, potentially seeded by NER
schema "topics" do
  field :title, :string          # "Portland City Council"
  field :slug, :string           # "portland-city-council"
  field :category, :string       # "organization", "person", "place"
  field :web, :string            # namespace: "public", "internal"
  field :story, :map             # structured content paragraphs
  field :journal, {:array, :map} # append-only edit log
  field :forked_from, :string    # URL of upstream federated page
  timestamps()
end

# Links entities in documents to wiki topics
schema "topic_mentions" do
  belongs_to :topic, Topic
  belongs_to :document, Document
  field :mention_count, :integer
  field :context_snippets, {:array, :string}
  timestamps()
end
```

### Entity-to-Topic Flow

1. NER extracts `%{type: "ORG", text: "Portland City Council"}` from a document
2. System checks: does a topic with this title (or a fuzzy match) exist?
3. If yes: add a mention link, update the topic's mention count
4. If no: create a candidate topic in "unreviewed" state
5. User reviews candidates: confirm, merge ("City Council" → "Portland City Council"), or dismiss
6. Confirmed topics become wiki pages with auto-generated content:
   - "Mentioned in 12 documents"
   - "First seen in: budget_2024.pdf"
   - "Co-occurs with: Mary Johnson, Parks Committee, S.B. 275"

### Handling False Matches

The curation UI could support:

- **Merge**: "Paul A. Cutler" and "Paul A. Cutler 2" → single topic
- **Split**: "S.B. 275 65" → "S.B. 275" (legislation) + dismiss "65"
- **Alias**: "DEQ" and "Department of Environmental Quality" → same topic
- **Dismiss**: "Section 4" → not a real topic, ignore
- **Reclassify**: spaCy tagged "Portland" as PERSON → change to GPE

These corrections feed back. Over time, a project-specific normalization layer learns that "S.B." followed by a number is always legislation, that "Cutler" followed by a digit is a footnote artifact.

## Co-occurrence as Linking

The most powerful wiki feature isn't explicit links — it's **co-occurrence**. Two entities mentioned in the same document are related. The more documents they share, the stronger the relationship.

This creates a navigable graph without anyone manually linking pages:

- "Mary Johnson" appears in 8 documents alongside "Parks Committee"
- "S.B. 275" appears in 5 documents alongside "Clean Air Act"
- "Portland" appears in everything, but disproportionately with "Willamette River"

The wiki surfaces these connections automatically. Each topic page shows its strongest co-occurrences. The graph visualization (already built at `/graph`) could render the entity network.

## What This Enables

A small organization uploads their public documents. Without any manual work:

- Every person, organization, place, and law mentioned gets a topic page
- Documents are cross-referenced through shared entities
- A graph shows how topics relate
- New document uploads automatically surface new entities and new connections
- Federation lets organizations share and build on each other's knowledge

This is cybernetic governance infrastructure. Beer's viable system model applied to public knowledge — local autonomy (each org runs their own wiki), shared context (federation), and real-time feedback (new documents update the network).
