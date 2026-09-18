/**
 * Shared UI configuration for compliance display — severity colors,
 * statut labels, and icons used by both the review page and compliance page.
 */
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

export const severityConfig = {
  "ÉLEVÉE": { icon: AlertCircle, variant: "destructive" as const, color: "bg-red-100 text-red-800" },
  "ATTENTION": { icon: AlertTriangle, variant: "default" as const, color: "bg-yellow-100 text-yellow-800" },
  "INFO": { icon: Info, variant: "default" as const, color: "bg-blue-100 text-blue-800" },
};

export const statutConfig: Record<string, { label: string; color: string; tooltip: string }> = {
  conforme: { label: "Conforme", color: "bg-green-100 text-green-800", tooltip: "Tarif supérieur ou égal au minimum conventionnel" },
  non_conforme: { label: "Non conforme", color: "bg-red-100 text-red-800", tooltip: "Tarif inférieur au minimum conventionnel" },
  non_verifiable_forfait: { label: "Forfait", color: "bg-gray-100 text-gray-600", tooltip: "Montant forfaitaire — vérification CC non applicable" },
  hors_nomenclature: { label: "Hors nomenclature", color: "bg-gray-100 text-gray-600", tooltip: "Ce poste n'est pas référencé dans la grille CC" },
  non_verifiable_prestataire: { label: "Prestataire", color: "bg-gray-100 text-gray-600", tooltip: "Prestation externe — vérification CC non applicable" },
  non_verifiable_etranger: { label: "Soc. étrangère", color: "bg-gray-100 text-gray-600", tooltip: "Société étrangère — conventions collectives françaises non applicables" },
};
