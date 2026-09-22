defmodule Adaptics.Documents.MetadataExtractor do
  @moduledoc """
  Pure Elixir module for extracting structured metadata from document text.
  Extracts programs, performance metrics, policies, and modal language
  using regex patterns. No database access — returns plain data.
  """

  @max_results 50

  @doc """
  Extracts all metadata categories from the given text.

  Returns `{:ok, results_map}` where keys are attribute types and values
  are lists of extracted strings.
  """
  def extract(text) when is_binary(text) do
    {:ok,
     %{
       "program" => extract_programs(text),
       "performance_metric" => extract_metrics(text),
       "policy" => extract_policies(text),
       "modal_language" => extract_modal_language(text)
     }}
  end

  def extract(_), do: {:ok, %{}}

  @doc """
  Extracts named programs, initiatives, plans, etc.

  Matches capitalized multi-word names followed by Program, Initiative,
  Plan, Project, Strategy, or Framework.
  """
  def extract_programs(text) do
    ~r/\b((?:[A-Z][A-Za-z]+(?:\s+(?:and|of|for|the|to|in)\s+|\s+)){1,5}(?:Program|Initiative|Plan|Project|Strategy|Framework))\b/
    |> Regex.scan(text)
    |> Enum.map(fn [_full, match] -> String.trim(match) end)
    |> Enum.map(&strip_leading_article/1)
    |> deduplicate_and_cap()
  end

  @doc """
  Extracts performance metrics — percentages with context and numeric targets.
  """
  def extract_metrics(text) do
    percentage_matches = extract_percentage_metrics(text)
    numeric_matches = extract_numeric_targets(text)

    (percentage_matches ++ numeric_matches)
    |> deduplicate_and_cap()
  end

  defp extract_percentage_metrics(text) do
    ~r/[^.]*?\d+(?:\.\d+)?%[^.]*/
    |> Regex.scan(text)
    |> Enum.map(fn [match] -> String.trim(match) end)
    |> Enum.filter(&(String.length(&1) > 5 and String.length(&1) < 300))
  end

  defp extract_numeric_targets(text) do
    ~r/(?:achieve|reduce|increase|improve|maintain|target|goal of|reach)\s+[^.]*?\d+[^.]*/i
    |> Regex.scan(text)
    |> Enum.map(fn [match] -> String.trim(match) end)
    |> Enum.filter(&(String.length(&1) > 10 and String.length(&1) < 300))
  end

  @doc """
  Extracts named policies, ordinances, resolutions, regulations, etc.
  Optionally followed by an ID like "No. 2024-01".
  """
  def extract_policies(text) do
    named_policies =
      ~r/\b((?:[A-Z][A-Za-z]+(?:\s+[A-Za-z]+){0,4})\s+(?:Policy|Ordinance|Resolution|Regulation|Code|Statute|Rule)(?:\s+(?:No\.?\s*)?[A-Z0-9][\w-]*)?)\b/
      |> Regex.scan(text)
      |> Enum.map(fn [_full, match] -> String.trim(match) end)
      |> Enum.map(&strip_leading_article/1)

    standalone_policies =
      ~r/\b((?:Policy|Ordinance|Resolution|Regulation|Code|Statute|Rule)\s+(?:No\.?\s*)?[A-Z0-9][\w-]*)\b/
      |> Regex.scan(text)
      |> Enum.map(fn [_full, match] -> String.trim(match) end)

    (named_policies ++ standalone_policies)
    |> deduplicate_and_cap()
  end

  @doc """
  Extracts sentences containing modal verbs (must, shall, should, could, may).
  Splits text on sentence boundaries and filters for modal language.
  """
  def extract_modal_language(text) do
    text
    |> split_sentences()
    |> Enum.filter(&contains_modal_verb?/1)
    |> Enum.map(&String.trim/1)
    |> Enum.filter(&(String.length(&1) > 10 and String.length(&1) < 500))
    |> deduplicate_and_cap()
  end

  defp split_sentences(text) do
    Regex.split(~r/(?<=[.!?])\s+/, text)
  end

  defp contains_modal_verb?(sentence) do
    Regex.match?(~r/\b(must|shall|should|could|may)\b/i, sentence)
  end

  defp strip_leading_article(text) do
    Regex.replace(~r/^(?:The|A|An)\s+/, text, "")
  end

  defp deduplicate_and_cap(items) do
    items
    |> Enum.uniq()
    |> Enum.take(@max_results)
  end
end
