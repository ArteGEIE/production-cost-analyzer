"use client";

import { useCallback, useMemo, useState } from "react";
import type { DevisExtraction, GrilleCnc, Meta, PosteNonClasse } from "@/lib/schemas/devis";
import type { CcRates } from "@/lib/config/cc-minimums";
import type { ThresholdConfig } from "@/lib/db/queries-settings";
import {
  calculateTotalDevis,
  calculateCoutMinute,
  recalculatePersonnelLineTotal,
} from "@/lib/calculations/totals";
import { computeCompliance } from "@/lib/anomalies/anomaly-engine";

/** A line that was moved from unclassified into a CNC category */
export interface ClassifiedLine {
  poste: string;
  montant: number;
}

export interface UseReviewFormReturn {
  meta: Meta;
  grilleCnc: GrilleCnc;
  postesNonClasses: PosteNonClasse[];
  classifiedItems: Record<string, ClassifiedLine[]>;
  totalDevis: number;
  coutMinute: number;
  isDirty: boolean;
  updateMeta: (patch: Partial<Meta>) => void;
  updateGrilleCnc: (patch: Partial<GrilleCnc>) => void;
  updatePersonnelLine: (index: number, patch: Partial<GrilleCnc["2_personnel"]["postes"][0]>) => void;
  addLine: (categoryKey: string) => void;
  deleteLine: (categoryKey: string, index: number) => void;
  classifyItem: (index: number, targetCategory: keyof GrilleCnc) => void;
  updateClassifiedLine: (category: string, lineIndex: number, montant: number) => void;
  removeClassifiedLine: (category: string, lineIndex: number) => void;
  moveLine: (fromCategory: string, lineIndex: number, toCategory: string) => void;
  toDevisExtraction: () => DevisExtraction;
}

/**
 * Normalize postes_non_classes from either string[] or PosteNonClasse[]
 * to always use the structured format.
 */
function normalizePostesNonClasses(
  items: DevisExtraction["postes_non_classes"],
): PosteNonClasse[] {
  if (!items || items.length === 0) return [];
  if (typeof items[0] === "string") {
    return (items as string[]).map((s) => ({ poste: s, montant: 0 }));
  }
  return items as PosteNonClasse[];
}

