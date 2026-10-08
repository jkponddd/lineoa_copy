"use client";

import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

// Error boundaries must be Client Components. Deliberately not logging
// `error` anywhere here — this template has no error-tracking service
// wired up yet, so the only thing to do with it today is let the
// person retry; add real reporting (Sentry or similar) when one is chosen.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" />
      </span>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("genericTitle")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("genericDescription")}</p>
      </div>
      <Button onClick={() => reset()}>{t("retryButton")}</Button>
    </div>
  );
}
