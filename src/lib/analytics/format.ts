/** Integer amounts in French locale (e.g. 12 345 €) */
export const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Daily rates with 2 decimal places (e.g. 281,54 €/j) */
export const fmtRate = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Short date in French locale (e.g. 3 janv. 2024) */
export const fmtDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Percentage formatted to one decimal (e.g. "12.3%") */
export const fmtPct = (value: number) => `${(value * 100).toFixed(1)}%`;
