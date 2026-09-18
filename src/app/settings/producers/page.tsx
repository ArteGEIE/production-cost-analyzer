import { getProducersWithCount } from "@/lib/db/queries";
import { ProducersTable } from "@/components/settings/producers-table";

export default async function ProducersPage() {
  const producers = await getProducersWithCount();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <ProducersTable producers={producers} />
    </div>
  );
}
