import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdmin } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin_/login")({
  head: () => ({
    meta: [
      { title: "Ingreso administrador — Simulador de Economía Circular" },
      { name: "description", content: "Acceso del administrador al simulador de economía circular." },
      { property: "og:title", content: "Ingreso administrador — Simulador de Economía Circular" },
      { property: "og:description", content: "Acceso del administrador al simulador de economía circular." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: sErr } = await supabase.auth.signInWithPassword({ email, password });
    if (sErr) {
      setBusy(false);
      setError("Correo o contraseña incorrectos.");
      return;
    }
    const admin = await getAdmin();
    if (!admin) {
      await supabase.auth.signOut();
      setBusy(false);
      setError("Esta cuenta no es de administrador");
      return;
    }
    navigate({ to: "/admin", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Ingreso administrador</h1>
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw">Contraseña</Label>
          <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</Button>
        <p className="text-center text-xs">
          <Link to="/" className="text-muted-foreground hover:underline">Volver al ingreso de clientes</Link>
        </p>
      </form>
    </div>
  );
}
