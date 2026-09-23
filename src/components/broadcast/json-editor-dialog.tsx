"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MonokaiJsonEditor } from "@/components/broadcast/monokai-json-editor";
import { toPersistedBlocks, toEditableBlocks, collectMediaUrlMap, type EditableBlock } from "@/components/broadcast/editable-block";
import type { BroadcastBlock, BroadcastBlockType } from "@/lib/broadcast/blocks";

const KNOWN_TYPES: BroadcastBlockType[] = ["text", "image", "video", "button", "flex"];

function isPlausibleBlock(value: unknown): value is BroadcastBlock {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { id?: unknown }).id === "string" &&
    KNOWN_TYPES.includes((value as { type?: unknown }).type as BroadcastBlockType)
  );
}

// The composer's block list, shown and hand-editable as raw JSON, styled
// like a VS Code Monokai editor. Saving re-parses the text and replaces
// the composer's blocks with it — this edits the underlying block
// structure (the composer's own source of truth), not the derived LINE
// message payload, since reversing an already-merged Buttons Template back
// into discrete blocks isn't a sound round trip. Media already uploaded
// under an unchanged path keeps its preview after saving; a hand-typed new
// path won't have one until re-attached through the normal editor.
export function JsonEditorDialog({
  open,
  onOpenChange,
  blocks,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocks: EditableBlock[];
  onApply: (blocks: EditableBlock[]) => void;
}) {
  const t = useTranslations("broadcast");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Tracks the open/closed transition so the text can be re-seeded exactly
  // once per open — React's own "adjust state during render" pattern
  // (https://react.dev/learn/you-might-not-need-an-effect), not an effect,
  // so it can't fight the user's edits on every keystroke-triggered
  // `blocks` update and doesn't trigger cascading-render effect warnings.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setText(JSON.stringify(toPersistedBlocks(blocks), null, 2));
      setError(null);
    }
  }

  function handleSave() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError(t("jsonInvalidSyntax"));
      return;
    }
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isPlausibleBlock)) {
      setError(t("jsonInvalidShape"));
      return;
    }
    const mediaUrlByPath = collectMediaUrlMap(blocks);
    onApply(toEditableBlocks(parsed, mediaUrlByPath));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("jsonEditorTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{t("jsonEditorHint")}</p>
        <MonokaiJsonEditor value={text} onChange={setText} />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>{t("cancelButton")}</DialogClose>
          <Button type="button" onClick={handleSave}>
            {t("jsonSaveButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
