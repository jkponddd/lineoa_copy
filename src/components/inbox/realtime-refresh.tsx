"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

// Re-runs the enclosing Server Component on any change to the given table
// (filtered to this org/conversation via RLS + the filter string). Simple
// on purpose: a full server refetch rather than reconciling client state,
// since Inbox data isn't large enough for that tradeoff to matter yet.
export function RealtimeRefresh({ table, filter }: { table: "messages" | "conversations"; filter: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`${table}:${filter}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter }, () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, router]);

  return null;
}
