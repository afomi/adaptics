# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Initial setup
mix setup                    # Install deps, create DB, run migrations

# Development
mix phx.server               # Start Phoenix server (http://localhost:4000)
iex -S mix phx.server        # Start with interactive Elixir shell

# Database
mix ecto.create              # Create database
mix ecto.migrate             # Run migrations
mix ecto.reset               # Drop, create, migrate, seed

# Testing
mix test                     # Run all tests
mix test path/to/test.exs    # Run single test file
mix test path/to/test.exs:42 # Run specific test at line

# Assets
cd assets && npm install     # Install JS dependencies
mix assets.deploy            # Build assets for production
```

## Architecture Overview

**Phoenix 1.8 + LiveView application** with PostgreSQL database.

### Backend Structure
- `lib/adaptics/` - Business logic contexts
  - `visual/` - Node and Link schemas for graph visualization
  - `user_controls/` - User interaction schemas (Mouse)
  - `tldraw_canvas.ex` - Canvas persistence
- `lib/adaptics_web/` - Web layer
  - `live/` - LiveView modules (DrawLive, DesktopLive, GameBoardLive, ValueStreamLive)
  - `channels/` - WebSocket channels (workflow_room_channel, user_socket)
  - `controllers/` - Traditional controllers (PageController, CanvasController, NodeController, LinkController)

### Frontend Assets (`assets/`)
- Uses esbuild for bundling, TailwindCSS for styling
- Key JS libraries: Three.js (3D), D3 (graphs), tldraw (drawing canvas), BPMN.js (workflow diagrams)
- Phoenix LiveView hooks in various JS files connect to LiveView sockets

### Key Routes
Every page is in the site megamenu: add new routes to `nav_columns/0` in `lib/adaptics_web/components/core_components.ex` (five columns; "Misc" for odds and ends). `test/adaptics_web/components/site_nav_test.exs` fails if a route is missing from the nav or a nav link has no route.

- `/draw` - tldraw canvas (LiveView)
- `/ivn`, `/graph` - D3 node graphs
- `/3d`, `/voxels`, `/cubeviz` - Three.js 3D visualizations
- `/flow` - BPMN workflow diagrams
- `/splines`, `/ecosystem`, `/vortex` - Various canvas experiments
- `/civics` - Exploded-view Three.js model of a city's civic layers
- `/network` - Three.js user-centric social network: sorted ring of connections, each network activatable off/shared/full; timeline + introductions
- `/org` - Three.js org topology: hierarchy as height, leadership center, user-facing edge; AI automation vs headcount strategy
- `/factor` - D3 factor tree: expand `3^8` into factors, reduce pairwise into draggable product boxes with arrows; balanced / chain / shared (DAG) / manual strategies
- `/business` - Three.js business as resource flow: author models as named ins/outs, combine them by linking outputs to inputs (valid-by-construction), view as parts or whole, one moment or snapshots over time; pure model in `business_model.js`, tested with `node --test test/js/*.test.mjs`
- `/chladni` - Three.js Chladni sand (port of George Savva's genuary 2022 piece): auto (12 chords), explore (pick 3 notes), plate (square-plate modes n, m, ±); controls panel (drive, sustain, speed, grains, palette, trails, nodal-line overlay, volume, pause/scatter/PNG); physics checks in `test/js/chladni.test.mjs`
- `/resonance` - Three.js collaboration field: people as sources whose vision (color) emanates (reach); overlaps glow gold (resonant) or red (dissonant), resonance attracts and feeds energy, dissonance repels and drains; goals are fixed visions; optional Kuramoto influence; guided scenes. Pure model in `resonance_model.js`, tested with `node --test test/js/*.test.mjs`
- `/ui-map` - D3 UI pyramid: substrate → elements → components → patterns → views → operations (CRUD) → features → tasks → needs; each piece links to what it is made of; Unfold builds it bottom-up, hover shows composition/reach, side panel reports what emerges (keystones per layer, most reused, same-layer composition). Data + queries in `ui_map_model.js`, tested with `node --test test/js/*.test.mjs`
- `/cards` - Three.js cards (people/bots) flying over a plane; a card opens into an iframe view of a URL; `window.cards` is the bot API
- `/games/:id` - Game board (LiveView)
- `/value_stream` - Value stream mapping (LiveView)
- `/transcripts` - Browse Claude Code transcripts for `~/workspace` projects, read straight from `~/.claude/projects` (dev/test only, never in a release)
- `/docs` - Document viewer with metadata and similar documents (LiveView)
