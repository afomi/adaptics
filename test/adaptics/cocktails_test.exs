defmodule Adaptics.CocktailsTest do
  use ExUnit.Case, async: true

  alias Adaptics.Cocktails

  @fixtures Path.expand("../support/fixtures/cocktails", __DIR__)

  describe "classify_ingredient/1" do
    test "classifies base spirits, folding sub-styles into canonical ids" do
      assert Cocktails.classify_ingredient("Bourbon whiskey") == {:spirit, "whiskey"}
      assert Cocktails.classify_ingredient("Scotch") == {:spirit, "whiskey"}
      assert Cocktails.classify_ingredient("Old Mr. Boston Dry Gin") == {:spirit, "gin"}
      assert Cocktails.classify_ingredient("Cachaça") == {:spirit, "rum"}
      assert Cocktails.classify_ingredient("Mezcal") == {:spirit, "tequila"}
      assert Cocktails.classify_ingredient("Cognac") == {:spirit, "brandy"}
    end

    test "trap orderings beat naive substring matches" do
      assert Cocktails.classify_ingredient("Sloe gin") == {:supporting, :liqueur}
      assert Cocktails.classify_ingredient("Ginger beer") == {:supporting, :mixer}
      assert Cocktails.classify_ingredient("Ginger") == {:supporting, :other}
      assert Cocktails.classify_ingredient("Cherry-flavored brandy") == {:supporting, :liqueur}
      assert Cocktails.classify_ingredient("Irish cream") == {:supporting, :liqueur}
      assert Cocktails.classify_ingredient("Cream of coconut") == {:supporting, :other}
    end

    test "classifies supporting categories" do
      assert Cocktails.classify_ingredient("Juice of lemon") == {:supporting, :juice}
      assert Cocktails.classify_ingredient("Simple syrup") == {:supporting, :syrup_sweetener}
      assert Cocktails.classify_ingredient("Angostura Bitters") == {:supporting, :bitters}
      assert Cocktails.classify_ingredient("Dry vermouth") == {:supporting, :wine_vermouth}
      assert Cocktails.classify_ingredient("Club soda") == {:supporting, :mixer}
      assert Cocktails.classify_ingredient("Egg white") == {:supporting, :dairy_egg}
      assert Cocktails.classify_ingredient("Peach schnapps") == {:supporting, :liqueur}
    end

    test "unmatched names fall through to :other" do
      assert Cocktails.classify_ingredient("Mystery dust") == {:supporting, :other}
    end
  end

  describe "list_drinks/2" do
    test "reads all drink files for a dataset, sorted by filename" do
      drinks = Cocktails.list_drinks("opendrinks", @fixtures)
      assert Enum.map(drinks, & &1["slug"]) == ["gin-fizz", "whiskey-sour"]
      assert length(hd(drinks)["ingredients"]) == 4
    end

    test "returns [] when the dataset directory is absent" do
      assert Cocktails.list_drinks("nonexistent", @fixtures) == []
      assert Cocktails.list_drinks("nonexistent-dataset-not-vendored") == []
    end
  end

  describe "payload/1" do
    setup do
      {:ok, payload: Cocktails.payload(@fixtures)}
    end

    test "includes both datasets with drink counts", %{payload: payload} do
      assert Enum.map(payload.datasets, & &1.id) == ["opendrinks", "boston"]
      assert Enum.map(payload.datasets, & &1.count) == [2, 1]
    end

    test "derives base spirits per drink", %{payload: payload} do
      [opendrinks, boston] = payload.datasets

      spirits = Map.new(opendrinks.spirits, &{&1.id, &1.count})
      assert spirits == %{"whiskey" => 1, "gin" => 1}

      martini = hd(boston.drinks)
      assert martini.spirits == ["gin"]
      assert martini.ingredients == ["dry-vermouth"]
    end

    test "dedupes supporting ingredients and counts usage", %{payload: payload} do
      [opendrinks, _boston] = payload.datasets

      simple_syrup = Enum.find(opendrinks.ingredients, &(&1.id == "simple-syrup"))
      assert simple_syrup.count == 2
      assert simple_syrup.category == :syrup_sweetener
    end

    test "every drink reference resolves to a listed spirit or ingredient", %{payload: payload} do
      for dataset <- payload.datasets do
        spirit_ids = MapSet.new(dataset.spirits, & &1.id)
        ingredient_ids = MapSet.new(dataset.ingredients, & &1.id)

        for drink <- dataset.drinks do
          assert Enum.all?(drink.spirits, &MapSet.member?(spirit_ids, &1))
          assert Enum.all?(drink.ingredients, &MapSet.member?(ingredient_ids, &1))
        end
      end
    end
  end
end
