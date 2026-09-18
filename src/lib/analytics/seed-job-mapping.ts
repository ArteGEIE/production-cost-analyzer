/**
 * Maps XLSM job labels (as found in the historical data file) to role_key values
 * from cnc-mapping.ts. Used by the seed script to assign structured role keys
 * to individual personnel rows parsed from the XLSM file.
 */
const XLSX_LABEL_TO_ROLE_KEY: Record<string, string> = {
  producteur: "producteur",
  administrateur: "administrateur_de_production",
  "dir. prod": "directeur_de_production",
  "charge de prod": "charge_de_production",
  "responsable post prod": "charge_de_post_production",
  "assistant prod": "assistant_de_production",
  realisateur: "realisateur",
  "co real": "co_realisateur",
  "journaliste-real": "journaliste_real",
  "assitant real": "assistant_realisateur",
  "redacteur en chef": "redacteur_chef",
  "stringer/fixeur": "stringer_fixeur",
  jri: "jri",
  auteur: "auteur",
  cadreur: "cadreur_opv",
  "chef op": "cadreur_opv",
  "monteur / monteur truquiste": "chef_monteur",
  "technicien video": "technicien_video",
  "assitant postprod": "assistant_de_post_production",
  "inge son": "chef_ops_ingenieur_du_son",
  etalonneur: "etalonneur",
  "doublage/speaker": "doublage_speaker",
  "equipe tournage": "equipe_tournage",
  "equipe montage": "equipe_montage",
};

export function mapXlsxLabelToRoleKey(label: string): string | null {
  const normalized = label.trim().toLowerCase();
  return XLSX_LABEL_TO_ROLE_KEY[normalized] ?? null;
}
