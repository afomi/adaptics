defmodule Adaptics.DocumentsFixtures do
  @moduledoc """
  Test helpers for creating document entities.
  """

  def valid_document_attributes(attrs \\ %{}) do
    Enum.into(attrs, %{
      file_name: "test_document.pdf",
      file_size: 1024,
      storage_key: "#{Ecto.UUID.generate()}.pdf",
      content_type: "application/pdf",
      status: "uploaded"
    })
  end

  def document_fixture(attrs \\ %{}) do
    {:ok, document} =
      attrs
      |> valid_document_attributes()
      |> Adaptics.Documents.create_document()

    document
  end

  def document_attribute_fixture(document, attrs \\ %{}) do
    {:ok, attribute} =
      attrs
      |> Enum.into(%{
        key: "author",
        value: "Test Author",
        source: "manual",
        document_id: document.id
      })
      |> Adaptics.Documents.create_attribute()

    attribute
  end

  @doc """
  Returns a minimal valid PDF binary for testing.
  """
  def minimal_pdf do
    # A minimal valid PDF that pdftotext can process
    "%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000240 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n316\n%%EOF\n"
  end
end
