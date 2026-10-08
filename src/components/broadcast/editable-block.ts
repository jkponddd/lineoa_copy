import type {
  BroadcastBlock,
  FlexComponent,
  FlexBoxLayout,
  FlexTextSize,
  FlexTextWeight,
  FlexTextAlign,
  FlexAction,
  FlexButtonStyle,
  FlexIconSize,
  FlexVideoAspectRatio,
  FlexSpan,
  FlexBubble,
} from "@/lib/broadcast/blocks";
import { blocksToLineMessages } from "@/lib/broadcast/blocks";
import type { LineMessage } from "@/lib/line/types";

// A flex component tree plus client-only upload state on its media-bearing
// nodes (image/icon/video) — same idea as EditableBlock below, just nested.
export type EditableFlexComponent =
  | { id: string; type: "box"; layout: FlexBoxLayout; children: EditableFlexComponent[] }
  | { id: string; type: "text"; text: string; size: FlexTextSize; weight: FlexTextWeight; align: FlexTextAlign; spans: FlexSpan[] }
  | { id: string; type: "image"; mediaPath: string; action: FlexAction | null; _file?: File; _fileUrl?: string }
  | { id: string; type: "icon"; mediaPath: string; size: FlexIconSize; _file?: File; _fileUrl?: string }
  | {
      id: string;
      type: "video";
      mediaPath: string;
      previewMediaPath: string;
      aspectRatio: FlexVideoAspectRatio;
      _file?: File;
      _fileUrl?: string;
      _previewFile?: File;
      _previewFileUrl?: string;
    }
  | { id: string; type: "button"; action: FlexAction; style: FlexButtonStyle }
  | { id: string; type: "separator" };

export type EditableFlexBubble = {
  id: string;
  header: Extract<EditableFlexComponent, { type: "box" }> | null;
  hero: Extract<EditableFlexComponent, { type: "image" }> | null;
  body: Extract<EditableFlexComponent, { type: "box" }>;
  footer: Extract<EditableFlexComponent, { type: "box" }> | null;
};

// A block plus client-only editing state riding along in the same object —
// `_file`/`_previewFile` are picked-but-not-yet-uploaded Storage uploads,
// `_fileUrl`/`_previewFileUrl` are whatever's currently displayable (a
// local blob: URL for a freshly picked file, or a signed/public Storage
// URL when editing an existing draft/copy). Stripped before anything is
// sent to a server action — see toPersistedBlocks.
export type EditableBlock =
  | Extract<BroadcastBlock, { type: "text" }>
  | (Extract<BroadcastBlock, { type: "image" }> & { _file?: File; _fileUrl?: string })
  | (Extract<BroadcastBlock, { type: "video" }> & { _file?: File; _previewFile?: File; _fileUrl?: string; _previewFileUrl?: string })
  | Extract<BroadcastBlock, { type: "button" }>
  | (Omit<Extract<BroadcastBlock, { type: "flex" }>, "bubbles"> & { bubbles: EditableFlexBubble[] });

function toEditableFlexComponent(c: FlexComponent, mediaUrlByPath: Record<string, string>): EditableFlexComponent {
  if (c.type === "box") return { ...c, children: c.children.map((child) => toEditableFlexComponent(child, mediaUrlByPath)) };
  if (c.type === "image") return { ...c, _fileUrl: mediaUrlByPath[c.mediaPath] };
  if (c.type === "icon") return { ...c, _fileUrl: mediaUrlByPath[c.mediaPath] };
  if (c.type === "video") return { ...c, _fileUrl: mediaUrlByPath[c.mediaPath], _previewFileUrl: mediaUrlByPath[c.previewMediaPath] };
  return c;
}

