defmodule Adaptics.EmbeddingsTest do
  use ExUnit.Case, async: false

  alias Adaptics.Embeddings

  test "test env uses the Fake adapter" do
    assert Embeddings.adapter() == Adaptics.Embeddings.Fake
  end

  test "embed/1 with empty list short-circuits" do
    assert Embeddings.embed([]) == {:ok, []}
  end

  test "Fake adapter is deterministic and unit-length" do
    {:ok, [a1]} = Embeddings.embed(["hello"])
    {:ok, [a2, b]} = Embeddings.embed(["hello", "world"])

    assert a1 == a2
    refute a1 == b
    assert_in_delta Adaptics.Semantic.VectorMath.magnitude(a1), 1.0, 1.0e-9
  end

  test "Fake adapter honors registered vectors" do
    Adaptics.Embeddings.Fake.put("pinned", [1.0, 0.0])
    assert {:ok, [[1.0, 0.0]]} = Embeddings.embed(["pinned"])
  end

  test "Ollama adapter maps connection failure to :unavailable" do
    original = Application.get_env(:adaptics, Adaptics.Embeddings)

    try do
      Application.put_env(:adaptics, Adaptics.Embeddings,
        adapter: Adaptics.Embeddings.Ollama,
        # Port 9 (discard) — nothing listens there locally.
        url: "http://127.0.0.1:9",
        model: "nomic-embed-text"
      )

      assert {:error, :unavailable} = Adaptics.Embeddings.Ollama.embed(["hi"], timeout: 2_000)
    after
      Application.put_env(:adaptics, Adaptics.Embeddings, original)
    end
  end
end
