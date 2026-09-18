"use client";

import { fmt } from "@/lib/analytics/format";

interface SubcategoryBarsProps {
  items: Array<{ name: string; avgAmount: number; count: number }>;
}

export function SubcategoryBars({ items }: SubcategoryBarsProps) {
  if (items.length === 0) return null;
  const max = Math.max(...items.map((i) => i.avgAmount));

  return (
    <div className="mt-2 space-y-1">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-xs">
          <span className="w-32 truncate text-muted-foreground" title={item.name}>
            {item.name}
          </span>
          <div className="flex-1 h-3 bg-muted rounded-sm overflow-hidden">
            <div
              className="h-full bg-primary/30 rounded-sm"
              style={{ width: `${(item.avgAmount / max) * 100}%` }}
            />
          </div>
          <span className="w-20 text-right tabular-nums font-mono">
            {fmt.format(item.avgAmount)} €
          </span>
        </div>
      ))}
    </div>
  );
}