// header/hero are always a "box"/"image" component and body/footer always
// "box" (see FlexEditor) — toEditableFlexComponent's recursive signature
// can't express that invariant, so it's asserted at each of these call
// sites.
function toEditableFlexBubble(bubble: FlexBubble, mediaUrlByPath: Record<string, string>): EditableFlexBubble {
  return {
    id: bubble.id,
    header: bubble.header ? (toEditableFlexComponent(bubble.header, mediaUrlByPath) as EditableFlexComponent & { type: "box" }) : null,
    hero: bubble.hero ? (toEditableFlexComponent(bubble.hero, mediaUrlByPath) as EditableFlexComponent & { type: "image" }) : null,
    body: toEditableFlexComponent(bubble.body, mediaUrlByPath) as EditableFlexComponent & { type: "box" },
    footer: bubble.footer ? (toEditableFlexComponent(bubble.footer, mediaUrlByPath) as EditableFlexComponent & { type: "box" }) : null,
  };
}

// Hydrates plain persisted blocks (from the DB, or from a hand-edited JSON
// round-trip) into EditableBlocks, resolving each media path against a
// path -> displayable-URL map — a signed/public Storage URL when loading
// an existing draft/copy, or collectMediaUrlMap(...) of the previous
// in-memory state when re-hydrating after the JSON editor.
export function toEditableBlocks(blocks: BroadcastBlock[], mediaUrlByPath: Record<string, string>): EditableBlock[] {
  return blocks.map((block): EditableBlock => {
    if (block.type === "image") return { ...block, _fileUrl: mediaUrlByPath[block.mediaPath] };
    if (block.type === "video") {
      return { ...block, _fileUrl: mediaUrlByPath[block.mediaPath], _previewFileUrl: mediaUrlByPath[block.previewMediaPath] };
    }
    if (block.type === "flex") {
      return { ...block, bubbles: block.bubbles.map((bubble) => toEditableFlexBubble(bubble, mediaUrlByPath)) };
    }
    return block;
  });
}

function persistFlexComponent(c: EditableFlexComponent): FlexComponent {
  if (c.type === "box") return { id: c.id, type: "box", layout: c.layout, children: c.children.map(persistFlexComponent) };
  if (c.type === "image") return { id: c.id, type: "image", mediaPath: c.mediaPath, action: c.action };
  if (c.type === "icon") return { id: c.id, type: "icon", mediaPath: c.mediaPath, size: c.size };
  if (c.type === "video") return { id: c.id, type: "video", mediaPath: c.mediaPath, previewMediaPath: c.previewMediaPath, aspectRatio: c.aspectRatio };
  return c;
}

function persistFlexBubble(bubble: EditableFlexBubble): FlexBubble {
  return {
    id: bubble.id,
    header: bubble.header ? (persistFlexComponent(bubble.header) as Extract<FlexComponent, { type: "box" }>) : null,
    hero: bubble.hero ? (persistFlexComponent(bubble.hero) as Extract<FlexComponent, { type: "image" }>) : null,
    body: persistFlexComponent(bubble.body) as Extract<FlexComponent, { type: "box" }>,
    footer: bubble.footer ? (persistFlexComponent(bubble.footer) as Extract<FlexComponent, { type: "box" }>) : null,
  };
}

export function toPersistedBlocks(blocks: EditableBlock[]): BroadcastBlock[] {
  return blocks.map((block): BroadcastBlock => {
    if (block.type === "image") {
      const { _file: _f, _fileUrl: _u, ...rest } = block;
      void _f;
      void _u;
      return rest as BroadcastBlock;
    }
    if (block.type === "video") {
      const { _file: _f, _previewFile: _pf, _fileUrl: _u, _previewFileUrl: _pu, ...rest } = block;
      void _f;
      void _pf;
      void _u;
      void _pu;
      return rest as BroadcastBlock;
    }
    if (block.type === "flex") {
      return { id: block.id, type: "flex", altText: block.altText, bubbles: block.bubbles.map(persistFlexBubble) };
    }
    return block;
  });
}

