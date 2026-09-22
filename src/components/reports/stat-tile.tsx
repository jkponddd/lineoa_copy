import { Card, CardContent } from "@/components/ui/card";

// Stat tile contract per the dataviz skill: label (sentence case, no trailing
// colon) + value (semibold, proportional figures — not tabular-nums, which
// is reserved for columns of numbers that must align vertically).
export function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        {/* Proportional figures (the font's default), not tabular-nums —
            that's reserved for columns of numbers that must align
            vertically, not a single standalone stat-tile value. */}
        <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}
