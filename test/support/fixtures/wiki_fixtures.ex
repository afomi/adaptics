defmodule Adaptics.WikiFixtures do
  def valid_page_attributes(attrs \\ %{}) do
    Enum.into(attrs, %{
      title: "Test Page #{System.unique_integer([:positive])}",
      body: "Some **markdown** content."
    })
  end

  def page_fixture(attrs \\ %{}) do
    {:ok, page} =
      attrs
      |> valid_page_attributes()
      |> Adaptics.Wiki.create_page()

    page
  end
end
