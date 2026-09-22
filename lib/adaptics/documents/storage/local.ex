defmodule Adaptics.Documents.Storage.Local do
  @behaviour Adaptics.Documents.Storage

  defp base_path do
    Application.get_env(:adaptics, :document_storage)[:path] ||
      Path.join(:code.priv_dir(:adaptics) |> to_string(), "uploads/documents")
  end

  defp full_path(key), do: Path.join(base_path(), key)

  @impl true
  def put(key, binary) do
    path = full_path(key)
    File.mkdir_p!(Path.dirname(path))
    File.write(path, binary)
  end

  @impl true
  def get(key) do
    File.read(full_path(key))
  end

  @impl true
  def delete(key) do
    path = full_path(key)

    case File.rm(path) do
      :ok -> :ok
      {:error, :enoent} -> :ok
      error -> error
    end
  end

  @impl true
  def url(key) do
    "/uploads/documents/#{key}"
  end

  @impl true
  def exists?(key) do
    File.exists?(full_path(key))
  end
end
