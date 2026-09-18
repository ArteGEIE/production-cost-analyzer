import { getAllProductions } from "@/lib/db/queries";
import { getProductionTypes } from "@/lib/db/queries-settings";
import { ProductionList } from "@/components/production-list";

export default async function ProductionsPage() {
  const [productions, types] = await Promise.all([
    getAllProductions(),
    getProductionTypes(),
  ]);
  return <ProductionList productions={productions} availableTypes={types} />;
}
