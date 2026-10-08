// Converts a `datetime-local` input's value — a wall-clock date/time with
// no timezone of its own — into the correct UTC instant for a GIVEN IANA
// timezone (the org's own scheduling timezone, not whatever the browser
// happens to be in). Uses the standard "double-format" trick: guess a UTC
// instant, read what wall-clock time that instant WOULD show in the target
// zone via Intl, and adjust by the difference — accurate without a full
// timezone-database dependency.
export function zonedTimeToUtcIso(localDateTime: string, timeZone: string): string {
  const [datePart, timePart] = localDateTime.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = (timePart ?? "00:00").split(":").map(Number);

  const guessUtcMs = Date.UTC(year, month - 1, day, hour, minute);
  const parts = formatPartsInZone(new Date(guessUtcMs), timeZone);
  const asIfUtcMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const offsetMs = asIfUtcMs - guessUtcMs;

  return new Date(guessUtcMs - offsetMs).toISOString();
}

// The current instant (optionally offset by `offsetMinutes`), formatted as
// a `datetime-local`-compatible string ("YYYY-MM-DDTHH:mm") in the given
// timezone — used as the minimum selectable schedule time, expressed in
// the org's own timezone rather than the browser's.
export function nowInTimeZoneInputValue(timeZone: string, offsetMinutes = 0): string {
  const instant = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const parts = formatPartsInZone(instant, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

function formatPartsInZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const raw = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(raw.year),
    month: Number(raw.month),
    day: Number(raw.day),
    hour: Number(raw.hour),
    minute: Number(raw.minute),
    second: Number(raw.second),
  };
}

// A reasonably small, common set of IANA timezones for a picker — not
// exhaustive (the full IANA database has ~400 zones), scoped to what a
// LINE OA template's actual customers are likely based in.
export const COMMON_TIMEZONES = [
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Jakarta",
  "Asia/Kuala_Lumpur",
  "Asia/Manila",
  "Asia/Ho_Chi_Minh",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
] as const;
