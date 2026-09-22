defmodule Adaptics.Documents.Storage.S3 do
  @behaviour Adaptics.Documents.Storage

  defp config do
    Application.get_env(:adaptics, :document_storage)
  end

  defp bucket, do: config()[:bucket]
  defp prefix, do: config()[:prefix] || "documents"

  defp s3_key(key), do: "#{prefix()}/#{key}"

  @impl true
  def put(key, binary) do
    case ExAws.S3.put_object(bucket(), s3_key(key), binary)
         |> ExAws.request() do
      {:ok, _} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  @impl true
  def get(key) do
    case ExAws.S3.get_object(bucket(), s3_key(key))
         |> ExAws.request() do
      {:ok, %{body: body}} -> {:ok, body}
      {:error, reason} -> {:error, reason}
    end
  end

  @impl true
  def delete(key) do
    case ExAws.S3.delete_object(bucket(), s3_key(key))
         |> ExAws.request() do
      {:ok, _} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  @impl true
  def url(key) do
    "https://#{bucket()}.s3.amazonaws.com/#{s3_key(key)}"
  end

  @impl true
  def exists?(key) do
    case ExAws.S3.head_object(bucket(), s3_key(key))
         |> ExAws.request() do
      {:ok, _} -> true
      _ -> false
    end
  end
end
