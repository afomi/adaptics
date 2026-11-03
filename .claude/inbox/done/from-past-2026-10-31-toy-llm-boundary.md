---
from: past
to: adaptics
created: 2026-10-31
status: pending
summary: Toy LLM is tracked in past. Leave the BM thread alone. No adaptics work until a station asks for a corpus.
---

## Context

Ryan wants a working language model as a toy, built on the M5, with the moving pieces visible. The session started in `~/workspace/past`.

The decision: the toy lives in past. The checklist is `~/workspace/past/board/index.html` (open with `open board/index.html`). Six stations, in order: character n-gram, a net that learns, a small GPT, watching it learn, MLX on the M5, then a local page you can talk to. Elixir holds the readable pieces. Python runs the tensors.

adaptics was considered as a home because it is Phoenix and already embeds text (Ollama, topic maps, civic corpus). It is the wrong home. `PLAN.md` ## Now is BM — business as resource flow, stories BM1–BM7, port 4010. That thread stays active.

embedding_service (the repo is `~/workspace/embedding_service`, not `embeddings-service`) stays an embeddings API. A separate handoff says so.

## Request

Do no work for the toy.

Keep BM as the single active thread.

Do not add a curriculum, a trainer, a chat surface, or a second board.

If a later station needs civic text, past will send a handoff that names the corpus and the export shape. Until that file exists, leave `Adaptics.Embeddings.Ollama` and the transcript embeddings where they are.

## Relevant files

- `~/workspace/past/board/index.html` — the board
- `~/workspace/past/PLAN.md` — ## Now points at the bench and pauses symbolic-AI 8.4
- `~/workspace/adaptics/PLAN.md` — BM remains the active thread
- `~/workspace/past/scripts/caveman.py` — one-head torch sketch already in past
- `~/workspace/past/scripts/finetune_mlx.py` — LoRA wedge, Qwen2.5-0.5B-Instruct-4bit

## Acceptance

The next adaptics session reads this, does not open an LLM thread, and moves this file to `.claude/inbox/done/`.
