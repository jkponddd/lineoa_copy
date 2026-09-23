"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TagBadge } from "@/components/tags/tag-badge";
import { assignTagToConversationAction, removeTagFromConversationAction } from "@/app/[locale]/(app)/app/inbox/actions";

type Tag = { id: string; name: string; color: string };

export function ConversationTags({
  conversationId,
  assignedTags,
  allTags,
}: {
  conversationId: string;
  assignedTags: Tag[];
  allTags: Tag[];
}) {
  const t = useTranslations("inbox");
  const [pending, startTransition] = useTransition();

  const assignedIds = new Set(assignedTags.map((tag) => tag.id));
  const availableTags = allTags.filter((tag) => !assignedIds.has(tag.id));

  function handleAssign(tagId: string) {
    startTransition(async () => {
      await assignTagToConversationAction(conversationId, tagId);
    });
  }

  function handleRemove(tagId: string) {
    startTransition(async () => {
      await removeTagFromConversationAction(conversationId, tagId);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {assignedTags.map((tag) => (
        <div key={tag.id} className="flex items-center gap-1 rounded-full border pl-1 pr-1">
          <TagBadge name={tag.name} color={tag.color} className="border-none" />
          <button
            type="button"
            disabled={pending}
            aria-label={t("removeTag")}
            onClick={() => handleRemove(tag.id)}
            className="flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            <X className="size-2.5" />
          </button>
        </div>
      ))}

      {availableTags.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={pending}
                className="size-6 rounded-full"
                aria-label={t("addTag")}
              />
            }
          >
            <Plus className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {availableTags.map((tag) => (
              <DropdownMenuItem key={tag.id} onClick={() => handleAssign(tag.id)}>
                <TagBadge name={tag.name} color={tag.color} className="border-none px-0" />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
