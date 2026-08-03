import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Criar nova senha — MeuMapa" },
      { name: "description", content: "Defina uma nova senha para acessar o MeuMapa." },
      { property: "og:title", content: "Criar nova senha — MeuMapa" },
      { property: "og:description", content: "Redefinição de senha da sua conta MeuMapa." },
    ],
  }),
  component: ResetPassword,
});

const senhaSchema = z.string().min(6, "A senha deve ter ao menos 6 caracteres").max(72);

function ResetPassword() {
  const navigate = useNavigate();
  const [pronto, setPronto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setPronto(true);
    });
    if (hash.includes("type=recovery")) setPronto(true);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const senha = senhaSchema.safeParse(fd.get("senha"));
    if (!senha.success) {
      toast.error(senha.error.issues[0]!.message);
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha.data });
    setCarregando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha atualizada com sucesso.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="card-surface w-full max-w-md animate-rise p-6">
        <KeyRound className="h-8 w-8 text-primary" />
        <h1 className="mt-3 text-xl font-extrabold">Criar nova senha</h1>
        {pronto ? (
          <form onSubmit={salvar} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="senha">Nova senha</Label>
              <Input id="senha" name="senha" type="password" required placeholder="mínimo 6 caracteres" />
            </div>
            <Button type="submit" className="w-full rounded-2xl" disabled={carregando}>
              {carregando ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Abra esta página pelo link enviado no seu e-mail para redefinir a senha.
          </p>
        )}
      </div>
    </div>
  );
}
