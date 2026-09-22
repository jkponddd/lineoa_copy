// LINE only lets a bot push a sticker from a package that's actually
// available to it — there's no API to list "every sticker this channel can
// send," and arbitrary IDs aren't guaranteed to work. These are LINE's own
// documented example stickers (package 11537, the "Brown & Cony" set used
// throughout LINE's own Messaging API reference docs), safe to rely on
// working for any channel. A real product would eventually want a proper
// sticker picker backed by whatever packages the channel owner has curated,
// but that needs a whole other piece of infrastructure this template
// doesn't have yet — this is a deliberately small, known-good starting set.
export const SAMPLE_STICKERS: { packageId: string; stickerId: string }[] = [
  { packageId: "11537", stickerId: "52002734" },
  { packageId: "11537", stickerId: "52002735" },
  { packageId: "11537", stickerId: "52002736" },
  { packageId: "11537", stickerId: "52002737" },
  { packageId: "11537", stickerId: "52002738" },
  { packageId: "11537", stickerId: "52002739" },
  { packageId: "11537", stickerId: "52002740" },
  { packageId: "11537", stickerId: "52002741" },
];

export function stickerThumbnailUrl(stickerId: string): string {
  return `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/android/sticker.png`;
}
