# Test fixtures

This directory contains test fixtures for manual integration testing.

## Sample budgets

To test US-1, you need PDF budget estimates. Three sample scenarios are documented below with expected extraction results in JSON format:

- `devis-fr-expected.json` — French budget (Les Films du Rhin, 52 min documentary)
- `devis-de-expected.json` — German budget (Berliner Dokfilm GmbH, 26 min reportage)
- `devis-en-expected.json` — English budget (Thames Productions Ltd, 30 min documentary)

Place the corresponding PDF files in this directory:
- `devis-fr-sample.pdf`
- `devis-de-sample.pdf`
- `devis-en-sample.pdf`

## Creating test PDFs

Use any word processor or spreadsheet to create a budget PDF with:
1. A header with producer name, address, production title, duration
2. A table with line items (job title, days, daily rate, total)
3. Category subtotals and a grand total

The structure should vary between producers to simulate real-world heterogeneity.
