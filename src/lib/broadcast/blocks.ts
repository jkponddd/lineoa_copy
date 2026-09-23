// The ordered, reorderable message blocks a broadcast is built from —
// replaces the earlier fixed "template" concept (text / image_text /
// image_link) with a small block-based editor, per the user's explicit
// request for a web-editor-style composer where element order (and now
// video/flex) is under their control.
//
// Deliberately isomorphic (no "server-only", no DB/Storage imports): the
// composer's live preview/JSON view runs this exact function client-side
// with local object-URLs, and buildBroadcastMessages in send-broadcast.ts
// runs the SAME function server-side with signed Storage URLs, so the
// preview and the real send can never drift apart on what a given block
// list actually turns into.
import type { LineMessage } from "@/lib/line/types";

// An image block's three modes: no action (a plain LINE image message);
// one tap action for the whole image (a Buttons Template with just a
// thumbnail); or multiple independent tap regions drawn on the image
// (LINE's Imagemap Message). Folded into one "image" block rather than
// keeping Imagemap as a separate block type — from the user's own
// question, an image that happens to have zero/one/many tap zones is one
// concept, not three unrelated ones.
export type ImageBlockMode = "plain" | "action" | "regions";

// Regions: percentages of the image (0-100), same convention as Rich
// Menu's custom-layout areas, converted to LINE's pixel `area` at send
// time against a declared baseSize (1040 wide, height derived from the
// image's own aspect ratio so regions land correctly regardless of what
// LINE actually fetches from baseUrl).
export type ImagemapAction = { type: "uri" | "message"; value: string };
export type ImagemapArea = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  action: ImagemapAction;
};

// --- Flex: a single bubble (hero/body/footer), each a small component
// tree. Scoped to the components that cover most real Flex messages —
// box (layout container), text, image (with its own tap action,
// independent of a separate button), button, separator. Carousels and the
// `header` slot, icon/span/video components aren't built — see
// PROGRESS.md.
export type FlexAction = { type: "uri" | "message"; label: string; value: string };
export type FlexBoxLayout = "horizontal" | "vertical" | "baseline";
export type FlexTextSize = "xs" | "sm" | "md" | "lg" | "xl";
export type FlexTextWeight = "regular" | "bold";
export type FlexTextAlign = "start" | "center" | "end";
export type FlexButtonStyle = "primary" | "secondary" | "link";

// A flex `button` component's visible text is `action.label` — LINE has
// no separate label field on the button component itself.
export type FlexComponent =
  | { id: string; type: "box"; layout: FlexBoxLayout; children: FlexComponent[] }
  | { id: string; type: "text"; text: string; size: FlexTextSize; weight: FlexTextWeight; align: FlexTextAlign }
  | { id: string; type: "image"; mediaPath: string; action: FlexAction | null }
  | { id: string; type: "button"; action: FlexAction; style: FlexButtonStyle }
  | { id: string; type: "separator" };

export type FlexComponentType = FlexComponent["type"];

export function createFlexComponent(type: FlexComponentType): FlexComponent {
  const id = crypto.randomUUID();
  switch (type) {
    case "box":
      return { id, type: "box", layout: "vertical", children: [] };
    case "text":
      return { id, type: "text", text: "", size: "md", weight: "regular", align: "start" };
    case "image":
      return { id, type: "image", mediaPath: "", action: null };
    case "button":
      return { id, type: "button", action: { type: "uri", label: "", value: "" }, style: "primary" };
    case "separator":
      return { id, type: "separator" };
  }
}

export function isFlexComponentComplete(component: FlexComponent): boolean {
  switch (component.type) {
    case "box":
      return component.children.length > 0 && component.children.every(isFlexComponentComplete);
    case "text":
      return component.text.trim().length > 0;
    case "image":
      return component.mediaPath.trim().length > 0 && (!component.action || component.action.value.trim().length > 0);
    case "button":
      return component.action.label.trim().length > 0 && component.action.value.trim().length > 0;
    case "separator":
      return true;
  }
}

function flexActionToJson(action: FlexAction): Record<string, unknown> {
  return action.type === "uri"
    ? { type: "uri", label: action.label, uri: action.value }
    : { type: "message", label: action.label, text: action.value };
}

function flexComponentToJson(component: FlexComponent, resolveUrl: (mediaPath: string) => string | null): Record<string, unknown> {
  switch (component.type) {
    case "box":
      return { type: "box", layout: component.layout, contents: component.children.map((c) => flexComponentToJson(c, resolveUrl)) };
    case "text":
      return { type: "text", text: component.text, size: component.size, weight: component.weight, align: component.align, wrap: true };
    case "image":
      return {
        type: "image",
        url: resolveUrl(component.mediaPath) ?? "",
        ...(component.action ? { action: flexActionToJson(component.action) } : {}),
      };
    case "button":
      return { type: "button", style: component.style, action: flexActionToJson(component.action) };
    case "separator":
      return { type: "separator" };
  }
}

