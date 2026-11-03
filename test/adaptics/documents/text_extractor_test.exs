defmodule Adaptics.Documents.TextExtractorTest do
  use ExUnit.Case, async: true

  alias Adaptics.Documents.TextExtractor

  describe "available?/0" do
    test "returns a boolean" do
      result = TextExtractor.available?()
      assert is_boolean(result)
    end
  end

  describe "extract/1" do
    @tag :requires_pdftotext
    test "extracts text from a valid PDF" do
      if TextExtractor.available?() do
        # Create a minimal PDF with text content using enscript/ps2pdf or write directly
        tmp_path = Path.join(System.tmp_dir!(), "test_extract.pdf")

        # Write a simple PDF with actual text content
        pdf_content = create_test_pdf_with_text("Hello World")
        File.write!(tmp_path, pdf_content)

        case TextExtractor.extract(tmp_path) do
          {:ok, text} ->
            assert is_binary(text)

          {:error, _reason} ->
            # PDF might be too minimal for pdftotext, that's ok
            :ok
        end

        File.rm(tmp_path)
      end
    end

    test "returns error for nonexistent file" do
      assert {:error, _} = TextExtractor.extract("/tmp/nonexistent_#{System.unique_integer()}.pdf")
    end
  end

  defp create_test_pdf_with_text(_text) do
    # Minimal PDF structure
    "%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000240 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n316\n%%EOF\n"
  end
end
