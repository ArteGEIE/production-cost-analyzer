"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  footer?: ReactNode;
  sidebar?: ReactNode;
  fullWidth?: boolean;
  className?: string;
}

/**
 * App shell providing the main layout structure:
 * - Optional collapsible sidebar (left slot)
 * - Scrollable main content area
 * - Optional sticky footer for actions/CTAs
 */
export function AppShell({ children, footer, sidebar, fullWidth, className }: AppShellProps) {
  const footerWidth = "mx-auto max-w-4xl px-4 py-3";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {sidebar}
        {fullWidth ? (
          <main className={cn("flex-1 overflow-hidden", className)}>
            {children}
          </main>
        ) : (
          <main className={cn("flex-1 overflow-y-auto", className)}>
            <div className="mx-auto max-w-4xl px-4 py-8">
              {children}
            </div>
          </main>
        )}
      </div>

      {footer && (
        <div className="sticky bottom-0 z-10 border-t bg-background/80 backdrop-blur-lg">
          <div className={footerWidth}>
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}
