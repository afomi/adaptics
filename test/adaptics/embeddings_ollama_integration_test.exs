defmodule Adaptics.EmbeddingsOllamaIntegrationTest do
  @moduledoc """
  Live integration against local Ollama — excluded by default.
  Run with: mix test --only ollama
  Requires Ollama running with the configured model pulled
  (see config :adaptics, Adaptics.Embeddings).
  """

  use ExUnit.Case, async: false

  alias Adaptics.Semantic.VectorMath

  @moduletag :ollama
  # First call may load a large model into memory.
  @moduletag timeout: 300_000

  test "embeds real text and geometry behaves semantically" do
    original = Application.get_env(:adaptics, Adaptics.Embeddings)

    try do
      Application.put_env(
        :adaptics,
        Adaptics.Embeddings,
        Keyword.put(original || [], :adapter, Adaptics.Embeddings.Ollama)
      )

      texts = [
        "Brief and to the point.",
        "Terse, economical phrasing with no filler.",
        "Long-winded and elaborate prose that circles the point."
      ]

      assert {:ok, [concise_a, concise_b, verbose]} =
               Adaptics.Embeddings.embed(texts, timeout: 300_000)

      dims = length(concise_a)
      assert dims > 0
      assert length(verbose) == dims

      # The two concise anchors should be nearer each other than to the
      # verbose one — the property semantic axes depend on.
      within_pole = VectorMath.cosine_similarity(concise_a, concise_b)
      across_pole = VectorMath.cosine_similarity(concise_a, verbose)
      assert within_pole > across_pole
    after
      Application.put_env(:adaptics, Adaptics.Embeddings, original)
    end
  end
end
