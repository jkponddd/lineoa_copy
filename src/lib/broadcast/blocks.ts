// The ordered, reorderable message blocks a broadcast is built from —
// replaces the earlier fixed "template" concept (text / image_text /
// image_link) with a small block-based editor, per the user's explicit
// request for a web-editor-style composer where element order (and now
// video) is under their control.
//
// Deliberately isomorphic (no "server-only", no DB/Storage imports): the
// composer's live preview/JSON view runs this exact function client-side
// with local object-URLs, and buildBroadcastMessages in send-broadcast.ts
// runs the SAME function server-side with signed Storage URLs, so the
// preview and the real send can never drift apart on what a given block
// list actually turns into.
import type { LineMessage } from "@/lib/line/types";

export type BroadcastBlock =
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; mediaPath: string }
  | { id: string; type: "video"; mediaPath: string; previewMediaPath: string }
  | { id: string; type: "button"; label: string; url: string };

export type BroadcastBlockType = BroadcastBlock["type"];

// LINE allows at most 5 message objects per send (reply/push/broadcast/
// multicast all share this limit) — capping block count keeps every
// possible block arrangement safely under that, since a button block never
// adds a message of its own (see blocksToLineMessages).
export const MAX_BLOCKS = 5;

export function createBlock(type: BroadcastBlockType): BroadcastBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "text":
      return { id, type: "text", text: "" };
    case "image":
      return { id, type: "image", mediaPath: "" };
    case "video":
      return { id, type: "video", mediaPath: "", previewMediaPath: "" };
    case "button":
      return { id, type: "button", label: "", url: "" };
  }
}

export function isBlockComplete(block: BroadcastBlock): boolean {
  switch (block.type) {
    case "text":
      return block.text.trim().length > 0;
    case "image":
      return block.mediaPath.trim().length > 0;
    case "video":
      return block.mediaPath.trim().length > 0 && block.previewMediaPath.trim().length > 0;
    case "button":
      return block.label.trim().length > 0 && block.url.trim().length > 0;
  }
}

export function blocksAreValid(blocks: BroadcastBlock[]): boolean {
  return blocks.length > 0 && blocks.every(isBlockComplete);
}

// Converts the ordered block list into actual LINE message objects.
// `resolveUrl` maps a stored media path to something fetchable — a signed
// Storage URL server-side, or a local blob:/already-resolved URL
// client-side for the live preview.
//
// Button blocks never emit a message of their own: LINE has no standalone
// "button" message type, only a Buttons Template that bundles an optional
// thumbnail image and body text with the action. A button block merges
// with the block(s) immediately before it — an `image` (optionally with a
// `text` block right before THAT, used as the caption) or a lone `text` —
// so dragging an image or caption to sit right before a button is what
// attaches them, matching the drag-to-reorder editing model. Two passes:
// first decide what each button consumes, then emit in order, skipping
// anything consumed.
export function blocksToLineMessages(blocks: BroadcastBlock[], resolveUrl: (mediaPath: string) => string | null): LineMessage[] {
  const consumed = new Set<number>();
  type ButtonGroup = { textBlock?: Extract<BroadcastBlock, { type: "text" }>; imageBlock?: Extract<BroadcastBlock, { type: "image" }> };
  const groupByButtonIndex = new Map<number, ButtonGroup>();

  blocks.forEach((block, i) => {
    if (block.type !== "button") return;

    const prev1 = i - 1 >= 0 && !consumed.has(i - 1) ? blocks[i - 1] : undefined;
    const group: ButtonGroup = {};

    if (prev1?.type === "image") {
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
      if (url) messages.push({ type: "image", originalContentUrl: url, previewImageUrl: url });
      return;
    }

    if (block.type === "video") {
      const videoUrl = resolveUrl(block.mediaPath);
      const previewUrl = resolveUrl(block.previewMediaPath);
      if (videoUrl && previewUrl) messages.push({ type: "video", originalContentUrl: videoUrl, previewImageUrl: previewUrl });
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
// text or button label found, falling back to a generic "image"/"video"
// marker. Used by the broadcast list's message column and its search box.
export function blocksSummaryText(blocks: BroadcastBlock[]): string {
  for (const block of blocks) {
    if (block.type === "text" && block.text.trim()) return block.text.trim();
    if (block.type === "button" && block.label.trim()) return block.label.trim();
  }
  const firstMedia = blocks.find((b) => b.type === "image" || b.type === "video");
  if (firstMedia?.type === "image") return "🖼";
  if (firstMedia?.type === "video") return "🎬";
  return "";
}
