"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TagBadge } from "@/components/tags/tag-badge";

export type BroadcastContact = {
  lineUserId: string;
  lineChannelId: string;
  displayName: string | null;
  pictureUrl: string | null;
  tags: { id: string; name: string; color: string }[];
};

// Same popup-list pattern as StickerPickerDialog — a searchable list of the
// channel's own conversation contacts, each shown with their name and
// whatever custom tags (see the Tags admin page) have been assigned to
// them, so picking a test-send target doesn't mean copy-pasting a raw UID.
export function ContactPickerDialog({
  contacts,
  onSelect,
  disabled,
}: {
  contacts: BroadcastContact[];
  onSelect: (contact: BroadcastContact) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("broadcast");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => (c.displayName ?? "").toLowerCase().includes(q) || c.lineUserId.toLowerCase().includes(q));
  }, [contacts, query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" disabled={disabled} className="gap-2" />}>
        <Users className="size-4" />
        {t("testSendPickContact")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("contactPickerTitle")}</DialogTitle>
        </DialogHeader>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("contactPickerSearchPlaceholder")}
        />
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("contactPickerEmpty")}</p>
          ) : (
            filtered.map((contact) => {
              const name = contact.displayName || t("testSendUnnamedContact");
              return (
                <button
                  key={contact.lineUserId}
                  type="button"
                  onClick={() => {
                    onSelect(contact);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-md p-2 text-left hover:bg-accent"
                >
                  <Avatar className="size-8">
                    {contact.pictureUrl ? <AvatarImage src={contact.pictureUrl} alt={name} /> : null}
                    <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{name}</span>
                    {contact.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((tag) => (
                          <TagBadge key={tag.id} name={tag.name} color={tag.color} className="h-4 px-1.5 text-[10px]" />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
