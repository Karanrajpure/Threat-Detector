import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export function useSignOut() {
  const qc = useQueryClient(); const navigate = useNavigate();
  return async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({ to: "/auth", search: { redirect: undefined, mode: undefined }, replace: true }); };
}
