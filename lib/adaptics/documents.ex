defmodule Adaptics.Documents do
  @moduledoc """
  Context for managing PDF documents, storage, and attributes.
  """

  import Ecto.Query
  alias Adaptics.Repo
  alias Adaptics.Documents.{Document, DocumentAttribute, Storage}

  # --- Documents CRUD ---

  def list_documents do
    Document
    |> order_by(desc: :inserted_at)
    |> Repo.all()
  end

  def get_document!(id) do
    Document
    |> Repo.get!(id)
    |> Repo.preload(:attributes)
  end

  def create_document(attrs) do
    %Document{}
    |> Document.changeset(attrs)
    |> Repo.insert()
  end

  def update_document(%Document{} = document, attrs) do
    document
    |> Document.changeset(attrs)
    |> Repo.update()
  end

  def delete_document(%Document{} = document) do
    Storage.delete(document.storage_key)
    Repo.delete(document)
  end

  def change_document(%Document{} = document, attrs \\ %{}) do
    Document.changeset(document, attrs)
  end

  # --- Storage integration ---

  def store_and_create(file_name, file_size, binary) do
    storage_key = generate_storage_key(file_name)

    case Storage.put(storage_key, binary) do
      :ok ->
        create_document(%{
          file_name: file_name,
          file_size: file_size,
          storage_key: storage_key,
          status: "uploaded"
        })

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp generate_storage_key(file_name) do
    uuid = Ecto.UUID.generate()
    ext = Path.extname(file_name)
    "#{uuid}#{ext}"
  end

  # --- Async text extraction ---

  def extract_text_async(%Document{} = document) do
    %{"document_id" => document.id}
    |> Adaptics.Workers.ExtractTextWorker.new()
    |> Oban.insert()
  end

  def extract_text(%Document{} = document) do
    update_document(document, %{status: "extracting"})

    case Storage.get(document.storage_key) do
      {:ok, binary} ->
        tmp_path = Path.join(System.tmp_dir!(), "doc_#{document.id}.pdf")
        File.write!(tmp_path, binary)

        try do
          case Adaptics.Documents.TextExtractor.extract(tmp_path) do
            {:ok, text} ->
              update_document(document, %{extracted_text: text, status: "ready"})

            {:error, reason} ->
              update_document(document, %{
                status: "error",
                metadata: Map.put(document.metadata || %{}, "extraction_error", reason)
              })
          end
        after
          File.rm(tmp_path)
        end

      {:error, reason} ->
        update_document(document, %{
          status: "error",
          metadata: Map.put(document.metadata || %{}, "extraction_error", "#{inspect(reason)}")
        })
    end
  end

  # --- Entity extraction ---

  def extract_entities_async(%Document{} = document) do
    %{"document_id" => document.id}
    |> Adaptics.Workers.ExtractEntitiesWorker.new()
    |> Oban.insert()
  end

  # --- Document Attributes ---

  def list_attributes(%Document{} = document) do
    DocumentAttribute
    |> where(document_id: ^document.id)
    |> order_by(asc: :key)
    |> Repo.all()
  end

  def get_attribute!(id), do: Repo.get!(DocumentAttribute, id)

  def create_attribute(attrs) do
    %DocumentAttribute{}
    |> DocumentAttribute.changeset(attrs)
    |> Repo.insert()
  end

  def update_attribute(%DocumentAttribute{} = attribute, attrs) do
    attribute
    |> DocumentAttribute.changeset(attrs)
    |> Repo.update()
  end

  def delete_attribute(%DocumentAttribute{} = attribute) do
    Repo.delete(attribute)
  end

  def change_attribute(%DocumentAttribute{} = attribute, attrs \\ %{}) do
    DocumentAttribute.changeset(attribute, attrs)
  end

  def upsert_attribute(attrs) do
    %DocumentAttribute{}
    |> DocumentAttribute.changeset(attrs)
    |> Repo.insert(
      on_conflict: :nothing,
      conflict_target: [:document_id, :key, :value]
    )
  end

  def get_attributes_by_key(%Document{} = document, key) do
    DocumentAttribute
    |> where(document_id: ^document.id, key: ^key)
    |> order_by(asc: :value)
    |> Repo.all()
  end

  def delete_attributes_by_source(%Document{} = document, source) do
    DocumentAttribute
    |> where(document_id: ^document.id, source: ^source)
    |> Repo.delete_all()
  end

  def delete_attributes_by_keys(%Document{} = document, keys, source) do
    DocumentAttribute
    |> where(document_id: ^document.id, source: ^source)
    |> where([a], a.key in ^keys)
    |> Repo.delete_all()
  end

  # --- Similar documents ---

  @similarity_keys ~w(person organization location keyword program)

  def find_similar(%Document{} = document, limit \\ 10) do
    my_attrs =
      DocumentAttribute
      |> where(document_id: ^document.id)
      |> where([a], a.key in ^@similarity_keys)
      |> select([a], {a.key, a.value})
      |> Repo.all()

    if my_attrs == [] do
      []
    else
      key_value_pairs = Enum.map(my_attrs, fn {k, v} -> {k, v} end)

      conditions =
        Enum.reduce(key_value_pairs, nil, fn {k, v}, acc ->
          clause = dynamic([a], a.key == ^k and a.value == ^v)
          if acc, do: dynamic([a], ^acc or ^clause), else: clause
        end)

      DocumentAttribute
      |> where([a], a.document_id != ^document.id)
      |> where([a], ^conditions)
      |> group_by([a], a.document_id)
      |> select([a], %{document_id: a.document_id, shared_count: count(a.id)})
      |> order_by([a], desc: count(a.id))
      |> limit(^limit)
      |> Repo.all()
      |> Enum.map(fn %{document_id: id, shared_count: count} ->
        doc = get_document!(id)
        %{document: doc, shared_count: count}
      end)
    end
  end
end
