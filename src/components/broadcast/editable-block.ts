import type { BroadcastBlock } from "@/lib/broadcast/blocks";
import { blocksToLineMessages } from "@/lib/broadcast/blocks";
import type { LineMessage } from "@/lib/line/types";

// A block plus client-only editing state riding along in the same object —
// `_file`/`_previewFile` are picked-but-not-yet-uploaded Storage uploads,
// `_fileUrl`/`_previewFileUrl` are whatever's currently displayable (a
// local blob: URL for a freshly picked file, or a signed Storage URL when
// editing an existing draft/copy). Stripped before anything is sent to a
// server action — see toPersistedBlocks.
export type EditableBlock = BroadcastBlock & {
  _file?: File;
  _previewFile?: File;
  _fileUrl?: string;
  _previewFileUrl?: string;
};

export function toPersistedBlocks(blocks: EditableBlock[]): BroadcastBlock[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- discarded on purpose, only `rest` is kept
  return blocks.map(({ _file, _previewFile, _fileUrl, _previewFileUrl, ...rest }) => rest as BroadcastBlock);
}

// For the composer's live preview / JSON view — resolves each block's
// media against whatever's already displayable client-side (local blob:
// URL for a pending upload, or the pre-resolved signed URL for an
// already-uploaded one) rather than a real Storage path, since the actual
// upload only happens on submit. Uses the exact same conversion algorithm
// the server uses at send time, just with a different URL source.
export function previewLineMessages(blocks: EditableBlock[]): LineMessage[] {
  const previewBlocks: BroadcastBlock[] = blocks.map((block) => {
    if (block.type === "image") return { ...block, mediaPath: block._fileUrl || block.mediaPath };
    if (block.type === "video") {
      return { ...block, mediaPath: block._fileUrl || block.mediaPath, previewMediaPath: block._previewFileUrl || block.previewMediaPath };
    }
    return block;
  });
  return blocksToLineMessages(previewBlocks, (path) => path || null);
}
