defmodule Adaptics.Documents.TextExtractor do
  @moduledoc """
  Extracts text from PDF files using pdftotext (poppler-utils).
  """

  @doc """
  Extracts text from a PDF file at the given path.
  Returns `{:ok, text}` or `{:error, reason}`.
  """
  def extract(file_path) do
    case System.cmd("pdftotext", ["-layout", file_path, "-"], stderr_to_stdout: true) do
      {text, 0} -> {:ok, text}
      {error, _code} -> {:error, "pdftotext failed: #{error}"}
    end
  rescue
    e in ErlangError ->
      {:error, "pdftotext not available: #{inspect(e)}"}
  end

  @doc """
  Returns true if pdftotext is available on the system.
  """
  def available? do
    case System.cmd("which", ["pdftotext"], stderr_to_stdout: true) do
      {_, 0} -> true
      _ -> false
    end
  rescue
    _ -> false
  end
end
