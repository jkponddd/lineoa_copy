import { areaCountForTemplateLayout, type TemplateRichMenuLayout } from "@/lib/line/rich-menu-layouts";
import type { RichMenuLayout } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const GRID_CLASS: Record<TemplateRichMenuLayout, string> = {
  "1x1": "grid-cols-1 grid-rows-1",
  "2x1": "grid-cols-2 grid-rows-1",
  "3x1": "grid-cols-3 grid-rows-1",
  "2x2": "grid-cols-2 grid-rows-2",
  "3x2": "grid-cols-3 grid-rows-2",
};

// Used both for the template picker's own thumbnails (always a template
// layout) and the saved-menus list (whose layout may be "custom", with no
// fixed grid to draw — shown as a single dashed box instead).
export function LayoutPreview({ layout, className }: { layout: RichMenuLayout; className?: string }) {
  if (layout === "custom") {
    return (
      <div className={cn("aspect-2500/1686 w-full rounded-sm border border-dashed border-border bg-muted/40", className)} />
    );
  }

  const count = areaCountForTemplateLayout(layout);
  return (
    <div className={cn("grid aspect-2500/1686 w-full gap-0.5 rounded-sm bg-border p-0.5", GRID_CLASS[layout], className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-[2px] bg-muted" />
      ))}
    </div>
  );
}
