defmodule Adaptics.Documents.EntityExtractor do
  @moduledoc """
  Calls the Python spaCy script to extract entities and keywords from text.
  Uses a virtual environment at priv/python/.venv for reliable dependency management.
  """

  @doc """
  Extracts entities and keywords from the given text.
  Returns `{:ok, result}` or `{:error, reason}`.

  Result shape:
    %{
      "entities" => [%{"type" => "PERSON", "text" => "Jane Doe"}, ...],
      "keywords" => [%{"text" => "budget", "score" => 0.85}, ...]
    }
  """
  def extract(text) when is_binary(text) do
    config = Application.get_env(:adaptics, :entity_extraction)
    python_path = resolve_python_path(config)
    script_path = config[:script_path]

    # Write text to a temp file and pass as argument, since System.cmd has no stdin option
    tmp_path = Path.join(System.tmp_dir!(), "ner_input_#{:erlang.unique_integer([:positive])}.txt")
    File.write!(tmp_path, text)

    try do
      case System.cmd(python_path, [script_path, tmp_path], stderr_to_stdout: true) do
        {output, 0} ->
          case Jason.decode(output) do
            {:ok, result} -> {:ok, result}
            {:error, _} -> {:error, "failed to parse Python output: #{String.slice(output, 0, 200)}"}
          end

        {error, code} ->
          {:error, "Python script exited with code #{code}: #{String.slice(error, 0, 500)}"}
      end
    after
      File.rm(tmp_path)
    end
  rescue
    e in ErlangError ->
      {:error, "Python not available: #{inspect(e)}"}
  end

  @doc """
  Maps spaCy entity types to our attribute key names.
  """
  def entity_type_to_key("PERSON"), do: "person"
  def entity_type_to_key("ORG"), do: "organization"
  def entity_type_to_key("GPE"), do: "location"
  def entity_type_to_key("LOC"), do: "location"
  def entity_type_to_key("FAC"), do: "location"
  def entity_type_to_key(_), do: nil

  @doc """
  Returns true if the Python venv and spaCy model are available.
  """
  def available? do
    config = Application.get_env(:adaptics, :entity_extraction)
    python_path = resolve_python_path(config)

    case System.cmd(python_path, ["-c", "import spacy; spacy.load('en_core_web_sm')"],
           stderr_to_stdout: true
         ) do
      {_, 0} -> true
      _ -> false
    end
  rescue
    _ -> false
  end

  @doc """
  Sets up the Python virtual environment and installs dependencies.
  """
  def setup_venv do
    config = Application.get_env(:adaptics, :entity_extraction)
    venv_path = config[:venv_path]

    with {_, 0} <- System.cmd("python3", ["-m", "venv", venv_path], stderr_to_stdout: true),
         pip_path = Path.join([venv_path, "bin", "pip"]),
         req_path = Path.join(Path.dirname(config[:script_path]), "requirements.txt"),
         {_, 0} <- System.cmd(pip_path, ["install", "-r", req_path], stderr_to_stdout: true),
         python_path = Path.join([venv_path, "bin", "python3"]),
         {_, 0} <-
           System.cmd(python_path, ["-m", "spacy", "download", "en_core_web_sm"],
             stderr_to_stdout: true
           ) do
      :ok
    else
      {error, code} -> {:error, "setup failed (exit #{code}): #{String.slice(error, 0, 500)}"}
    end
  rescue
    e -> {:error, "setup error: #{inspect(e)}"}
  end

  defp resolve_python_path(config) do
    venv_python = Path.join([config[:venv_path], "bin", "python3"])

    if File.exists?(venv_python) do
      venv_python
    else
      config[:python_path]
    end
  end
end
