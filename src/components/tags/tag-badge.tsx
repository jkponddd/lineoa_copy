import { Badge } from "@/components/ui/badge";

// Shared between the Inbox thread header, the Broadcast contact picker, and
// the Tags admin list — a colored dot rather than a colored badge
// background, so an org-picked color never has to be checked for contrast
// against badge text in both themes.
export function TagBadge({ name, color, className }: { name: string; color: string; className?: string }) {
  return (
    <Badge variant="outline" className={className}>
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </Badge>
  );
}
