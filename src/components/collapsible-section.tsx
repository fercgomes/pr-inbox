"use client";

import type { ReactNode } from "react";
import { analytics } from "@/lib/analytics";

type CollapsibleSectionProps = {
  index: string;
  title: string;
  count: number;
  color: string;
  defaultOpen: boolean;
  children: ReactNode;
};

export function CollapsibleSection({
  index,
  title,
  count,
  color,
  defaultOpen,
  children,
}: CollapsibleSectionProps) {
  return (
    <details
      open={defaultOpen}
      className="group border-2 border-zinc-950"
      onToggle={(event) => {
        analytics.capture("section_toggled", {
          section: title,
          is_open: event.currentTarget.open,
        });
      }}
    >
      <summary className="grid cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4 sm:p-5">
        <span className={`flex size-11 items-center justify-center font-mono text-sm font-bold ${color}`}>{index}</span>
        <h2 className="text-lg font-semibold tracking-[-0.03em] sm:text-xl">{title}</h2>
        <div className="flex items-center gap-4">
          <span className="font-mono text-2xl font-bold">{count}</span>
          <span className="text-2xl transition-transform group-open:rotate-45">+</span>
        </div>
      </summary>
      {children}
    </details>
  );
}
