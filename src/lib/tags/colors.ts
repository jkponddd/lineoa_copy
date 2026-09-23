// A fixed swatch set rather than a free-form color picker — org-defined
// tags need to stay visually distinct and legible in both themes, not
// arbitrary. Values are mid-tone so a plain colored dot reads fine next to
// text in light or dark mode without per-tag contrast handling.
export const TAG_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
] as const;
