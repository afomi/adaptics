# Cocktail data attribution

Vendored, normalized copies of two public cocktail datasets.
One JSON file per drink; schema:
`{slug, name, source, category, description, keywords, ingredients: [{name, quantity, measure}]}`.
Regenerate with `mix run scripts/fetch_opendrinks.exs` and
`mix run scripts/fetch_boston_cocktails.exs`.

## opendrinks/ — Open Drinks

- Source: https://github.com/alfg/opendrinks (`src/recipes/*.json`)
- License: MIT (covers code and recipe data).
- Crowd-sourced recipes; quality and ingredient naming vary.

## boston/ — Mr. Boston cocktails

- Source: https://raw.githubusercontent.com/rfordatascience/tidytuesday/main/data/2020/2020-05-26/boston_cocktails.csv
  (tidytuesday 2020-05-26), originally scraped from the Mr. Boston Bartender's
  Guide (mrbostondrinks.com) by Kaggle user jenlooper.
- License: informal — widely reused via tidytuesday but with no explicit
  license grant. Fine for an internal spike; revisit before any public or
  commercial use.
