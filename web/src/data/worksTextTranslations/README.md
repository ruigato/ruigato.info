Batch translations for editorial `pt` / `en` text variants.

Each `.json` file in this folder can contribute partial overrides keyed by `slug`.

Shape:

```json
{
  "example-slug": {
    "summary_localized": {
      "pt": "Resumo em Português.",
      "en": "Summary in English."
    },
    "description_localized": {
      "pt": "Descrição em Português.",
      "en": "Description in English."
    }
  }
}
```

Only include fields that are actually being overridden.
