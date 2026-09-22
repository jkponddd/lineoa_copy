"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  direction: "inbound" | "outbound";
  type: "text" | "image";
  content: string | null;
  imageUrl: string | null;
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
              {message.type === "image" && message.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- private, signed Storage URL; next/image can't proxy it
                <img src={message.imageUrl} alt={t("imageAlt")} className="max-h-64 rounded-md object-contain" />
              ) : (
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              )}
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
