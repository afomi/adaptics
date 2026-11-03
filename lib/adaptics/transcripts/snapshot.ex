defmodule Adaptics.Transcripts.Snapshot do
  @moduledoc "Local, disposable snapshots of derived transcript data."
  alias Adaptics.Transcripts
  alias Adaptics.Transcripts.{Embeddings, Workflow}

  @modules [
    __MODULE__,
    Transcripts,
    Embeddings,
    Workflow,
    Adaptics.Transcripts.Related,
    Adaptics.Transcripts.Atlas,
    Adaptics.Semantic.Topics,
    Adaptics.Semantic.VectorMath
  ]

  def fetch(slug, name, opts, build) do
    model = Keyword.get(opts, :model, Adaptics.Embeddings.model())
    path = Embeddings.cache_path(slug, model) <> ".#{name}.snapshot"

    # One builder per snapshot, including concurrent browser visits.
    :global.trans({{__MODULE__, path}, self()}, fn ->
      version = fingerprint(slug, model)

      case read(path, version) do
        {:ok, value} ->
          value

        :miss ->
          value = build.()
          # A transcript may have grown while it was being read.
          if version == fingerprint(slug, model), do: write(path, version, value)
          value
      end
    end)
  end

  defp fingerprint(slug, model) do
    files =
      Transcripts.source_files(slug) ++
        [Embeddings.cache_path(slug, model), Workflow.cache_path(model)]

    versions =
      for module <- @modules do
        Code.ensure_loaded!(module)
        {module, module.module_info(:md5)}
      end

    {Transcripts.root(), Transcripts.workspace(), versions, Enum.map(files, &stamp/1)}
  end

  defp stamp(path) do
    case File.stat(path, time: :posix) do
      {:ok, stat} -> {path, stat.size, stat.mtime, stat.ctime, stat.inode}
      {:error, reason} -> {path, reason}
    end
  end

  defp read(path, version) do
    with {:ok, body} <- File.read(path),
         {^version, value} <- :erlang.binary_to_term(body, [:safe]) do
      File.chmod(path, 0o600)
      {:ok, value}
    else
      _ -> :miss
    end
  rescue
    ArgumentError -> :miss
  end

  defp write(path, version, value) do
    temporary = path <> ".#{System.pid()}.#{System.unique_integer([:positive])}.tmp"

    with :ok <- File.mkdir_p(Path.dirname(path)),
         :ok <- File.write(temporary, "", [:exclusive]),
         :ok <- File.chmod(temporary, 0o600),
         :ok <- File.write(temporary, :erlang.term_to_binary({version, value}, compressed: 1)),
         :ok <- File.rename(temporary, path) do
      :ok
    else
      _ -> File.rm(temporary)
    end
  end
end
