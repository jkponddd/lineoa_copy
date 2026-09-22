"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DayBucket = { date: string; inbound: number; outbound: number };

// Grouped bar chart, plain HTML/CSS (no charting library — 14 fixed points,
// two series, doesn't warrant the dependency). Follows the dataviz skill's
// mark specs: bars capped at 24px, 4px rounded data-end at the top only,
// square at the baseline, a 2px surface gap between the two bars in a
// group, hairline gridlines, a legend (required for 2+ series), and a
// hover/focus tooltip per day — plus a table view as the required
// accessible fallback so every value stays reachable without hovering.
export function MessagesChart({ data }: { data: DayBucket[] }) {
  const t = useTranslations("reports");
  const [hovered, setHovered] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const max = Math.max(1, ...data.map((d) => Math.max(d.inbound, d.outbound)));
  const gridTicks = [0, Math.round(max / 2), max];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Legend />
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)}>
          {showTable ? t("chartViewToggleChart") : t("chartViewToggleTable")}
        </Button>
      </div>

      {showTable ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("chartTableDate")}</TableHead>
              <TableHead>{t("chartInbound")}</TableHead>
              <TableHead>{t("chartOutbound")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((day) => (
              <TableRow key={day.date}>
                <TableCell>{formatDayLabel(day.date)}</TableCell>
                <TableCell className="tabular-nums">{day.inbound}</TableCell>
                <TableCell className="tabular-nums">{day.outbound}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="flex gap-3">
          {/* Y-axis ticks */}
          <div className="flex h-48 flex-col justify-between py-0 text-xs text-muted-foreground">
            {gridTicks
              .slice()
              .reverse()
              .map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
          </div>

          <div className="relative flex h-48 flex-1 gap-1">
            {/* Gridlines */}
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              {gridTicks
                .slice()
                .reverse()
                .map((tick) => (
                  <div key={tick} className="border-t border-border" />
                ))}
            </div>

            {data.map((day, index) => {
              const inboundPct = (day.inbound / max) * 100;
              const outboundPct = (day.outbound / max) * 100;
              const isHovered = hovered === index;

              return (
                <button
                  key={day.date}
                  type="button"
                  className={cn(
                    "group relative flex flex-1 items-end justify-center gap-0.5 rounded-sm outline-none",
                    isHovered && "bg-muted/60",
                  )}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(index)}
                  onBlur={() => setHovered(null)}
                  aria-label={`${formatDayLabel(day.date)}: ${t("chartInbound")} ${day.inbound}, ${t("chartOutbound")} ${day.outbound}`}
                >
                  <span
                    className="w-full max-w-6 rounded-t-[4px] bg-[var(--chart-1)]"
                    style={{ height: `${day.inbound > 0 ? Math.max(inboundPct, 2) : 0}%` }}
                  />
                  <span
                    className="w-full max-w-6 rounded-t-[4px] bg-[var(--chart-2)]"
                    style={{ height: `${day.outbound > 0 ? Math.max(outboundPct, 2) : 0}%` }}
                  />

                  {isHovered ? (
                    <div className="pointer-events-none absolute bottom-full z-10 mb-2 w-max min-w-32 rounded-md border bg-popover p-2 text-left text-xs shadow-md">
                      <p className="mb-1 font-medium text-popover-foreground">{formatDayLabel(day.date)}</p>
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="inline-block h-0.5 w-3 rounded-full bg-[var(--chart-1)]" />
                        {t("chartInbound")}: <span className="font-medium text-popover-foreground">{day.inbound}</span>
                      </p>
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="inline-block h-0.5 w-3 rounded-full bg-[var(--chart-2)]" />
                        {t("chartOutbound")}: <span className="font-medium text-popover-foreground">{day.outbound}</span>
                      </p>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Legend() {
  const t = useTranslations("reports");
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-3 rounded-full bg-[var(--chart-1)]" />
        {t("chartInbound")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-3 rounded-full bg-[var(--chart-2)]" />
        {t("chartOutbound")}
      </span>
    </div>
  );
}

function formatDayLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
