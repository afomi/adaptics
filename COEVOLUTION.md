# Coevolution

An exploration of co-evolving characters, platforms, and environments in an omni-game architecture.

## The Core Idea

Games today are closed systems. Your character exists in one game. The engine is fixed. The levels are designed by the studio. You play what's given.

What if instead:
- Your character evolves across games
- The engine itself is modular and evolvable
- Environments are user-created and composable
- Assets and mechanics are reusable primitives

This is the omni-game: not one game, but a substrate for games.

## Three Layers of Coevolution

### 1. Character Evolution

A character is not just stats and appearance. It's a bundle of:
- **Capabilities**: What can this character do? (movement, interaction, creation)
- **History**: Where has this character been? What has it done?
- **Compatibility**: Which engine versions and environments can this character inhabit?

Characters evolve by:
- Gaining new capabilities through play
- Accumulating history that unlocks or restricts access
- Adapting to new engine versions (or choosing not to)

A character from 2024 might not run on a 2030 engine without migration. Or it might—if the owner maintains compatibility. This creates lineages, vintages, legacy characters with unique properties.

### 2. Platform/Engine Evolution

The engine is not a monolith. It's a set of composable modules:
- **Physics**: How things move, collide, interact
- **Rendering**: How things appear
- **Rules**: What's possible, what's prohibited
- **Economy**: How value flows

Engine modules have versions. A character is compatible with specific versions. An environment declares which engine modules it requires.

This creates:
- **Forks**: Someone improves physics, others adopt it or don't
- **Standards**: Common interfaces that allow interoperability
- **Niches**: Specialized engines for specific play styles

The engine coevolves with characters and environments. Popular capabilities drive engine development. New engine features enable new capabilities.

### 3. Environment/Scene Evolution

Environments are not static levels. They're living spaces:
- **Terrain**: The physical substrate
- **Objects**: Things that exist in the space
- **Rules**: Local modifications to engine behavior
- **Inhabitants**: Characters currently present
- **History**: What has happened here

Environments evolve by:
- User modification (building, destroying, transforming)
- Accumulated history (wear, memory, consequence)
- Forking (someone copies and modifies)
- Merging (two environments connect)

## Compatibility as Design Space

The interesting constraint: not everything works everywhere.

A character designed for a physics-heavy engine might be useless in a social/economic environment. An environment built for 2025 rendering might not display correctly on 2020 clients.

This is not a bug. It's the design space.

**Compatibility creates:**
- Scarcity (your vintage character can go places new ones can't)
- Specialization (environments optimize for specific character types)
- Trade (you need someone with X capability to access Y)
- Evolution pressure (adapt or become niche)

## Elegance and Intelligence in Dynamics

The gamespace can't require manual curation of every compatibility question. It needs elegant rules that produce intelligent behavior.

### Possible Approaches

**Semantic Versioning for Everything**
- Characters, engines, environments all have versions
- Compatibility is computed from version constraints
- Breaking changes are explicit

**Capability-Based Matching**
- Characters declare capabilities
- Environments declare requirements
- Matching is dynamic, not version-locked

**Graceful Degradation**
- If a character can't fully operate in an environment, partial function is possible
- You can enter but not manipulate. Observe but not speak.
- Creates spectatorship, tourism, aspiration

**Evolutionary Pressure via Scarcity**
- Popular environments attract characters
- Popular characters attract environment builders
- Feedback loops drive convergence on useful standards
- But niches persist for specialized play

**Forking as First-Class Operation**
- Any environment can be forked
- Any engine module can be forked
- Characters carry their lineage
- Divergence is not failure, it's exploration

## The Omni-Game is a Coordination Problem

What makes this work is not technology. It's coordination.

People must agree (enough) on:
- What a character is
- What an environment declares
- How compatibility is computed
- How value flows across boundaries

This is governance. It's standards bodies. It's rough consensus and running code.

The elegant solution is minimal: define the smallest possible interface that allows interoperability, and let everything else vary.

## Open Questions

- How do you represent a character's capabilities in a way that's machine-readable but human-meaningful?
- How do environments declare their requirements without being brittle?
- How does value (currency, reputation, ownership) cross environment boundaries?
- Who decides when an engine module is "official" vs. a fork?
- How do you prevent capture by a single platform while enabling coordination?
- What's the migration path for a character when engines evolve?

## Relation to Adaptics

The neighborhood scene is a first experiment:
- Figures with identity and connection state
- A shared coordinate system
- Visibility as a function of relationship
- The beginning of "who can see what, and why"

The room/inventory concept extends this:
- Objects exist independent of location
- Placement is an act (moving from inventory to world)
- The interface instantiates the abstract

Coevolution is the longer arc:
- Characters that persist and change
- Environments that users create and modify
- An engine that's not fixed but evolving
- A game that's not designed but cultivated
