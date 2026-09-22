"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getLineChannelAccessTokenByChannelUuid } from "@/lib/line/get-channel-access-token";
import {
  createRichMenu,
  createRichMenuAlias,
  deleteRichMenuAlias,
  deleteRichMenuOnLine,
  setDefaultRichMenuOnLine,
  uploadRichMenuImage,
  type RichMenuAction,
  type RichMenuArea,
} from "@/lib/line/rich-menu";
import {
  percentToPixelBounds,
  RICH_MENU_IMAGE_HEIGHT,
  RICH_MENU_IMAGE_WIDTH,
} from "@/lib/line/rich-menu-layouts";
import type { RichMenuAreaData, RichMenuLayout } from "@/lib/supabase/database.types";

export type RichMenuActionResult = { error: string | null };

export async function createRichMenuAction(
  lineChannelId: string,
  name: string,
  layout: RichMenuLayout,
  imagePath: string,
  imageContentType: string,
  areas: RichMenuAreaData[],
): Promise<RichMenuActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const accessToken = await getLineChannelAccessTokenByChannelUuid(lineChannelId);
  if (!accessToken) return { error: "channel_unavailable" };

  const { data: imageBlob, error: downloadError } = await supabase.storage
    .from("rich-menu-images")
    .download(imagePath);
  if (downloadError || !imageBlob) return { error: "image_unavailable" };

  // Resolve each area's LINE action, including looking up the alias id for
  // any "switch to another menu" areas — the target must already be a
  // published menu on the SAME channel (an alias only makes sense within
  // one channel's own access token).
  const resolvedAreas: RichMenuArea[] = [];
  for (const area of areas) {
    if (!area.bounds) return { error: "invalid_area" };

    let action: RichMenuAction;
    if (area.action_type === "message") {
      action = { type: "message", text: area.action_value };
    } else if (area.action_type === "uri") {
      action = { type: "uri", uri: area.action_value };
    } else {
      const { data: target } = await supabase
        .from("rich_menus")
        .select("line_channel_id, line_rich_menu_alias_id, status")
        .eq("id", area.action_value)
        .maybeSingle();

      if (!target || target.line_channel_id !== lineChannelId || target.status !== "published" || !target.line_rich_menu_alias_id) {
        return { error: "invalid_switch_target" };
      }
      action = { type: "richmenuswitch", richMenuAliasId: target.line_rich_menu_alias_id, data: target.line_rich_menu_alias_id };
    }

    resolvedAreas.push({ bounds: percentToPixelBounds(area.bounds), action });
  }

  const newId = crypto.randomUUID();

  const created = await createRichMenu(accessToken, name, RICH_MENU_IMAGE_WIDTH, RICH_MENU_IMAGE_HEIGHT, resolvedAreas);

  if (!created.ok) {
    await recordFailure(supabase, newId, lineChannelId, name, layout, imagePath, areas, created.error, user.id);
    return { error: "line_api_failed" };
  }

  const uploaded = await uploadRichMenuImage(accessToken, created.data.richMenuId, await imageBlob.arrayBuffer(), imageContentType);
  if (!uploaded.ok) {
    await deleteRichMenuOnLine(accessToken, created.data.richMenuId);
    await recordFailure(supabase, newId, lineChannelId, name, layout, imagePath, areas, uploaded.error, user.id);
    return { error: "line_api_failed" };
  }

  const alias = await createRichMenuAlias(accessToken, newId, created.data.richMenuId);
  if (!alias.ok) {
    await deleteRichMenuOnLine(accessToken, created.data.richMenuId);
    await recordFailure(supabase, newId, lineChannelId, name, layout, imagePath, areas, alias.error, user.id);
    return { error: "line_api_failed" };
  }

  const { error } = await supabase.rpc("record_rich_menu", {
    p_id: newId,
    p_line_channel_id: lineChannelId,
    p_name: name,
    p_layout: layout,
    p_image_path: imagePath,
    p_areas: areas,
    p_line_rich_menu_id: created.data.richMenuId,
    p_line_rich_menu_alias_id: newId,
    p_status: "published",
    p_error_message: null,
    p_created_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/[locale]/(app)/app/rich-menu", "page");
  return { error: null };
}

async function recordFailure(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  lineChannelId: string,
  name: string,
  layout: RichMenuLayout,
  imagePath: string,
  areas: RichMenuAreaData[],
  errorMessage: string,
  userId: string,
) {
  await supabase.rpc("record_rich_menu", {
    p_id: id,
    p_line_channel_id: lineChannelId,
    p_name: name,
    p_layout: layout,
    p_image_path: imagePath,
    p_areas: areas,
    p_line_rich_menu_id: null,
    p_line_rich_menu_alias_id: null,
    p_status: "failed",
    p_error_message: errorMessage,
    p_created_by: userId,
  });
  revalidatePath("/[locale]/(app)/app/rich-menu", "page");
}

export async function setDefaultRichMenuAction(richMenuId: string): Promise<RichMenuActionResult> {
  const supabase = await createClient();
  const { data: richMenu } = await supabase
    .from("rich_menus")
    .select("line_channel_id, line_rich_menu_id")
    .eq("id", richMenuId)
    .single();

  if (!richMenu?.line_rich_menu_id) return { error: "rich_menu_not_found" };

  const accessToken = await getLineChannelAccessTokenByChannelUuid(richMenu.line_channel_id);
  if (!accessToken) return { error: "channel_unavailable" };

  const result = await setDefaultRichMenuOnLine(accessToken, richMenu.line_rich_menu_id);
  if (!result.ok) return { error: "line_api_failed" };

  const { error } = await supabase.rpc("set_default_rich_menu", { p_rich_menu_id: richMenuId });
  if (error) return { error: error.message };

  revalidatePath("/[locale]/(app)/app/rich-menu", "page");
  return { error: null };
}

export async function deleteRichMenuAction(richMenuId: string): Promise<RichMenuActionResult> {
  const supabase = await createClient();
  const { data: richMenu } = await supabase
    .from("rich_menus")
    .select("line_channel_id, line_rich_menu_id, line_rich_menu_alias_id, image_path")
    .eq("id", richMenuId)
    .single();

  if (!richMenu) return { error: "rich_menu_not_found" };

  const accessToken = await getLineChannelAccessTokenByChannelUuid(richMenu.line_channel_id);
  if (accessToken) {
    // Best-effort: still remove our own record even if either LINE-side
    // call fails (e.g. it was already removed directly in the LINE console).
    if (richMenu.line_rich_menu_alias_id) await deleteRichMenuAlias(accessToken, richMenu.line_rich_menu_alias_id);
    if (richMenu.line_rich_menu_id) await deleteRichMenuOnLine(accessToken, richMenu.line_rich_menu_id);
  }

  const { error } = await supabase.rpc("delete_rich_menu_record", { p_rich_menu_id: richMenuId });
  if (error) return { error: error.message };

  await supabase.storage.from("rich-menu-images").remove([richMenu.image_path]);

  revalidatePath("/[locale]/(app)/app/rich-menu", "page");
  return { error: null };
}
