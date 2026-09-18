import { getProductionTypes } from "@/lib/db/queries-settings";
import { ProductionTypesForm } from "@/components/settings/production-types-form";
import { db } from "@/lib/db";
import { productions } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export default async function TypesPage() {
  const types = await getProductionTypes();

  // Get types that are actually used in productions (to prevent deletion)
  const usedRows = await db
    .selectDistinct({ typeProduction: productions.typeProduction })
    .from(productions)
    .where(sql`${productions.typeProduction} IS NOT NULL`);
  const usedTypes = usedRows.map((r) => r.typeProduction).filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <ProductionTypesForm types={types} usedTypes={usedTypes} />
    </div>
  );
}