export type BroadcastBlock =
  | { id: string; type: "text"; text: string }
  | {
      id: string;
      type: "image";
      mediaPath: string;
      mode: ImageBlockMode;
      // Meaningful only when mode === "action" — one tap action for the
      // whole image (a Buttons Template, thumbnail only, no separate
      // "button" block needed).
      action: FlexAction | null;
      // Meaningful only when mode === "regions" (LINE requires it there)
      // — otherwise unused.
      altText: string;
      aspectRatio: number;
      areas: ImagemapArea[];
    }
  | { id: string; type: "video"; mediaPath: string; previewMediaPath: string }
  | { id: string; type: "button"; label: string; url: string }
  | {
      id: string;
      type: "flex";
      altText: string;
      // Structurally narrowed (not the full FlexComponent union) — the
      // editor only ever puts an image in hero and a box in body/footer,
      // so the types say so too, rather than needing runtime narrowing
      // every time these are read.
      hero: Extract<FlexComponent, { type: "image" }> | null;
      body: Extract<FlexComponent, { type: "box" }>;
      footer: Extract<FlexComponent, { type: "box" }> | null;
    };

export type BroadcastBlockType = BroadcastBlock["type"];

// LINE allows at most 5 message objects per send (reply/push/broadcast/
// multicast all share this limit) — capping block count keeps every
// possible block arrangement safely under that, since a button block never
// adds a message of its own (see blocksToLineMessages) and flex/an image
// in any mode each still only ever emit exactly one message.
export const MAX_BLOCKS = 5;

export function createBlock(type: BroadcastBlockType): BroadcastBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "text":
      return { id, type: "text", text: "" };
    case "image":
      return { id, type: "image", mediaPath: "", mode: "plain", action: null, altText: "", aspectRatio: 1686 / 2500, areas: [] };
    case "video":
      return { id, type: "video", mediaPath: "", previewMediaPath: "" };
    case "button":
      return { id, type: "button", label: "", url: "" };
    case "flex":
      return { id, type: "flex", altText: "", hero: null, body: { id: crypto.randomUUID(), type: "box", layout: "vertical", children: [] }, footer: null };
  }
}

export function isBlockComplete(block: BroadcastBlock): boolean {
  switch (block.type) {
    case "text":
      return block.text.trim().length > 0;
    case "image":
      if (!block.mediaPath.trim()) return false;
      if (block.mode === "action") return Boolean(block.action) && block.action!.value.trim().length > 0;
      if (block.mode === "regions") {
        return block.altText.trim().length > 0 && block.areas.length > 0 && block.areas.every((a) => a.action.value.trim().length > 0);
      }
      return true;
    case "video":
      return block.mediaPath.trim().length > 0 && block.previewMediaPath.trim().length > 0;
    case "button":
      return block.label.trim().length > 0 && block.url.trim().length > 0;
    case "flex":
      return (
        block.altText.trim().length > 0 &&
        isFlexComponentComplete(block.body) &&
        (!block.hero || isFlexComponentComplete(block.hero)) &&
        (!block.footer || isFlexComponentComplete(block.footer))
      );
  }
}

export function blocksAreValid(blocks: BroadcastBlock[]): boolean {
  return blocks.length > 0 && blocks.every(isBlockComplete);
}

