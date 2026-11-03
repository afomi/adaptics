defmodule Adaptics.Documents.Storage.LocalTest do
  use ExUnit.Case, async: true

  alias Adaptics.Documents.Storage.Local

  @test_dir System.tmp_dir!() |> Path.join("adaptics_storage_test")

  setup do
    # Override config for test
    original = Application.get_env(:adaptics, :document_storage)

    Application.put_env(:adaptics, :document_storage,
      adapter: Local,
      path: @test_dir
    )

    File.rm_rf!(@test_dir)
    File.mkdir_p!(@test_dir)

    on_exit(fn ->
      File.rm_rf!(@test_dir)
      Application.put_env(:adaptics, :document_storage, original)
    end)

    :ok
  end

  test "put/2 writes a file to disk" do
    assert :ok = Local.put("test.pdf", "pdf content")
    assert File.exists?(Path.join(@test_dir, "test.pdf"))
  end

  test "get/2 reads a file from disk" do
    Local.put("test.pdf", "pdf content")
    assert {:ok, "pdf content"} = Local.get("test.pdf")
  end

  test "get/2 returns error for missing file" do
    assert {:error, :enoent} = Local.get("nonexistent.pdf")
  end

  test "delete/2 removes a file" do
    Local.put("test.pdf", "content")
    assert :ok = Local.delete("test.pdf")
    refute File.exists?(Path.join(@test_dir, "test.pdf"))
  end

  test "delete/2 returns ok for missing file" do
    assert :ok = Local.delete("nonexistent.pdf")
  end

  test "exists?/1 returns true when file exists" do
    Local.put("test.pdf", "content")
    assert Local.exists?("test.pdf")
  end

  test "exists?/1 returns false when file does not exist" do
    refute Local.exists?("nonexistent.pdf")
  end

  test "url/1 returns a path-based URL" do
    assert "/uploads/documents/test.pdf" = Local.url("test.pdf")
  end

  test "put/2 creates subdirectories as needed" do
    assert :ok = Local.put("sub/dir/test.pdf", "content")
    assert File.exists?(Path.join(@test_dir, "sub/dir/test.pdf"))
  end
end
