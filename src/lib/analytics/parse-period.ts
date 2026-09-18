/**
 * Parses `from` and `to` search params (YYYY-MM format) into a date range.
 * Returns undefined if either param is missing.
 */
export function parsePeriod(params: Record<string, string | undefined>) {
  const from = params.from ? new Date(params.from + "-01") : undefined;
  const to = params.to
    ? (() => {
        const [y, m] = params.to!.split("-").map(Number);
        const d = new Date(y, m, 0);
        d.setHours(23, 59, 59, 999);
        return d;
      })()
    : undefined;
  return from && to ? { from, to } : undefined;
}
