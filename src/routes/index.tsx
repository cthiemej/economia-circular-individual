import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getClient } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COMPANY } from "@/lib/simulator-content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ingresar — Simulador de Economía Circular" },
      { name: "description", content: "Crea tu cuenta o inicia sesión para trabajar el simulador de economía circular." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Ingresar — Simulador de Economía Circular" },
      { property: "og:description", content: "Crea tu cuenta o inicia sesión para trabajar el simulador de economía circular." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    getClient().then((c) => {
      if (c) navigate({ to: "/mis-evaluaciones", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: sErr } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (sErr) throw new Error(sErr.message);
        if (!data.session) {
          setNotice("Revisa tu correo para confirmar la cuenta y luego inicia sesión.");
          setMode("login");
          return;
        }
      } else {
        const { error: sErr } = await supabase.auth.signInWithPassword({ email, password });
        if (sErr) throw new Error("Correo o contraseña incorrectos.");
      }
      navigate({ to: "/mis-evaluaciones" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  async function withGoogle() {
    setError(null);
    const { error: gErr } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/mis-evaluaciones` },
    });
    if (gErr) setError(gErr.message);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <p className="text-center text-sm uppercase tracking-widest text-primary">{COMPANY.name}</p>
        <h1 className="mt-2 text-center text-4xl font-semibold">Simulador de economía circular</h1>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Elaborado por Francisco Villegas Ph.D. y Claudio Thieme Ph.D.
        </p>

        <div className="mt-10 space-y-6 rounded-lg border bg-card p-8 shadow-sm">
          <div className="flex gap-2 rounded-md bg-muted p-1 text-sm">
            <button type="button" className={`flex-1 rounded px-3 py-1.5 ${mode === "login" ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`} onClick={() => setMode("login")}>Iniciar sesión</button>
            <button type="button" className={`flex-1 rounded px-3 py-1.5 ${mode === "signup" ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`} onClick={() => setMode("signup")}>Crear cuenta</button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Tu nombre y apellido</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={60} required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">Contraseña</Label>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
            </div>
            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            {notice && <p className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">{notice}</p>}
            <Button type="submit" size="lg" className="h-12 w-full text-lg" disabled={busy}>
              {busy ? "Un momento…" : mode === "signup" ? "Crear cuenta" : "Entrar"}
            </Button>
          </form>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> o <div className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="outline" className="h-11 w-full" onClick={withGoogle}>Continuar con Google</Button>
        </div>
        <p className="mt-8 text-center">
          <Link to="/admin/login" className="text-xs text-muted-foreground hover:underline">Soy administrador</Link>
        </p>
      </div>
    </div>
  );
}
