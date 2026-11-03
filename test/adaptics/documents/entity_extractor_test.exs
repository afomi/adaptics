defmodule Adaptics.Documents.EntityExtractorTest do
  use ExUnit.Case, async: true

  alias Adaptics.Documents.EntityExtractor

  describe "entity_type_to_key/1" do
    test "maps PERSON to person" do
      assert EntityExtractor.entity_type_to_key("PERSON") == "person"
    end

    test "maps ORG to organization" do
      assert EntityExtractor.entity_type_to_key("ORG") == "organization"
    end

    test "maps GPE to location" do
      assert EntityExtractor.entity_type_to_key("GPE") == "location"
    end

    test "maps LOC to location" do
      assert EntityExtractor.entity_type_to_key("LOC") == "location"
    end

    test "maps FAC to location" do
      assert EntityExtractor.entity_type_to_key("FAC") == "location"
    end

    test "returns nil for unmapped types" do
      assert EntityExtractor.entity_type_to_key("DATE") == nil
      assert EntityExtractor.entity_type_to_key("MONEY") == nil
      assert EntityExtractor.entity_type_to_key("CARDINAL") == nil
    end
  end

  describe "extract/1" do
    @tag :spacy
    test "extracts entities from text when spaCy is available" do
      if EntityExtractor.available?() do
        text = "John Smith works at Portland City Council in Portland, Oregon."
        assert {:ok, result} = EntityExtractor.extract(text)
        assert is_list(result["entities"])
        assert is_list(result["keywords"])
      end
    end

    @tag :spacy
    test "returns empty results for empty text" do
      if EntityExtractor.available?() do
        assert {:ok, %{"entities" => [], "keywords" => []}} = EntityExtractor.extract("")
      end
    end

    test "returns error when python is not found" do
      original = Application.get_env(:adaptics, :entity_extraction)

      try do
        Application.put_env(:adaptics, :entity_extraction,
          python_path: "/nonexistent/python3",
          script_path: original[:script_path],
          venv_path: "/nonexistent/venv"
        )

        assert {:error, _reason} = EntityExtractor.extract("some text")
      after
        Application.put_env(:adaptics, :entity_extraction, original)
      end
    end
  end
end