function previewFlexComponent(c: EditableFlexComponent): FlexComponent {
  if (c.type === "box") return { id: c.id, type: "box", layout: c.layout, children: c.children.map(previewFlexComponent) };
  if (c.type === "image") return { id: c.id, type: "image", mediaPath: c._fileUrl || c.mediaPath, action: c.action };
  if (c.type === "icon") return { id: c.id, type: "icon", mediaPath: c._fileUrl || c.mediaPath, size: c.size };
  if (c.type === "video") {
    return { id: c.id, type: "video", mediaPath: c._fileUrl || c.mediaPath, previewMediaPath: c._previewFileUrl || c.previewMediaPath, aspectRatio: c.aspectRatio };
  }
  return c;
}

function previewFlexBubble(bubble: EditableFlexBubble): FlexBubble {
  return {
    id: bubble.id,
    header: bubble.header ? (previewFlexComponent(bubble.header) as Extract<FlexComponent, { type: "box" }>) : null,
    hero: bubble.hero ? (previewFlexComponent(bubble.hero) as Extract<FlexComponent, { type: "image" }>) : null,
    body: previewFlexComponent(bubble.body) as Extract<FlexComponent, { type: "box" }>,
    footer: bubble.footer ? (previewFlexComponent(bubble.footer) as Extract<FlexComponent, { type: "box" }>) : null,
  };
}

function collectFlexMediaUrls(c: EditableFlexComponent, out: Record<string, string>) {
  if (c.type === "box") {
    c.children.forEach((child) => collectFlexMediaUrls(child, out));
    return;
  }
  if (c.type === "image" && c.mediaPath && c._fileUrl) out[c.mediaPath] = c._fileUrl;
  if (c.type === "icon" && c.mediaPath && c._fileUrl) out[c.mediaPath] = c._fileUrl;
  if (c.type === "video") {
    if (c.mediaPath && c._fileUrl) out[c.mediaPath] = c._fileUrl;
    if (c.previewMediaPath && c._previewFileUrl) out[c.previewMediaPath] = c._previewFileUrl;
  }
}

// A mediaPath -> displayable-URL map built from the CURRENT block state —
// used to re-hydrate previews after the JSON editor round-trips a hand-
// edited block list back into the composer (see JsonEditorDialog). A path
// the user didn't touch resolves the same preview it already had; a path
// that's new or changed simply has no preview until re-attached.
export function collectMediaUrlMap(blocks: EditableBlock[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const block of blocks) {
    if (block.type === "image" && block.mediaPath && block._fileUrl) out[block.mediaPath] = block._fileUrl;
    if (block.type === "video") {
      if (block.mediaPath && block._fileUrl) out[block.mediaPath] = block._fileUrl;
      if (block.previewMediaPath && block._previewFileUrl) out[block.previewMediaPath] = block._previewFileUrl;
    }
    if (block.type === "flex") {
      for (const bubble of block.bubbles) {
        if (bubble.header) collectFlexMediaUrls(bubble.header, out);
        if (bubble.hero) collectFlexMediaUrls(bubble.hero, out);
        collectFlexMediaUrls(bubble.body, out);
        if (bubble.footer) collectFlexMediaUrls(bubble.footer, out);
      }
    }
  }
  return out;
}

// For the composer's live preview / JSON view — resolves each block's
// media against whatever's already displayable client-side (local blob:
// URL for a pending upload, or the pre-resolved signed/public URL for an
// already-uploaded one) rather than a real Storage path, since the actual
// upload only happens on submit. Uses the exact same conversion algorithm
// the server uses at send time, just with a different URL source.
export function previewLineMessages(blocks: EditableBlock[]): LineMessage[] {
  const previewBlocks: BroadcastBlock[] = blocks.map((block): BroadcastBlock => {
    if (block.type === "image") return { ...block, mediaPath: block._fileUrl || block.mediaPath };
    if (block.type === "video") {
      return { ...block, mediaPath: block._fileUrl || block.mediaPath, previewMediaPath: block._previewFileUrl || block.previewMediaPath };
    }
    if (block.type === "flex") {
      return { id: block.id, type: "flex", altText: block.altText, bubbles: block.bubbles.map(previewFlexBubble) };
    }
    return block;
  });
  return blocksToLineMessages(previewBlocks, (path) => path || null);
}
