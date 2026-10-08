import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

// Only ever reached via a one-time recovery link's token exchange —
// nothing here is a page a search engine should ever send someone to.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ResetPasswordPage() {
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only reachable with a valid session, which /auth/confirm establishes
  // after verifying the recovery link's token. No session here means
  // someone navigated here directly rather than through a real reset link.
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  return <ResetPasswordForm />;
}
