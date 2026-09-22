"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignConversationAction } from "@/app/[locale]/(app)/app/inbox/actions";

const UNASSIGNED = "__unassigned__";

type Member = { user_id: string; email: string; full_name: string | null };

export function AssignSelect({
  conversationId,
  assignedTo,
  members,
}: {
  conversationId: string;
  assignedTo: string | null;
  members: Member[];
}) {
  const t = useTranslations("inbox");
  const [value, setValue] = useState(assignedTo ?? UNASSIGNED);
  const [pending, startTransition] = useTransition();

  const labelByUserId = new Map(members.map((m) => [m.user_id, m.full_name || m.email]));

  return (
    <Select
      value={value}
      disabled={pending}
      onValueChange={(next) => {
        const nextValue = next as string;
        setValue(nextValue);
        startTransition(async () => {
          await assignConversationAction(conversationId, nextValue === UNASSIGNED ? null : nextValue);
        });
      }}
    >
      <SelectTrigger size="sm" className="w-40 shrink-0">
        <SelectValue>{(v: string) => (v === UNASSIGNED ? t("unassigned") : (labelByUserId.get(v) ?? v))}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>{t("unassigned")}</SelectItem>
        {members.map((member) => (
          <SelectItem key={member.user_id} value={member.user_id}>
            {member.full_name || member.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
