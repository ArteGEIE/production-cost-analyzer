"use client";

import { Info } from "lucide-react";
import { Popover, PopoverTrigger, PopoverPopup } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface InfoTipProps {
  children: React.ReactNode;
  /** Optional extra class on the trigger icon */
  className?: string;
  /** Icon size in pixels (default 14) */
  size?: number;
}

/**
 * Small info icon (ⓘ) that opens a popover with contextual help text.
 * Use this to explain jargon, metrics, or features inline.
 *
 * Usage:
 *   <InfoTip>Explanation text here</InfoTip>
 */
export function InfoTip({ children, className, size = 14 }: InfoTipProps) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-help",
          className,
        )}
        aria-label="Plus d'informations"
      >
        <Info size={size} />
      </PopoverTrigger>
      <PopoverPopup className="max-w-xs text-sm leading-relaxed text-muted-foreground">
        {children}
      </PopoverPopup>
    </Popover>
  );
}
