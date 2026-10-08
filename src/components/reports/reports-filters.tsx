"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, usePathname } from "@/i18n/navigation";

const DAY_OPTIONS = [7, 14, 30, 90] as const;
const ALL_CHANNELS = "all";

export function ReportsFilters({
  days,
  channel,
  channels,
}: {
  days: number;
  channel: string;
  channels: { id: string; display_name: string }[];
}) {
  const t = useTranslations("reports");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string, defaultValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === defaultValue) params.delete(key);
    else params.set(key, value);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={String(days)} onValueChange={(v) => updateParam("days", v ?? "14", "14")}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue>{(v: string) => t("filterRangeDays", { days: v })}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DAY_OPTIONS.map((d) => (
            <SelectItem key={d} value={String(d)}>
              {t("filterRangeDays", { days: d })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {channels.length > 0 ? (
        <Select value={channel} onValueChange={(v) => updateParam("channel", v ?? ALL_CHANNELS, ALL_CHANNELS)}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue>
              {(v: string) => (v === ALL_CHANNELS ? t("filterAllChannels") : (channels.find((c) => c.id === v)?.display_name ?? v))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CHANNELS}>{t("filterAllChannels")}</SelectItem>
            {channels.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
