/**
 * Anonymizer (maintainers only, one-shot)
 *
 * Reads a real, gitignored history spreadsheet, applies a deterministic
 * anonymization pass (rename producers, replace titles, sample a subset),
 * and writes demo-data/history.json — a committable, fully fictional dataset.
 *
 * The producer rename map is deliberately NOT in the repository: it links real
 * company names to their fictional aliases. Provide it as
 * documents/producer-rename.json (gitignored), shape:
 *   { "Real Producer Ltd": { "alias": "Studio Alpha", "count": 6 }, ... }
 * Producers absent from the map are dropped; `count` is how many of their
 * productions to sample.
 *
 * Run from the project root:
 *   HISTORY_XLSM_PATH=documents/history.xlsm npx tsx scripts/anonymize-history-to-demo.ts
 *
 * Adopters never need this: they use the committed JSON via
 * `npm run db:seed:demo`, or write their own dataset in the same shape.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { consola } from "consola";
import { parseAllProductions, type ParsedProduction } from "./parse-history-xlsm";

const SOURCE_XLSM = process.env.HISTORY_XLSM_PATH ?? "documents/history.xlsm";
const OUTPUT_JSON = "demo-data/history.json";

const RENAME_MAP_PATH = process.env.PRODUCER_RENAME_PATH ?? "documents/producer-rename.json";

interface RenameEntry {
  alias: string;
  count: number;
}

function loadRenameMap(): { rename: Record<string, string>; targetCount: Record<string, number> } {
  if (!existsSync(RENAME_MAP_PATH)) {
    throw new Error(`Missing ${RENAME_MAP_PATH} — see the header of this script for its shape.`);
  }
  const entries = JSON.parse(readFileSync(RENAME_MAP_PATH, "utf8")) as Record<string, RenameEntry>;
  const rename: Record<string, string> = {};
  const targetCount: Record<string, number> = {};
  for (const [real, { alias, count }] of Object.entries(entries)) {
    rename[real] = alias;
    targetCount[alias] = count;
  }
  return { rename, targetCount };
}

const { rename: PRODUCER_RENAME, targetCount: PRODUCER_TARGET_COUNT } = loadRenameMap();

// Generic production types replacing the source spreadsheet's single label.
// The cycle gives the demo realistic variety in the
// /analytics/types filter and /settings/types page.
const GENERIC_TYPES = [
  "Reportage",
  "Reportage",
  "Reportage",
  "Documentaire",
  "Reportage",
  "Magazine",
];

// Fictional documentary titles. Plausible-sounding French reportage names.
// Order is the assignment order; first production assigned title[0], etc.
const FICTIONAL_TITLES = [
  "Les sentinelles de la mer",
  "Au-delà des dunes",
  "Chroniques d'un fleuve",
  "Les artisans du silence",
  "Mémoires de la steppe",
  "Au pays des oiseaux blancs",
  "Le chant des forêts",
  "L'or des hauteurs",
  "Pénombres et clairs-obscurs",
  "Une autre Méditerranée",
  "Au seuil des nuages",
  "Les voix de la lagune",
  "Le dernier ferry",
  "Au bout du rail",
  "Les enfants du nord",
  "Cartographies intimes",
  "Le souffle des plaines",
  "Vies parallèles",
  "L'écho des montagnes",
  "Marchés flottants",
  "Saisons interrompues",
  "Les heures bleues",
  "Routes oubliées",
  "Sous le vent de l'est",
  "Le rivage des absents",
  "L'horloge du delta",
  "Veilles polaires",
  "Le pas des nomades",
  "Aux confins du désert",
  "Le ciel et la pierre",
];

interface DemoProduction extends Omit<ParsedProduction, "meta"> {
  meta: Record<string, unknown>;
}

function anonymize(records: ParsedProduction[]): DemoProduction[] {
  // 1. Filter to renamed producers
  const eligible = records.filter((r) => PRODUCER_RENAME[r.producteur]);

  // 2. Group by source producer, deterministically sample target count from each
  const byProducer = new Map<string, ParsedProduction[]>();
  for (const r of eligible) {
    const list = byProducer.get(r.producteur) ?? [];
    list.push(r);
    byProducer.set(r.producteur, list);
  }

  const selected: ParsedProduction[] = [];
  for (const [source, list] of byProducer) {
    const fakeName = PRODUCER_RENAME[source];
    const target = PRODUCER_TARGET_COUNT[fakeName] ?? 0;
    // Sort by title for determinism (input XLSM iteration order isn't guaranteed)
    list.sort((a, b) => a.titre.localeCompare(b.titre));
    selected.push(...list.slice(0, target));
  }

  // 3. Apply rename + title replacement + generic type
  return selected.map((r, i) => {
    const newProducer = PRODUCER_RENAME[r.producteur];
    const newTitle = FICTIONAL_TITLES[i % FICTIONAL_TITLES.length];
    const newType = GENERIC_TYPES[i % GENERIC_TYPES.length];

    const meta = r.meta as Record<string, unknown>;
    return {
      ...r,
      producteur: newProducer,
      titre: newTitle,
      typeProduction: newType,
      formatSource: "seed-demo",
      meta: {
        ...meta,
        producteur: newProducer,
        titre: newTitle,
        type_production: newType,
      },
    };
  });
}

function main() {
  consola.info(`Parsing source XLSM: ${SOURCE_XLSM}`);
  const records = parseAllProductions(SOURCE_XLSM);
  consola.info(`Parsed ${records.length} productions from source`);

  const demo = anonymize(records);
  consola.info(`Selected ${demo.length} productions across ${new Set(demo.map((d) => d.producteur)).size} fictional producers`);

  mkdirSync(dirname(OUTPUT_JSON), { recursive: true });
  writeFileSync(OUTPUT_JSON, JSON.stringify(demo, null, 2), "utf8");
  consola.success(`Wrote ${OUTPUT_JSON}`);

  // Sanity: show distribution
  const counts: Record<string, number> = {};
  for (const r of demo) counts[r.producteur] = (counts[r.producteur] ?? 0) + 1;
  consola.box(
    Object.entries(counts)
      .map(([p, n]) => `${p}: ${n}`)
      .join("\n"),
  );
}

main();
