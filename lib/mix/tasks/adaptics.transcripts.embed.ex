defmodule Mix.Tasks.Adaptics.Transcripts.Embed do
  @shortdoc "Embed a project's transcript turns (your messages) and print its topics"

  @moduledoc """
  Embeds every turn you typed in a `~/workspace` project's Claude Code
  transcripts, caches the vectors outside the repo, and prints the topics that
  emerge (k-means + c-TF-IDF labels) with each topic's most typical messages.

      mix adaptics.transcripts.embed jurisdictional
      mix adaptics.transcripts.embed jurisdictional --k 16 --model nomic-embed-text

  Human prompts (including conversation control) are scored on a cached
  workflow ↔ subject axis; topics use the subject side by default. Inspect
  sensitivity with `--workflow-threshold -0.05`, or cluster all prompts with
  `--include-workflow`. Scores are not probabilities.

  Needs Ollama running with the model pulled. Re-runs only embed new turns.
  Local only: reads ~/.claude/projects, writes ~/.cache/adaptics.
  """

  use Mix.Task

  alias Adaptics.Transcripts
  alias Adaptics.Transcripts.Embeddings
  alias Adaptics.Transcripts.Workflow

  @impl Mix.Task
  def run(args) do
    {opts, rest, invalid} =
      OptionParser.parse(args,
        strict: [
          k: :integer,
          model: :string,
          examples: :integer,
          include_workflow: :boolean,
          workflow_threshold: :float
        ]
      )

    if invalid != [], do: Mix.raise("Unknown or invalid options: #{inspect(invalid)}")
    Mix.Task.run("app.start")
    info = fn message -> Mix.shell().info(message) end

    slug =
      List.first(rest) ||
        Mix.raise("usage: mix adaptics.transcripts.embed <project> [--k 12] [--model …]")

    Transcripts.get_project(slug) ||
      Mix.raise("No workspace project #{inspect(slug)} in #{Transcripts.root()}")

    model = Keyword.get(opts, :model, Adaptics.Embeddings.model())
    k = Keyword.get(opts, :k, 12)
    if k < 1, do: Mix.raise("--k must be positive")

    texts = Embeddings.turn_texts(slug, include_control: true)

    kinds =
      slug
      |> Embeddings.breakdown()
      |> Enum.sort_by(&(-elem(&1, 1)))
      |> Enum.map_join(", ", fn {k, n} -> "#{n} #{k}" end)

    info.("#{slug}: #{kinds} → scoring #{map_size(texts)} human turns · model #{model}")

    progress = fn done, total -> IO.write(:stderr, "\r  embedding #{done}/#{total}") end

    case Embeddings.embed(slug, model: model, texts: texts, on_progress: progress) do
      {:ok, vectors, stats} ->
        IO.write(:stderr, "\n")

        if map_size(vectors) != map_size(texts),
          do:
            Mix.raise(
              "Expected #{map_size(texts)} vectors, got #{map_size(vectors)} — cache at #{stats.path}"
            )

        info.("  #{stats.embedded} embedded, #{stats.cached} from cache → #{stats.path}")

        case Workflow.prepare(model) do
          {:ok, axis} ->
            scores = Workflow.scores(vectors, axis)
            threshold = Keyword.get(opts, :workflow_threshold, Workflow.cutoff())
            content = Workflow.content(vectors, scores, threshold)

            info.(
              "  semantic axis: #{map_size(content)} subject turns, #{map_size(vectors) - map_size(content)} workflow turns (cutoff #{threshold}; scores are not probabilities)"
            )

            scores
            |> Enum.sort_by(fn {id, score} -> {score, id} end)
            |> Enum.take(5)
            |> Enum.each(fn {id, score} ->
              info.(
                "   workflow #{Float.round(score, 3)} · #{id} · #{String.slice(texts[id], 0, 100)}"
              )
            end)

            selected = if Keyword.get(opts, :include_workflow, false), do: vectors, else: content

            print_topics(
              Embeddings.topics(selected, texts, k, Keyword.get(opts, :examples, 4)),
              texts,
              info
            )

          {:error, reason} ->
            Mix.raise("Workflow axis failed: #{inspect(reason)}; turn vectors remain cached")
        end

      {:error, reason} ->
        Mix.raise(
          "Embedding failed: #{inspect(reason)} (is Ollama running with #{model} pulled?)"
        )
    end
  end

  defp print_topics(fit, texts, info) do
    fit.topics
    |> Enum.sort_by(fn {_, t} -> -t.size end)
    |> Enum.each(fn {cluster, topic} ->
      info.("\n## #{topic.label}  (#{topic.size} turns)")

      for id <- fit.typical[cluster] do
        line = texts[id] |> String.split("\n", parts: 2) |> hd() |> String.slice(0, 110)
        info.("   · #{line}")
      end
    end)
  end
end
