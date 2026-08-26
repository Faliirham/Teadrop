"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { isDemoMode } from "@/lib/env";
import { subscribeDemo } from "@/lib/demo/store";
import { createClient } from "@/lib/supabase/client";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: api.getSessionUser,
    staleTime: Infinity,
  });
}

/** Mode demo: sinkronkan query saat data localStorage berubah */
export function useDemoSync(): void {
  const qc = useQueryClient();
  useEffect(() => {
    if (!isDemoMode) return;
    return subscribeDemo(() => qc.invalidateQueries());
  }, [qc]);
}

/**
 * Mode live: langganan Supabase Realtime untuk tabel circle terkait.
 * Mode demo: tidak perlu (sudah ditangani useDemoSync).
 */
export function useCircleRealtime(circleId?: string): void {
  const qc = useQueryClient();
  useEffect(() => {
    if (isDemoMode || !circleId) return;
    const sb = createClient();
    const invalidate = () => {
      void qc.invalidateQueries({ queryKey: ["circle", circleId] });
      void qc.invalidateQueries({ queryKey: ["circles"] });
    };

    const channel = sb
      .channel(`circle:${circleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contributions" },
        invalidate
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "balance_updates", filter: `circle_id=eq.${circleId}` },
        invalidate
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "periods", filter: `circle_id=eq.${circleId}` },
        invalidate
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "circle_members", filter: `circle_id=eq.${circleId}` },
        invalidate
      )
      .subscribe();

    return () => {
      void sb.removeChannel(channel);
    };
  }, [circleId, qc]);
}

export function useMyCircles(enabled: boolean) {
  return useQuery({
    queryKey: ["circles"],
    queryFn: api.listMyCircles,
    enabled,
  });
}

export function useCircleDetail(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["circle", id],
    queryFn: () => api.getCircleDetail(id as string),
    enabled: !!id && enabled,
    retry: false,
  });
}
