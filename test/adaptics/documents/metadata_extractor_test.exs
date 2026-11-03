defmodule Adaptics.Documents.MetadataExtractorTest do
  use ExUnit.Case, async: true

  alias Adaptics.Documents.MetadataExtractor

  @governance_text """
  The City of Portland Community Development Program has been instrumental in
  neighborhood revitalization. The Housing First Initiative targets chronically
  homeless populations, while the Downtown Revitalization Plan provides a
  framework for economic growth. The Green Infrastructure Project focuses on
  sustainable stormwater management.

  Performance targets include achieving a 95% response rate for emergency calls
  and reducing operational costs by 20% over five years. The department aims to
  maintain 85.5% customer satisfaction ratings and increase park access to reach
  500 families per quarter.

  The Equal Employment Policy governs all hiring decisions. City Ordinance
  No. 2024-01 establishes new zoning regulations. Resolution 2024-15
  addresses housing affordability, and the Administrative Code Section 4.2
  covers procurement procedures. The Public Safety Regulation applies to
  all city-operated facilities.

  The city must provide 30 days notice before any rate increase. Contractors
  shall comply with all applicable safety standards. The council should review
  budget allocations quarterly. Residents may submit comments during the public
  hearing period. The agency could expand services to additional neighborhoods.
  """

  describe "extract/1" do
    test "returns ok tuple with all four categories" do
      assert {:ok, results} = MetadataExtractor.extract(@governance_text)
      assert Map.has_key?(results, "program")
      assert Map.has_key?(results, "performance_metric")
      assert Map.has_key?(results, "policy")
      assert Map.has_key?(results, "modal_language")
    end

    test "returns empty results for nil input" do
      assert {:ok, %{}} = MetadataExtractor.extract(nil)
    end

    test "returns empty lists for empty text" do
      assert {:ok, results} = MetadataExtractor.extract("")
      assert results["program"] == []
      assert results["performance_metric"] == []
      assert results["policy"] == []
      assert results["modal_language"] == []
    end
  end

  describe "extract_programs/1" do
    test "extracts named programs" do
      programs = MetadataExtractor.extract_programs(@governance_text)
      assert Enum.any?(programs, &String.contains?(&1, "Community Development Program"))
    end

    test "extracts initiatives" do
      programs = MetadataExtractor.extract_programs(@governance_text)
      assert Enum.any?(programs, &String.contains?(&1, "Housing First Initiative"))
    end

    test "extracts plans" do
      programs = MetadataExtractor.extract_programs(@governance_text)
      assert Enum.any?(programs, &String.contains?(&1, "Revitalization Plan"))
    end

    test "extracts projects" do
      programs = MetadataExtractor.extract_programs(@governance_text)
      assert Enum.any?(programs, &String.contains?(&1, "Infrastructure Project"))
    end

    test "returns empty list for text with no programs" do
      assert MetadataExtractor.extract_programs("Just some plain text without any programs.") == []
    end
  end

  describe "extract_metrics/1" do
    test "extracts percentage metrics" do
      metrics = MetadataExtractor.extract_metrics(@governance_text)
      assert Enum.any?(metrics, &String.contains?(&1, "95%"))
    end

    test "extracts percentage with decimal" do
      metrics = MetadataExtractor.extract_metrics(@governance_text)
      assert Enum.any?(metrics, &String.contains?(&1, "85.5%"))
    end

    test "extracts reduction targets" do
      metrics = MetadataExtractor.extract_metrics(@governance_text)
      assert Enum.any?(metrics, &String.contains?(&1, "20%"))
    end

    test "extracts numeric targets with action verbs" do
      metrics = MetadataExtractor.extract_metrics(@governance_text)
      assert Enum.any?(metrics, &String.contains?(&1, "500"))
    end

    test "returns empty list for text with no metrics" do
      assert MetadataExtractor.extract_metrics("A simple document with no numbers.") == []
    end
  end

  describe "extract_policies/1" do
    test "extracts named policies" do
      policies = MetadataExtractor.extract_policies(@governance_text)
      assert "Equal Employment Policy" in policies
    end

    test "extracts ordinances with IDs" do
      policies = MetadataExtractor.extract_policies(@governance_text)
      assert Enum.any?(policies, &String.contains?(&1, "Ordinance"))
    end

    test "extracts resolutions" do
      policies = MetadataExtractor.extract_policies(@governance_text)
      assert Enum.any?(policies, &String.contains?(&1, "Resolution"))
    end

    test "extracts regulations" do
      policies = MetadataExtractor.extract_policies(@governance_text)
      assert Enum.any?(policies, &String.contains?(&1, "Safety Regulation"))
    end

    test "returns empty list for text with no policies" do
      assert MetadataExtractor.extract_policies("Just a paragraph about the weather.") == []
    end
  end

  describe "extract_modal_language/1" do
    test "extracts must sentences" do
      modals = MetadataExtractor.extract_modal_language(@governance_text)
      assert Enum.any?(modals, &String.contains?(&1, "must provide"))
    end

    test "extracts shall sentences" do
      modals = MetadataExtractor.extract_modal_language(@governance_text)
      assert Enum.any?(modals, &String.contains?(&1, "shall comply"))
    end

    test "extracts should sentences" do
      modals = MetadataExtractor.extract_modal_language(@governance_text)
      assert Enum.any?(modals, &String.contains?(&1, "should review"))
    end

    test "extracts may sentences" do
      modals = MetadataExtractor.extract_modal_language(@governance_text)
      assert Enum.any?(modals, &String.contains?(&1, "may submit"))
    end

    test "extracts could sentences" do
      modals = MetadataExtractor.extract_modal_language(@governance_text)
      assert Enum.any?(modals, &String.contains?(&1, "could expand"))
    end

    test "returns empty list for text with no modal verbs" do
      assert MetadataExtractor.extract_modal_language("The cat sat on the mat.") == []
    end
  end

  describe "deduplication and capping" do
    test "deduplicates identical matches" do
      text = """
      The Housing First Initiative is great.
      We love the Housing First Initiative.
      """

      programs = MetadataExtractor.extract_programs(text)
      housing_count = Enum.count(programs, &String.contains?(&1, "Housing First Initiative"))
      assert housing_count == 1
    end
  end
end
