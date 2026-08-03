import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Medicao, Protocolo } from "@/lib/meumapa";

export function useProtocoloAtivo(userId?: string) {
  return useQuery({
    queryKey: ["protocolo", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Protocolo | null> => {
      const { data, error } = await supabase
        .from("protocolos")
        .select("*")
        .eq("user_id", userId!)
        .eq("status", "ativo")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as Protocolo;
      const { data: novo, error: e2 } = await supabase
        .from("protocolos")
        .insert({ user_id: userId! })
        .select("*")
        .single();
      if (e2) throw e2;
      return novo as Protocolo;
    },
  });
}

export function useMedicoes(userId?: string) {
  return useQuery({
    queryKey: ["medicoes", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Medicao[]> => {
      const { data, error } = await supabase
        .from("medicoes")
        .select("*")
        .eq("user_id", userId!)
        .order("data", { ascending: false })
        .order("periodo", { ascending: true })
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Medicao[];
    },
  });
}
