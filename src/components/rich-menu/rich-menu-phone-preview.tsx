"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import type { PercentBounds } from "@/lib/line/rich-menu-layouts";
import { cn } from "@/lib/utils";

export type PreviewArea = { label: string; bounds: PercentBounds };

const MIN_SIZE_PERCENT = 4;
const HANDLE_SIZE_PERCENT = 6;

type DragState =
  | { mode: "create"; startX: number; startY: number }
  | { mode: "move"; index: number; offsetX: number; offsetY: number }
  | { mode: "resize"; index: number };

// A phone-shaped mockup so editing/reviewing a rich menu shows what it will
// actually look like in a LINE chat, not just an abstract grid. In
// `editable` mode (custom layout only) this doubles as the area editor
// itself — draw a new area by dragging empty canvas, move one by dragging
// its body, resize via the corner handle — rather than a separate
// non-visual editor next to a separate static preview.
export function RichMenuPhonePreview({
  imageUrl,
  areas,
  editable,
  onAreaChange,
  onAreaCreate,
  onAreaDelete,
}: {
  imageUrl: string | null;
  areas: PreviewArea[];
  editable: boolean;
  onAreaChange?: (index: number, bounds: PercentBounds) => void;
  onAreaCreate?: (bounds: PercentBounds) => void;
  onAreaDelete?: (index: number) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [liveDraft, setLiveDraft] = useState<PercentBounds | null>(null);

  function percentFromEvent(e: PointerEvent | React.PointerEvent): { x: number; y: number } {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100);
    return { x, y };
  }

  function handleCanvasPointerDown(e: React.PointerEvent) {
    if (!editable) return;
    const { x, y } = percentFromEvent(e);
    setDrag({ mode: "create", startX: x, startY: y });
    setLiveDraft({ x, y, width: 0, height: 0 });
  }

  function handleAreaPointerDown(e: React.PointerEvent, index: number) {
    if (!editable) return;
    e.stopPropagation();
    const { x, y } = percentFromEvent(e);
    const area = areas[index];
    setDrag({ mode: "move", index, offsetX: x - area.bounds.x, offsetY: y - area.bounds.y });
  }

  function handleResizePointerDown(e: React.PointerEvent, index: number) {
    if (!editable) return;
    e.stopPropagation();
    setDrag({ mode: "resize", index });
  }

  useEffect(() => {
    if (!drag) return;

    function handleMove(e: PointerEvent) {
      const { x, y } = percentFromEvent(e);

      if (drag!.mode === "create") {
        const startX = drag!.startX;
        const startY = drag!.startY;
        setLiveDraft({
          x: Math.min(startX, x),
          y: Math.min(startY, y),
          width: Math.abs(x - startX),
          height: Math.abs(y - startY),
        });
      } else if (drag!.mode === "move" && onAreaChange) {
        const area = areas[drag!.index];
        const newX = clamp(x - drag!.offsetX, 0, 100 - area.bounds.width);
        const newY = clamp(y - drag!.offsetY, 0, 100 - area.bounds.height);
        onAreaChange(drag!.index, { ...area.bounds, x: newX, y: newY });
      } else if (drag!.mode === "resize" && onAreaChange) {
        const area = areas[drag!.index];
        const width = clamp(x - area.bounds.x, MIN_SIZE_PERCENT, 100 - area.bounds.x);
        const height = clamp(y - area.bounds.y, MIN_SIZE_PERCENT, 100 - area.bounds.y);
        onAreaChange(drag!.index, { ...area.bounds, width, height });
      }
    }

    function handleUp() {
      if (drag!.mode === "create" && liveDraft) {
        if (liveDraft.width >= MIN_SIZE_PERCENT && liveDraft.height >= MIN_SIZE_PERCENT && onAreaCreate) {
          onAreaCreate(liveDraft);
        }
        setLiveDraft(null);
      }
      setDrag(null);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [drag, areas, liveDraft, onAreaChange, onAreaCreate]);

  return (
    <div className="mx-auto w-full max-w-[280px]">
      <div className="rounded-[28px] border-4 border-foreground/80 bg-background p-1.5 shadow-sm">
        <div className="flex flex-col overflow-hidden rounded-[20px] border border-border bg-muted/30">
          {/* Fake chat area, just enough context to read as "a LINE chat" */}
          <div className="flex flex-col gap-1.5 bg-background p-2.5">
            <div className="h-1.5 w-16 rounded-full bg-muted" />
            <div className="ml-auto h-4 w-2/3 rounded-lg rounded-tr-sm bg-primary/15" />
            <div className="h-4 w-1/2 rounded-lg rounded-tl-sm bg-muted" />
          </div>

          {/* The rich menu itself */}
          <div
            ref={canvasRef}
            data-testid="rich-menu-canvas"
            onPointerDown={handleCanvasPointerDown}
            className={cn(
              "relative aspect-2500/1686 w-full touch-none select-none border-t border-border bg-muted bg-cover bg-center",
              editable && "cursor-crosshair",
            )}
            style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
          >
            {areas.map((area, index) => (
              <div
                key={index}
                onPointerDown={(e) => handleAreaPointerDown(e, index)}
                className={cn(
                  "absolute flex items-center justify-center overflow-hidden border border-primary/70 bg-primary/10 text-center text-[10px] leading-tight text-primary-foreground",
                  editable && "cursor-move",
                )}
                style={{
                  left: `${area.bounds.x}%`,
                  top: `${area.bounds.y}%`,
                  width: `${area.bounds.width}%`,
                  height: `${area.bounds.height}%`,
                }}
              >
                <span className="truncate rounded bg-background/80 px-1 text-foreground">{area.label || "—"}</span>

                {editable ? (
                  <>
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => onAreaDelete?.(index)}
                      className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                    >
                      <X className="size-2.5" />
                    </button>
                    <div
                      onPointerDown={(e) => handleResizePointerDown(e, index)}
                      style={{ width: `${HANDLE_SIZE_PERCENT}%`, height: `${HANDLE_SIZE_PERCENT}%` }}
                      className="absolute bottom-0 right-0 cursor-nwse-resize border-b-2 border-r-2 border-primary bg-background/60"
                    />
                  </>
                ) : null}
              </div>
            ))}

            {liveDraft ? (
              <div
                className="absolute border-2 border-dashed border-primary bg-primary/10"
                style={{
                  left: `${liveDraft.x}%`,
                  top: `${liveDraft.y}%`,
                  width: `${liveDraft.width}%`,
                  height: `${liveDraft.height}%`,
                }}
              />
            ) : null}

            {!imageUrl ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                2500 × 1686
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
