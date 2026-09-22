import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

export default async function AppHomePage() {
  const locale = await getLocale();
  redirect({ href: "/app/inbox", locale });
  return null;
}
