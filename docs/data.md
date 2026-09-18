# Data: demo dataset and importing your history

## Demo dataset

`demo-data/history.json` holds 25 entirely fictional productions from 6 fictional
producers; `demo-data/pdfs/` holds budgets to upload that do not overlap with them, so a
demo visitor sees a fresh extraction. Load with `npm run db:seed:demo` (idempotent — rows
tagged `formatSource = "seed-demo"` are replaced) or, inside the image,
`node scripts/seed-demo.mjs`.

Regenerate the sample PDFs with `npm run demo-data:pdfs`.

## Collective-agreement minimums

`config/cc-minimums.json` ships the public barème (CDDU, cat. B hors fiction & flux, base
8h) with its effective date. `npm run db:seed:cc` loads it into `cc_minimums`; later
barèmes are added from the settings UI (Conventions collectives → new period) and rates are
resolved by the budget's date. If your organisation maintains the barème in a spreadsheet,
`npm run db:seed:cc:xlsm` parses a "Conventions collectives" sheet (see
`scripts/seed-cc-minimums.ts` for the expected columns).

## Importing your own production history

Two options.

### JSON, same shape as the demo file

Write a JSON array of productions following `demo-data/history.json` — the fields are the
columns of the `productions` table in camelCase (`producteur`, `titre`, `dureeMinutes`,
`typeProduction`, `totalDevis`, `coutMinute`, `grilleCnc`, `meta`, `verificationMinima`,
`anomalies`, `dateDevis`, `formatSource`, `cncFunding`). Then either point the demo seeder
at it (`DEMO_DATASET_PATH=my-history.json node scripts/seed-demo.mjs`) or copy
`scripts/seed-demo.ts` and adapt it. Use a distinct `formatSource` so re-runs only replace
your rows.

### Spreadsheet (one sheet per production)

`npm run db:seed:xlsm` reads `HISTORY_XLSM_PATH` (default `documents/history.xlsm`; the
`documents/` folder is gitignored) with `scripts/parse-history-xlsm.ts`, which locates rows
by their labels (`SOUS-TOTAL ENSEMBLE DES DROITS ARTISTIQUES`, personnel rows with days ×
daily rate, social charges, transport, technical means, post-production, insurance,
contingencies/overheads). Adapt `ROW_LABELS` and `src/lib/analytics/seed-job-mapping.ts` to
your own row labels. Every imported production gets `HISTORY_XLSM_PRODUCTION_TYPE`
(default `Reportage`) and `formatSource = "seed-history"`; lump sums encoded as
`1 day × total` are detected and tagged `forfait`.

### Building an anonymised dataset from real data

`scripts/anonymize-history-to-demo.ts` turns a real spreadsheet into a fictional JSON:
producers are renamed through a mapping file you provide at
`documents/producer-rename.json` (`{"Real Producer": {"alias": "Studio Alpha", "count": 6}}`),
titles are replaced, production types cycled and a subset sampled. **Never commit the
mapping file** — it links real names to their aliases. Amounts are kept as-is; review the
output before publishing it if your amounts are themselves confidential.
