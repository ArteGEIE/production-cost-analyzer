// src/lib/dashboard/compute-dashboard-data.ts

interface ProductionRow {
  id: number;
  producteur: string;
  titre: string;
  typeProduction: string | null;
  totalDevis: number | null;
  coutMinute: number | null;
  confiance: string | null;
  createdAt: string;
  dateDevis: string | null;
  anomalies: unknown;
  verificationMinima: unknown;
}

export interface DashboardData {
  totalCount: number;
  alertCount: number;
  avgCoutMinute: number;
  producerCount: number;
  chartData: { name: string; avgCoutMinute: number }[];
  recent: ProductionRow[];
}

export function computeDashboardData(productions: ProductionRow[]): DashboardData {
  const totalCount = productions.length;

  const alertCount = productions.filter((p) => {
    // Check anomalies array for R1 codes
    if (Array.isArray(p.anomalies) && p.anomalies.some((a: { code?: string }) => a.code === "R1")) {
      return true;
    }
    // Check verification_minima for non_conforme statuses (seeded data stores alerts here)
    if (Array.isArray(p.verificationMinima)) {
      return p.verificationMinima.some((v: { statut?: string }) => v.statut === "non_conforme");
    }
    return false;
  }).length;

  const withCost = productions.filter((p) => p.coutMinute != null);
  const avgCoutMinute =
    withCost.length > 0
      ? withCost.reduce((sum, p) => sum + p.coutMinute!, 0) / withCost.length
      : 0;

  const producerCount = new Set(productions.map((p) => p.producteur)).size;

  const byProducer = new Map<string, ProductionRow[]>();
  for (const p of productions) {
    const list = byProducer.get(p.producteur) ?? [];
    list.push(p);
    byProducer.set(p.producteur, list);
  }

  const chartData = [...byProducer.entries()]
    .map(([name, prods]) => {
      const valid = prods.filter((p) => p.coutMinute != null);
      return {
        name,
        avgCoutMinute:
          valid.length > 0
            ? valid.reduce((s, p) => s + p.coutMinute!, 0) / valid.length
            : 0,
      };
    })
    .sort((a, b) => b.avgCoutMinute - a.avgCoutMinute);

  const recent = [...productions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10);

  return { totalCount, alertCount, avgCoutMinute, producerCount, chartData, recent };
}
