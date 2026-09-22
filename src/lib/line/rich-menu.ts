import type { AreaBounds } from "./rich-menu-layouts";

// https://developers.line.biz/en/reference/messaging-api/#rich-menu
// https://developers.line.biz/en/reference/messaging-api/#rich-menu-alias

export type RichMenuAction =
  | { type: "message"; text: string }
  | { type: "uri"; uri: string }
  // richMenuAliasId targets another rich menu's alias — the "switch to
  // this other menu" tab behavior. `data` is required by LINE's API but
  // not surfaced anywhere in this app; the alias id doubles as a
  // sufficient value for it.
  | { type: "richmenuswitch"; richMenuAliasId: string; data: string };

export type RichMenuArea = { bounds: AreaBounds; action: RichMenuAction };

export type RichMenuApiResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function createRichMenu(
  channelAccessToken: string,
  name: string,
  width: number,
  height: number,
  areas: RichMenuArea[],
): Promise<RichMenuApiResult<{ richMenuId: string }>> {
  const res = await fetch("https://api.line.me/v2/bot/richmenu", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${channelAccessToken}` },
    body: JSON.stringify({
      size: { width, height },
      selected: false,
      name,
      chatBarText: "เมนู",
      areas: areas.map((area) => ({ bounds: area.bounds, action: area.action })),
    }),
  });

  if (!res.ok) return { ok: false, error: await res.text() };

  const data = (await res.json()) as { richMenuId?: string };
  if (!data.richMenuId) return { ok: false, error: "LINE API response was missing richMenuId" };

  return { ok: true, data: { richMenuId: data.richMenuId } };
}

export async function uploadRichMenuImage(
  channelAccessToken: string,
  richMenuId: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<RichMenuApiResult> {
  const res = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: { "Content-Type": contentType, Authorization: `Bearer ${channelAccessToken}` },
    body: bytes,
  });

  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true, data: undefined };
}

export async function setDefaultRichMenuOnLine(
  channelAccessToken: string,
  richMenuId: string,
): Promise<RichMenuApiResult> {
  const res = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${channelAccessToken}` },
  });

  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true, data: undefined };
}

export async function deleteRichMenuOnLine(channelAccessToken: string, richMenuId: string): Promise<RichMenuApiResult> {
  const res = await fetch(`https://api.line.me/v2/bot/richmenu/${richMenuId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${channelAccessToken}` },
  });

  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true, data: undefined };
}

// Creates a new alias — always POST, never PUT: each of our rich_menus
// rows gets exactly one alias, created exactly once, using the row's own
// id as the alias id (see the migration for why that ordering works).
export async function createRichMenuAlias(
  channelAccessToken: string,
  aliasId: string,
  richMenuId: string,
): Promise<RichMenuApiResult> {
  const res = await fetch("https://api.line.me/v2/bot/richmenu/alias", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${channelAccessToken}` },
    body: JSON.stringify({ richMenuAliasId: aliasId, richMenuId }),
  });

  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true, data: undefined };
}

export async function deleteRichMenuAlias(channelAccessToken: string, aliasId: string): Promise<RichMenuApiResult> {
  const res = await fetch(`https://api.line.me/v2/bot/richmenu/alias/${aliasId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${channelAccessToken}` },
  });

  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true, data: undefined };
}
