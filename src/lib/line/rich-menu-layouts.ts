import type { RichMenuLayout } from "@/lib/supabase/database.types";

// LINE's two supported rich menu image sizes are 2500x1686 (full) or
// 2500x843 (half-height). Every layout here (template or custom) uses the
// full-height size — the more common choice, and simpler than offering
// both per template.
export const RICH_MENU_IMAGE_WIDTH = 2500;
export const RICH_MENU_IMAGE_HEIGHT = 1686;

export type AreaBounds = { x: number; y: number; width: number; height: number };
// Same shape, 0-100 range — resolution-independent, and what the composer's
// live preview and the custom drag/resize editor both work in directly, so
// neither has to know the canvas's actual pixel size.
export type PercentBounds = { x: number; y: number; width: number; height: number };

export type TemplateRichMenuLayout = Exclude<RichMenuLayout, "custom">;

export const RICH_MENU_TEMPLATE_LAYOUTS: TemplateRichMenuLayout[] = ["1x1", "2x1", "3x1", "2x2", "3x2"];

function computeTemplateAreaBounds(layout: TemplateRichMenuLayout): AreaBounds[] {
  const W = RICH_MENU_IMAGE_WIDTH;
  const H = RICH_MENU_IMAGE_HEIGHT;
  const halfH = Math.round(H / 2);

  switch (layout) {
    case "1x1":
      return [{ x: 0, y: 0, width: W, height: H }];
    case "2x1":
      return [
        { x: 0, y: 0, width: W / 2, height: H },
        { x: W / 2, y: 0, width: W / 2, height: H },
      ];
    case "3x1": {
      const w = Math.floor(W / 3);
      return [
        { x: 0, y: 0, width: w, height: H },
        { x: w, y: 0, width: w, height: H },
        { x: w * 2, y: 0, width: W - w * 2, height: H },
      ];
    }
    case "2x2":
      return [
        { x: 0, y: 0, width: W / 2, height: halfH },
        { x: W / 2, y: 0, width: W / 2, height: halfH },
        { x: 0, y: halfH, width: W / 2, height: H - halfH },
        { x: W / 2, y: halfH, width: W / 2, height: H - halfH },
      ];
    case "3x2": {
      const w = Math.floor(W / 3);
      return [
        { x: 0, y: 0, width: w, height: halfH },
        { x: w, y: 0, width: w, height: halfH },
        { x: w * 2, y: 0, width: W - w * 2, height: halfH },
        { x: 0, y: halfH, width: w, height: H - halfH },
        { x: w, y: halfH, width: w, height: H - halfH },
        { x: w * 2, y: halfH, width: W - w * 2, height: H - halfH },
      ];
    }
    default: {
      const exhaustiveCheck: never = layout;
      throw new Error(`Unknown rich menu template layout: ${exhaustiveCheck}`);
    }
  }
}

export function areaCountForTemplateLayout(layout: TemplateRichMenuLayout): number {
  return computeTemplateAreaBounds(layout).length;
}

// What a template layout's areas look like, expressed the same way custom
// (hand-drawn) areas are — 0-100 percentages — so the preview/editor
// component never needs to special-case "is this a template or custom".
export function computeTemplateAreaBoundsPercent(layout: TemplateRichMenuLayout): PercentBounds[] {
  return computeTemplateAreaBounds(layout).map((b) => pixelToPercent(b));
}

export function pixelToPercent(bounds: AreaBounds): PercentBounds {
  return {
    x: (bounds.x / RICH_MENU_IMAGE_WIDTH) * 100,
    y: (bounds.y / RICH_MENU_IMAGE_HEIGHT) * 100,
    width: (bounds.width / RICH_MENU_IMAGE_WIDTH) * 100,
    height: (bounds.height / RICH_MENU_IMAGE_HEIGHT) * 100,
  };
}

// Server-side conversion back to real pixels for the actual LINE API
// payload — rounded, and clamped so drag/resize rounding error can never
// push an area a pixel outside the canvas (LINE rejects out-of-bounds areas).
export function percentToPixelBounds(percent: PercentBounds): AreaBounds {
  const x = clamp(Math.round((percent.x / 100) * RICH_MENU_IMAGE_WIDTH), 0, RICH_MENU_IMAGE_WIDTH);
  const y = clamp(Math.round((percent.y / 100) * RICH_MENU_IMAGE_HEIGHT), 0, RICH_MENU_IMAGE_HEIGHT);
  const width = clamp(Math.round((percent.width / 100) * RICH_MENU_IMAGE_WIDTH), 1, RICH_MENU_IMAGE_WIDTH - x);
  const height = clamp(Math.round((percent.height / 100) * RICH_MENU_IMAGE_HEIGHT), 1, RICH_MENU_IMAGE_HEIGHT - y);
  return { x, y, width, height };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
