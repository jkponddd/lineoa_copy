import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

// Uses the service role key — bypasses RLS entirely. Only for trusted
// server-side code that has no per-request user session to attach (the
// LINE webhook handler, the push-message sender). Never import this from
// anything reachable by a user's own request context; use
// src/lib/supabase/server.ts for that.
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