export function useReviewForm(initial: DevisExtraction, ccRates: CcRates, thresholds: ThresholdConfig): UseReviewFormReturn {
  const [meta, setMeta] = useState<Meta>({ ...initial.meta });
  const [grilleCnc, setGrilleCnc] = useState<GrilleCnc>({ ...initial.grille_cnc });
  const [postesNonClasses, setPostesNonClasses] = useState<PosteNonClasse[]>(
    normalizePostesNonClasses(initial.postes_non_classes),
  );
  const [classifiedItems, setClassifiedItems] = useState<Record<string, ClassifiedLine[]>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Total = CNC grid totals + classified line amounts
  const classifiedTotal = useMemo(
    () => Object.values(classifiedItems).flat().reduce((sum, l) => sum + l.montant, 0),
    [classifiedItems],
  );
  const totalDevis = useMemo(
    () => calculateTotalDevis(grilleCnc) + classifiedTotal,
    [grilleCnc, classifiedTotal],
  );
  const coutMinute = useMemo(
    () => calculateCoutMinute(totalDevis, meta.duree_minutes),
    [totalDevis, meta.duree_minutes],
  );

  const updateMeta = useCallback((patch: Partial<Meta>) => {
    setMeta((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  }, []);

  const updateGrilleCnc = useCallback((patch: Partial<GrilleCnc>) => {
    setGrilleCnc((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  }, []);

  const updatePersonnelLine = useCallback(
    (index: number, patch: Partial<GrilleCnc["2_personnel"]["postes"][0]>) => {
      setGrilleCnc((prev) => {
        const personnel = { ...prev["2_personnel"] };
        const postes = [...personnel.postes];
        const updated = { ...postes[index], ...patch };
        updated.total = recalculatePersonnelLineTotal(updated);
        postes[index] = updated;
        const total = postes.reduce((sum, p) => sum + p.total, 0);
        return { ...prev, "2_personnel": { postes, total } };
      });
      setIsDirty(true);
    },
    [],
  );

  const addLine = useCallback(
    (categoryKey: string) => {
      setGrilleCnc((prev) => {
        if (categoryKey === "2_personnel") {
          const personnel = { ...prev["2_personnel"] };
          const postes = [...personnel.postes, {
            poste: "",
            role_key: "",
            nombre_jours: 0,
            tarif_journalier: 0,
            total: 0,
            type_contrat: "salarie" as const,
          }];
          return { ...prev, "2_personnel": { postes, total: personnel.total } };
        }
        const cat = prev[categoryKey as keyof GrilleCnc] as { lignes: { poste: string; montant: number }[]; total: number };
        const lignes = [...cat.lignes, { poste: "", montant: 0 }];
        return { ...prev, [categoryKey]: { ...cat, lignes } } as unknown as GrilleCnc;
      });
      setIsDirty(true);
    },
    [],
  );

  const deleteLine = useCallback(
    (categoryKey: string, index: number) => {
      setGrilleCnc((prev) => {
        if (categoryKey === "2_personnel") {
          const personnel = { ...prev["2_personnel"] };
          const postes = personnel.postes.filter((_, i) => i !== index);
          const total = postes.reduce((sum, p) => sum + p.total, 0);
          return { ...prev, "2_personnel": { postes, total } };
        }
        const cat = prev[categoryKey as keyof GrilleCnc] as { lignes: { poste: string; montant: number }[]; total: number };
        const lignes = cat.lignes.filter((_, i) => i !== index);
        const total = lignes.reduce((sum, l) => sum + l.montant, 0);
        return { ...prev, [categoryKey]: { ...cat, lignes, total } } as unknown as GrilleCnc;
      });
      setIsDirty(true);
    },
    [],
  );

  const classifyItem = useCallback(
    (index: number, targetCategory: keyof GrilleCnc) => {
      setPostesNonClasses((prev) => {
        const item = prev[index];

        // Add as a classified line with amount 0 — the amount is likely already
        // in the category total. User can edit it if it wasn't counted.
        setClassifiedItems((prevClassified) => {
          const lines = [...(prevClassified[targetCategory] ?? [])];
          lines.push({ poste: item?.poste ?? "Poste classé", montant: 0 });
          return { ...prevClassified, [targetCategory]: lines };
        });

        return prev.filter((_, i) => i !== index);
      });

      setIsDirty(true);
    },
    [],
  );

  const updateClassifiedLine = useCallback(
    (category: string, lineIndex: number, montant: number) => {
      setClassifiedItems((prev) => {
        const lines = [...(prev[category] ?? [])];
        lines[lineIndex] = { ...lines[lineIndex], montant };
        return { ...prev, [category]: lines };
      });
      setIsDirty(true);
    },
    [],
  );

  const removeClassifiedLine = useCallback(
    (category: string, lineIndex: number) => {
      setClassifiedItems((prev) => {
        const lines = (prev[category] ?? []).filter((_, i) => i !== lineIndex);
        const updated = { ...prev };
        if (lines.length === 0) {
          delete updated[category];
        } else {
          updated[category] = lines;
        }
        return updated;
      });
      setIsDirty(true);
    },
    [],
  );

  const moveLine = useCallback(
    (fromCategory: string, lineIndex: number, toCategory: string) => {
      setGrilleCnc((prev) => {
        const next = { ...prev };
        const isFromPersonnel = fromCategory === "2_personnel";

        // Extract the line from source category
        let poste: string;
        let montant: number;

        if (isFromPersonnel) {
          const personnel = { ...prev["2_personnel"] };
          const postes = [...personnel.postes];
          const removed = postes.splice(lineIndex, 1)[0];
          poste = removed.poste;
          montant = removed.total;
          personnel.postes = postes;
          personnel.total = postes.reduce((sum, p) => sum + p.total, 0);
          next["2_personnel"] = personnel;
        } else {
          const source = prev[fromCategory as keyof GrilleCnc] as { lignes: { poste: string; montant: number }[]; total: number };
          const lignes = [...source.lignes];
          const removed = lignes.splice(lineIndex, 1)[0];
          poste = removed.poste;
          montant = removed.montant;
          const total = lignes.reduce((sum, l) => sum + l.montant, 0);
          (next as Record<string, unknown>)[fromCategory] = { ...source, lignes, total };
        }

        // Add the line to target category
        const isToPersonnel = toCategory === "2_personnel";
        if (isToPersonnel) {
          const personnel = { ...next["2_personnel"] };
          const postes = [...personnel.postes];
          postes.push({
            poste,
            role_key: "",
            nombre_jours: 1,
            tarif_journalier: montant,
            total: montant,
            type_contrat: "salarie",
          });
          personnel.postes = postes;
          personnel.total = postes.reduce((sum, p) => sum + p.total, 0);
          next["2_personnel"] = personnel;
        } else {
          const target = next[toCategory as keyof GrilleCnc] as { lignes: { poste: string; montant: number }[]; total: number };
          const lignes = [...target.lignes, { poste, montant }];
          const total = lignes.reduce((sum, l) => sum + l.montant, 0);
          (next as Record<string, unknown>)[toCategory] = { ...target, lignes, total };
        }

        return next as GrilleCnc;
      });
      setIsDirty(true);
    },
    [],
  );

  const toDevisExtraction = useCallback((): DevisExtraction => {
    // Fold classifiedItems back into the CNC grid so category totals stay consistent
    let mergedGrille = grilleCnc;
    for (const [category, lines] of Object.entries(classifiedItems)) {
      if (lines.length === 0) continue;
      const cat = mergedGrille[category as keyof GrilleCnc];
      if (!cat || !("lignes" in cat)) continue;
      const newLignes = [
        ...cat.lignes,
        ...lines.map((l) => ({ poste: l.poste, montant: l.montant })),
      ];
      const newTotal = cat.total + lines.reduce((sum, l) => sum + l.montant, 0);
      mergedGrille = { ...mergedGrille, [category]: { ...cat, lignes: newLignes, total: newTotal } };
    }

    const partial: DevisExtraction = {
      meta,
      grille_cnc: mergedGrille,
      total_devis: totalDevis,
      cout_minute: coutMinute,
      verification_minima: [],
      anomalies: [],
      postes_non_classes: postesNonClasses,
      confiance: initial.confiance,
    };

    const { verificationMinima, anomalies } = computeCompliance(partial, ccRates, thresholds);

    return {
      ...partial,
      verification_minima: verificationMinima,
      anomalies,
    };
  }, [meta, grilleCnc, classifiedItems, totalDevis, coutMinute, postesNonClasses, initial.confiance, ccRates, thresholds]);

  return {
    meta,
    grilleCnc,
    postesNonClasses,
    classifiedItems,
    totalDevis,
    coutMinute,
    isDirty,
    updateMeta,
    updateGrilleCnc,
    updatePersonnelLine,
    addLine,
    deleteLine,
    classifyItem,
    updateClassifiedLine,
    removeClassifiedLine,
    moveLine,
    toDevisExtraction,
  };
}
