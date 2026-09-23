"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getLineChannelAccessTokenByChannelUuid } from "@/lib/line/get-channel-access-token";
import { pushMessage } from "@/lib/line/send-message";
import { buildBroadcastMessages, performBroadcastSend } from "@/lib/broadcast/send-broadcast";
import type { BroadcastAudience, BroadcastTemplate } from "@/lib/supabase/database.types";

export type BroadcastActionResult = { error: string | null };

export type BroadcastComposeParams = {
  lineChannelId: string;
  template: BroadcastTemplate;
  content: string | null;
  imageMediaPath: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  audience: BroadcastAudience;
};

function revalidateBroadcastPaths() {
  revalidatePath("/[locale]/(app)/app/broadcast", "page");
}

// Send now (scheduledAt null) or queue for later (scheduledAt set). When
// existingDraftId is set, this is "send/schedule FROM a draft" — the draft
// row is updated in place via update_broadcast() rather than a fresh
// record_broadcast() insert, so a sent draft doesn't leave an orphan draft
// row behind.
export async function sendBroadcast(
  params: BroadcastComposeParams & { scheduledAt: string | null; existingDraftId: string | null },
): Promise<BroadcastActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  if (params.scheduledAt) {
    // Queued: nothing gets sent to LINE until the cron-triggered route
    // (src/app/api/broadcasts/process-due) picks it up at or after
    // scheduledAt. No point resolving a signed image URL now either; it
    // would likely expire before send time.
    const { error } = params.existingDraftId
      ? await supabase.rpc("update_broadcast", {
          p_broadcast_id: params.existingDraftId,
          p_line_channel_id: params.lineChannelId,
          p_template: params.template,
          p_content: params.content,
          p_image_media_path: params.imageMediaPath,
          p_link_url: params.linkUrl,
          p_link_label: params.linkLabel,
          p_audience: params.audience,
          p_scheduled_at: params.scheduledAt,
          p_status: "scheduled",
          p_error_message: null,
        })
      : await supabase.rpc("record_broadcast", {
          p_line_channel_id: params.lineChannelId,
          p_template: params.template,
          p_content: params.content,
          p_image_media_path: params.imageMediaPath,
          p_link_url: params.linkUrl,
          p_link_label: params.linkLabel,
          p_audience: params.audience,
          p_scheduled_at: params.scheduledAt,
          p_status: "scheduled",
          p_error_message: null,
          p_sent_by: user.id,
        });

    if (error) return { error: error.message };
    revalidateBroadcastPaths();
    return { error: null };
  }

  const messages = await buildBroadcastMessages({
    template: params.template,
    content: params.content,
    imageMediaPath: params.imageMediaPath,
    linkUrl: params.linkUrl,
    linkLabel: params.linkLabel,
  });
  const sent = await performBroadcastSend({
    lineChannelUuid: params.lineChannelId,
    audience: params.audience,
    messages,
  });

  // Recorded either way — a failed send is still part of the history, per
  // record_broadcast()'s own reasoning (see the migration).
  const { error } = params.existingDraftId
    ? await supabase.rpc("update_broadcast", {
        p_broadcast_id: params.existingDraftId,
        p_line_channel_id: params.lineChannelId,
        p_template: params.template,
        p_content: params.content,
        p_image_media_path: params.imageMediaPath,
        p_link_url: params.linkUrl,
        p_link_label: params.linkLabel,
        p_audience: params.audience,
        p_scheduled_at: null,
        p_status: sent.ok ? "sent" : "failed",
        p_error_message: sent.ok ? null : sent.error,
      })
    : await supabase.rpc("record_broadcast", {
        p_line_channel_id: params.lineChannelId,
        p_template: params.template,
        p_content: params.content,
        p_image_media_path: params.imageMediaPath,
        p_link_url: params.linkUrl,
        p_link_label: params.linkLabel,
        p_audience: params.audience,
        p_scheduled_at: null,
        p_status: sent.ok ? "sent" : "failed",
        p_error_message: sent.ok ? null : sent.error,
        p_sent_by: user.id,
      });

  if (error) return { error: error.message };
  if (!sent.ok) return { error: "line_api_failed" };

  revalidateBroadcastPaths();
  return { error: null };
}

export async function cancelScheduledBroadcast(broadcastId: string): Promise<BroadcastActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_scheduled_broadcast", { p_broadcast_id: broadcastId });

  if (error) return { error: error.message };

  revalidateBroadcastPaths();
  return { error: null };
}

// Saves a brand-new draft (status='draft', never sent). Returns the new
// row's id so the composer can switch into "editing this draft" mode
// (further saves update it in place instead of creating duplicates).
export async function saveBroadcastDraft(params: BroadcastComposeParams): Promise<BroadcastActionResult & { id: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated", id: null };

  const { data, error } = await supabase.rpc("record_broadcast", {
    p_line_channel_id: params.lineChannelId,
    p_template: params.template,
    p_content: params.content,
    p_image_media_path: params.imageMediaPath,
    p_link_url: params.linkUrl,
    p_link_label: params.linkLabel,
    p_audience: params.audience,
    p_scheduled_at: null,
    p_status: "draft",
    p_error_message: null,
    p_sent_by: user.id,
  });

  if (error) return { error: error.message, id: null };

  revalidateBroadcastPaths();
  return { error: null, id: data?.id ?? null };
}

// Re-saves an existing draft's fields in place, without sending it.
export async function updateBroadcastDraft(broadcastId: string, params: BroadcastComposeParams): Promise<BroadcastActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_broadcast", {
    p_broadcast_id: broadcastId,
    p_line_channel_id: params.lineChannelId,
    p_template: params.template,
    p_content: params.content,
    p_image_media_path: params.imageMediaPath,
    p_link_url: params.linkUrl,
    p_link_label: params.linkLabel,
    p_audience: params.audience,
    p_scheduled_at: null,
    p_status: "draft",
    p_error_message: null,
  });

  if (error) return { error: error.message };

  revalidateBroadcastPaths();
  return { error: null };
}

export async function deleteBroadcastDraft(broadcastId: string): Promise<BroadcastActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_broadcast_draft", { p_broadcast_id: broadcastId });

  if (error) return { error: error.message };

  revalidateBroadcastPaths();
  return { error: null };
}

// A one-off push to a single LINE user, for previewing what a broadcast
// will actually look like before committing to a real send. Deliberately
// NOT recorded in broadcast history — it's a throwaway preview, not part of
// what actually went out to the audience.
export async function sendTestBroadcast(
  params: BroadcastComposeParams & { targetUserId: string },
): Promise<BroadcastActionResult> {
  const trimmedTarget = params.targetUserId.trim();
  if (!trimmedTarget) return { error: "testTargetRequired" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const accessToken = await getLineChannelAccessTokenByChannelUuid(params.lineChannelId);
  if (!accessToken) return { error: "channel_unavailable" };

  const messages = await buildBroadcastMessages({
    template: params.template,
    content: params.content,
    imageMediaPath: params.imageMediaPath,
    linkUrl: params.linkUrl,
    linkLabel: params.linkLabel,
  });
  if (messages.length === 0) return { error: "empty" };

  const sent = await pushMessage(accessToken, trimmedTarget, messages);
  if (!sent.ok) return { error: "line_api_failed" };

  return { error: null };
}
