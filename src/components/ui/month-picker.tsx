"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { Popover, PopoverTrigger, PopoverPopup } from "./popover"

interface MonthPickerProps {
  /** Current value as "YYYY-MM" string, or "" if unset */
  value: string
  /** Called with "YYYY-MM" string when user picks a month */
  onChange: (value: string) => void
  /** Placeholder when no value */
  placeholder?: string
  /** Maximum selectable month as "YYYY-MM" (defaults to current month) */
  maxMonth?: string
}

function parseYearMonth(value: string): { year: number; month: number } | null {
  if (!value) return null
  const [y, m] = value.split("-").map(Number)
  return y && m ? { year: y, month: m } : null
}

function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

function getCurrentMonth(): string {
  const now = new Date()
  return formatYearMonth(now.getFullYear(), now.getMonth() + 1)
}

export function MonthPicker({ value, onChange, placeholder, maxMonth }: MonthPickerProps) {
  const t = useTranslations("monthPicker")
  const monthLabels = t.raw("months") as string[]
  const resolvedPlaceholder = placeholder ?? t("placeholder")
  const parsed = parseYearMonth(value)
  const max = parseYearMonth(maxMonth ?? getCurrentMonth())!
  const [viewYear, setViewYear] = useState(parsed?.year ?? new Date().getFullYear())
  const [open, setOpen] = useState(false)

  const displayLabel = parsed
    ? `${monthLabels[parsed.month - 1]} ${parsed.year}`
    : resolvedPlaceholder

  function handleSelect(month: number) {
    onChange(formatYearMonth(viewYear, month))
    setOpen(false)
  }

  function isFuture(month: number): boolean {
    return viewYear > max.year || (viewYear === max.year && month > max.month)
  }

  const canGoForward = viewYear < max.year

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-sm hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
      >
        <CalendarIcon className="size-3.5 text-muted-foreground" />
        <span className={parsed ? "" : "text-muted-foreground"}>{displayLabel}</span>
      </PopoverTrigger>
      <PopoverPopup className="w-56">
        {/* Year navigation */}
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setViewYear((y) => y - 1)}
            className="rounded p-1 hover:bg-muted"
            aria-label={t("previousYear")}
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-medium">{viewYear}</span>
          <button
            type="button"
            onClick={() => canGoForward && setViewYear((y) => y + 1)}
            className={`rounded p-1 ${canGoForward ? "hover:bg-muted" : "opacity-30 cursor-not-allowed"}`}
            aria-label={t("nextYear")}
            aria-disabled={!canGoForward}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-4 gap-1">
          {monthLabels.map((label, i) => {
            const month = i + 1
            const isSelected = parsed?.year === viewYear && parsed?.month === month
            const disabled = isFuture(month)
            return (
              <button
                key={month}
                type="button"
                onClick={() => !disabled && handleSelect(month)}
                disabled={disabled}
                className={`rounded px-1 py-1.5 text-xs transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-medium"
                    : disabled
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : "hover:bg-muted"
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </PopoverPopup>
    </Popover>
  )
}
