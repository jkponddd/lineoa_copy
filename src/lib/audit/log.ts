import "server-only";

import { createClient } from "@/lib/supabase/server";

// Best-effort: a failed audit write shouldn't roll back or surface an error
// for an action that itself already succeeded, so callers don't need to
// check the result. Uses the caller's own session (not service role) — RLS
// already lets any org member insert into their own organization's log.
export async function logAuditEvent(params: {
  organizationId: string;
  actorId: string | null;
  action: string;
  target?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  await supabase.from("audit_log").insert({
    organization_id: params.organizationId,
    actor_id: params.actorId,
    action: params.action,
    target: params.target ?? null,
    metadata: params.metadata ?? {},
  });
}
