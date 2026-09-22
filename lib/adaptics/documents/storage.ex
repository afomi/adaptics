defmodule Adaptics.Documents.Storage do
  @callback put(key :: String.t(), binary :: binary()) :: :ok | {:error, term()}
  @callback get(key :: String.t()) :: {:ok, binary()} | {:error, term()}
  @callback delete(key :: String.t()) :: :ok | {:error, term()}
  @callback url(key :: String.t()) :: String.t()
  @callback exists?(key :: String.t()) :: boolean()

  def adapter do
    Application.get_env(:adaptics, :document_storage)[:adapter] ||
      Adaptics.Documents.Storage.Local
  end

  def put(key, binary), do: adapter().put(key, binary)
  def get(key), do: adapter().get(key)
  def delete(key), do: adapter().delete(key)
  def url(key), do: adapter().url(key)
  def exists?(key), do: adapter().exists?(key)
end