// Converts the ordered block list into actual LINE message objects.
// `resolveUrl` maps a stored media path to something fetchable — a signed
// Storage URL (a "plain"/"action" image or video), a permanent public
// proxy URL ("regions" mode's Imagemap baseUrl and flex image components —
// see buildBroadcastMessages), or a local blob:/already-resolved URL
// client-side for the live preview.
//
// Button blocks never emit a message of their own: LINE has no standalone
// "button" message type, only a Buttons Template that bundles an optional
// thumbnail image and body text with the action. A button block merges
// with the block(s) immediately before it — a "plain"-mode `image`
// (optionally with a `text` block right before THAT, used as the caption)
// or a lone `text` — so dragging an image or caption to sit right before a
// button is what attaches them, matching the drag-to-reorder editing
// model. An image already in "action" mode is never consumed this way —
// it already carries its own single action. Two passes: first decide what
// each button consumes, then emit in order, skipping anything consumed.
export function blocksToLineMessages(blocks: BroadcastBlock[], resolveUrl: (mediaPath: string) => string | null): LineMessage[] {
  const consumed = new Set<number>();
  type ButtonGroup = { textBlock?: Extract<BroadcastBlock, { type: "text" }>; imageBlock?: Extract<BroadcastBlock, { type: "image" }> };
  const groupByButtonIndex = new Map<number, ButtonGroup>();

  blocks.forEach((block, i) => {
    if (block.type !== "button") return;

    const prev1 = i - 1 >= 0 && !consumed.has(i - 1) ? blocks[i - 1] : undefined;
    const group: ButtonGroup = {};

    if (prev1?.type === "image" && prev1.mode === "plain") {
      group.imageBlock = prev1;
      consumed.add(i - 1);
      const prev2 = i - 2 >= 0 && !consumed.has(i - 2) ? blocks[i - 2] : undefined;
      if (prev2?.type === "text") {
        group.textBlock = prev2;
        consumed.add(i - 2);
      }
    } else if (prev1?.type === "text") {
      group.textBlock = prev1;
      consumed.add(i - 1);
    }

    groupByButtonIndex.set(i, group);
  });

  const messages: LineMessage[] = [];

  blocks.forEach((block, i) => {
    if (consumed.has(i)) return;

    if (block.type === "text") {
      messages.push({ type: "text", text: block.text });
      return;
    }

    if (block.type === "image") {
      const url = resolveUrl(block.mediaPath);
      if (!url) return;

      if (block.mode === "regions") {
        const baseWidth = 1040;
        const baseHeight = Math.round(baseWidth * block.aspectRatio);
        messages.push({
          type: "imagemap",
          baseUrl: url,
          altText: block.altText,
          baseSize: { width: baseWidth, height: baseHeight },
          actions: block.areas.map((area) => ({
            type: area.action.type,
            ...(area.action.type === "uri" ? { linkUri: area.action.value } : { text: area.action.value }),
            area: {
              x: Math.round((area.x / 100) * baseWidth),
              y: Math.round((area.y / 100) * baseHeight),
              width: Math.round((area.width / 100) * baseWidth),
              height: Math.round((area.height / 100) * baseHeight),
            },
          })),
        });
        return;
      }

      if (block.mode === "action" && block.action) {
        const text = block.altText || block.action.label || "image";
        messages.push({
          type: "template",
          altText: text,
          template: { type: "buttons", thumbnailImageUrl: url, text, actions: [flexActionToJson(block.action)] },
        });
        return;
      }

      messages.push({ type: "image", originalContentUrl: url, previewImageUrl: url });
      return;
    }

    if (block.type === "video") {
      const videoUrl = resolveUrl(block.mediaPath);
      const previewUrl = resolveUrl(block.previewMediaPath);
      if (videoUrl && previewUrl) messages.push({ type: "video", originalContentUrl: videoUrl, previewImageUrl: previewUrl });
      return;
    }

    if (block.type === "flex") {
      messages.push({
        type: "flex",
        altText: block.altText,
        contents: {
          type: "bubble",
          ...(block.hero ? { hero: flexComponentToJson(block.hero, resolveUrl) } : {}),
          body: flexComponentToJson(block.body, resolveUrl),
          ...(block.footer ? { footer: flexComponentToJson(block.footer, resolveUrl) } : {}),
        },
      });
      return;
    }

    // button
    const group = groupByButtonIndex.get(i) ?? {};
    const thumbnailImageUrl = group.imageBlock ? (resolveUrl(group.imageBlock.mediaPath) ?? undefined) : undefined;
    // LINE requires the template's `text` field to be non-empty — fall
    // back to the button's own label if nothing was attached to caption it.
    const text = group.textBlock?.text || block.label;
    messages.push({
      type: "template",
      altText: text,
      template: {
        type: "buttons",
        ...(thumbnailImageUrl ? { thumbnailImageUrl } : {}),
        text,
        actions: [{ type: "uri", label: block.label, uri: block.url }],
      },
    });
  });

  return messages;
}

export function blockTypeLabelKey(type: BroadcastBlockType): string {
  return `block${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

// A short, search/display-friendly summary of a block list — the first
// text, button label, or alt text found, falling back to a generic media
// marker. Used by the broadcast list's message column and its search box.
export function blocksSummaryText(blocks: BroadcastBlock[]): string {
  for (const block of blocks) {
    if (block.type === "text" && block.text.trim()) return block.text.trim();
    if (block.type === "button" && block.label.trim()) return block.label.trim();
    if (block.type === "flex" && block.altText.trim()) return block.altText.trim();
    if (block.type === "image" && block.mode !== "plain" && block.altText.trim()) return block.altText.trim();
  }
  const firstMedia = blocks.find((b) => b.type === "image" || b.type === "video" || b.type === "flex");
  if (firstMedia?.type === "image") return "🖼";
  if (firstMedia?.type === "video") return "🎬";
  if (firstMedia?.type === "flex") return "🧩";
  return "";
}

// Every media path a block (including nested flex image components)
// references — used by both the server (to batch-resolve signed/public
// URLs) and callers that need to know what Storage objects a block list
// touches.
export function blockMediaPaths(block: BroadcastBlock): { path: string; kind: "signed" | "public" }[] {
  switch (block.type) {
    case "image":
      return [{ path: block.mediaPath, kind: block.mode === "regions" ? "public" : "signed" }];
    case "video":
      return [
        { path: block.mediaPath, kind: "signed" },
        { path: block.previewMediaPath, kind: "signed" },
      ];
    case "flex": {
      const paths: { path: string; kind: "signed" | "public" }[] = [];
      const walk = (c: FlexComponent) => {
        if (c.type === "image" && c.mediaPath) paths.push({ path: c.mediaPath, kind: "signed" });
        if (c.type === "box") c.children.forEach(walk);
      };
      if (block.hero) walk(block.hero);
      walk(block.body);
      if (block.footer) walk(block.footer);
      return paths;
    }
    default:
      return [];
  }
}
