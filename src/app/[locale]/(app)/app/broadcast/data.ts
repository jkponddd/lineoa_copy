import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { BroadcastContact } from "@/components/broadcast/contact-picker-dialog";

// Shared between the list page and the /new composer page — both need the
// channel list and the contact-picker's tagged-contact list, and this is
// the one place that join gets built so they can't drift apart.
export async function getBroadcastComposerContext(orgId: string) {
  const supabase = await createClient();

  const [{ data: channels }, { data: conversationRows }, { data: tags }, { data: conversationTagRows }] = await Promise.all([
    supabase.from("line_channels").select("id, display_name").eq("organization_id", orgId),
    supabase.from("conversations").select("id, line_channel_id, line_user_id, display_name, picture_url").eq("organization_id", orgId),
    supabase.from("tags").select("id, name, color").eq("organization_id", orgId).order("name"),
    supabase.from("conversation_tags").select("conversation_id, tag_id"),
  ]);

  const tagById = new Map((tags ?? []).map((tag) => [tag.id, tag]));
  const tagIdsByConversation = new Map<string, string[]>();
  for (const row of conversationTagRows ?? []) {
    const list = tagIdsByConversation.get(row.conversation_id) ?? [];
    list.push(row.tag_id);
    tagIdsByConversation.set(row.conversation_id, list);
  }

  const contacts: BroadcastContact[] = (conversationRows ?? []).map((c) => ({
    lineUserId: c.line_user_id,
    lineChannelId: c.line_channel_id,
    displayName: c.display_name,
    pictureUrl: c.picture_url,
    tags: (tagIdsByConversation.get(c.id) ?? []).flatMap((tagId) => {
      const tag = tagById.get(tagId);
      return tag ? [tag] : [];
    }),
  }));

  return { channels: channels ?? [], contacts };
}
