"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Download, FileText } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  direction: "inbound" | "outbound";
  type: "text" | "image" | "sticker" | "file";
  content: string | null;
  mediaUrl: string | null;
  created_at: string;
};

export function MessageThread({ messages }: { messages: Message[] }) {
  const t = useTranslations("inbox");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <ScrollArea className="min-h-0 flex-1 rounded-lg border">
      <div className="flex flex-col gap-2 p-3">
        {messages.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">{t("noMessages")}</p>
        ) : null}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex", message.direction === "outbound" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                message.direction === "outbound"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
              )}
            >
              <MessageBody message={message} />
              <p className="mt-1 text-right text-[10px] opacity-70">
                {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

function MessageBody({ message }: { message: Message }) {
  const t = useTranslations("inbox");

  if (message.type === "image" && message.mediaUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- private, signed Storage URL; next/image can't proxy it
    return <img src={message.mediaUrl} alt={t("imageAlt")} className="max-h-64 rounded-md object-contain" />;
  }

  if (message.type === "sticker") {
    const stickerId = parseStickerId(message.content);
    if (stickerId) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- LINE's own public sticker CDN, not our storage
        <img
          src={`https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/android/sticker.png`}
          alt={t("stickerAlt")}
          className="size-24 object-contain"
        />
      );
    }
    return <p className="text-muted-foreground italic">{t("stickerAlt")}</p>;
  }

  if (message.type === "file") {
    return (
      <a
        href={message.mediaUrl ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 underline underline-offset-2"
      >
        <FileText className="size-4 shrink-0" />
        <span className="truncate">{message.content || t("fileAlt")}</span>
        <Download className="size-3.5 shrink-0 opacity-70" />
      </a>
    );
  }

  return <p className="whitespace-pre-wrap wrap-break-word">{message.content}</p>;
}

function parseStickerId(content: string | null): string | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as { stickerId?: string };
    return parsed.stickerId ?? null;
  } catch {
    return null;
  }
}
