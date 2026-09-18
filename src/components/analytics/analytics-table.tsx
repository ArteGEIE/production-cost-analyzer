"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  label: string;
  tooltip?: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string;
}

interface AnalyticsTableProps<T> {
  columns: Column<T>[];
  data: T[];
  defaultSortKey?: string;
  defaultSortDir?: "asc" | "desc";
  onRowClick?: (row: T) => void;
  rowHref?: (row: T) => string;
  emptyMessage?: string;
}

export function AnalyticsTable<T>({
  columns,
  data,
  defaultSortKey,
  defaultSortDir = "desc",
  onRowClick,
  rowHref,
  emptyMessage,
}: AnalyticsTableProps<T>) {
  const t = useTranslations("analytics.table");
  const resolvedEmptyMessage = emptyMessage ?? t("emptyDefault");
  const router = useRouter();
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return data;

    return [...data].sort((a, b) => {
      const aVal = col.sortValue!(a);
      const bVal = col.sortValue!(b);

      let cmp: number;
      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }

      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, columns, sortKey, sortDir]);

  function handleHeaderClick(col: Column<T>) {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("desc");
    }
  }

  function handleRowClick(row: T) {
    if (rowHref) {
      router.push(rowHref(row));
    } else if (onRowClick) {
      onRowClick(row);
    }
  }

  const isClickable = Boolean(rowHref || onRowClick);

  const alignClass = {
    left: "text-left",
    right: "text-right",
    center: "text-center",
  } as const;

  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-2.5 font-medium text-muted-foreground",
                  col.align ? alignClass[col.align] : "text-left",
                )}
                aria-sort={
                  col.sortable && sortKey === col.key
                    ? sortDir === "asc" ? "ascending" : "descending"
                    : undefined
                }
              >
                {col.sortable ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 select-none hover:text-foreground w-full"
                    onClick={() => handleHeaderClick(col)}
                    title={col.tooltip}
                  >
                    {col.label}
                    {sortKey === col.key && (
                      sortDir === "asc"
                        ? <ChevronUp className="h-3.5 w-3.5" />
                        : <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1" title={col.tooltip}>
                    {col.label}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-muted-foreground"
              >
                {resolvedEmptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  "border-b last:border-0 transition-colors",
                  isClickable && "cursor-pointer hover:bg-muted/30"
                )}
                onClick={isClickable ? () => handleRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-2.5",
                      col.align ? alignClass[col.align] : "text-left"
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
