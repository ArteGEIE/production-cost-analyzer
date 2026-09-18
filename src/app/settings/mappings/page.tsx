import { getCncMapping } from "@/lib/db/queries-settings";
import { CncMappingForm } from "@/components/settings/cnc-mapping-form";

export default async function MappingsPage() {
  const mapping = await getCncMapping();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <CncMappingForm mapping={mapping} />
    </div>
  );
}
