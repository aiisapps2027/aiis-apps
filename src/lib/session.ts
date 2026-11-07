import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "ustadz" | "ortu";

export async function getCurrentRole(): Promise<{ userId: string; role: Role | null } | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
  const list = (roles ?? []).map((r) => r.role as Role);
  const role = list.includes("admin") ? "admin" : list.includes("ustadz") ? "ustadz" : list.includes("ortu") ? "ortu" : null;
  return { userId: data.user.id, role };
}

export const homeFor = (role: Role) => (role === "admin" ? "/admin" : role === "ustadz" ? "/ustadz" : "/ortu");

/** beforeLoad guard for role areas. Client-only (routes use ssr: false). */
export async function requireRole(role: Role) {
  const cur = await getCurrentRole();
  if (!cur) throw redirect({ to: "/login" });
  if (cur.role !== role) throw redirect({ to: cur.role ? homeFor(cur.role) : "/login" });
  return { userId: cur.userId };
}

export async function signOut(queryClient?: { cancelQueries: () => Promise<void>; clear: () => void }) {
  await queryClient?.cancelQueries();
  queryClient?.clear();
  await supabase.auth.signOut();
}
