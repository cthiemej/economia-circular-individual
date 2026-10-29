import { supabase } from "@/integrations/supabase/client";

export const ADMIN_EMAIL = "claudio.thieme@udp.cl";

export type ClientInfo = {
  userId: string;
  fullName: string;
  email: string;
};

export type AdminInfo = {
  userId: string;
  name: string;
};

/** El cliente autenticado (correo/contraseña o Google). null si no hay sesión. */
export async function getClient(): Promise<ClientInfo | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user || u.user.is_anonymous) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", u.user.id)
    .maybeSingle();
  return {
    userId: u.user.id,
    fullName: data?.["full_name"] || u.user.user_metadata?.["full_name"] || u.user.email?.split("@")[0] || "Cliente",
    email: data?.["email"] ?? u.user.email ?? "",
  };
}

/** El administrador (claudio.thieme@udp.cl). null si la sesión no es la del administrador. */
export async function getAdmin(): Promise<AdminInfo | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user || u.user.is_anonymous) return null;
  if (u.user.email !== ADMIN_EMAIL) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", u.user.id)
    .maybeSingle();
  return { userId: u.user.id, name: data?.["full_name"] || data?.["email"] || "Administrador" };
}
