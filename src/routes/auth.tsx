import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — MeuMapa" },
      {
        name: "description",
        content:
          "Acesse o MeuMapa para registrar sua pressão arterial em casa conforme orientação médica.",
      },
      { property: "og:title", content: "Entrar ou criar conta — MeuMapa" },
      {
        property: "og:description",
        content: "Login, cadastro e recuperação de senha do MeuMapa.",
      },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("E-mail inválido").max(255);
const senhaSchema = z.string().min(6, "A senha deve ter ao menos 6 caracteres").max(72);

function AuthPage() {
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(false);
  const [modoRecuperar, setModoRecuperar] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function entrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = emailSchema.safeParse(fd.get("email"));
    const senha = senhaSchema.safeParse(fd.get("senha"));
    if (!email.success) return toast.error(email.error.issues[0]!.message);
    if (!senha.success) return toast.error(senha.error.issues[0]!.message);

    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.data,
      password: senha.data,
    });
    setCarregando(false);
    if (error) return toast.error("E-mail ou senha incorretos.");
    navigate({ to: "/dashboard", replace: true });
  }

  async function cadastrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nome = String(fd.get("nome") ?? "").trim();
    const email = emailSchema.safeParse(fd.get("email"));
    const senha = senhaSchema.safeParse(fd.get("senha"));
    if (nome.length < 2) return toast.error("Informe seu nome completo.");
    if (!email.success) return toast.error(email.error.issues[0]!.message);
    if (!senha.success) return toast.error(senha.error.issues[0]!.message);

    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.data,
      password: senha.data,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome, role: "paciente" },
      },
    });
    setCarregando(false);
    if (error) return toast.error(error.message);
    if (data.session) {
      navigate({ to: "/dashboard", replace: true });
    } else {
      toast.success("Conta criada! Confirme seu e-mail para acessar.");
    }
  }

  async function recuperar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = emailSchema.safeParse(fd.get("email"));
    if (!email.success) return toast.error(email.error.issues[0]!.message);
    setCarregando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setCarregando(false);
    if (error) return toast.error(error.message);
    toast.success("Enviamos um link de recuperação para o seu e-mail.");
    setModoRecuperar(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl gradient-health">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="text-2xl font-extrabold tracking-tight">MeuMapa</span>
        </Link>

        <div className="card-surface animate-rise p-6">
          {modoRecuperar ? (
            <form onSubmit={recuperar} className="space-y-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => setModoRecuperar(false)}>
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <div>
                <h1 className="text-xl font-extrabold">Recuperar senha</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enviaremos um link para você criar uma nova senha.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rec-email">E-mail</Label>
                <Input id="rec-email" name="email" type="email" required placeholder="voce@email.com" />
              </div>
              <Button type="submit" className="w-full rounded-2xl" disabled={carregando}>
                <Mail className="h-4 w-4" /> Enviar link
              </Button>
            </form>
          ) : (
            <Tabs defaultValue="entrar">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="entrar">Entrar</TabsTrigger>
                <TabsTrigger value="cadastrar">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="entrar">
                <form onSubmit={entrar} className="space-y-4 pt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" name="email" type="email" required placeholder="voce@email.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="senha">Senha</Label>
                    <Input id="senha" name="senha" type="password" required placeholder="••••••" />
                  </div>
                  <Button type="submit" className="w-full rounded-2xl" disabled={carregando}>
                    {carregando ? "Entrando..." : "Entrar"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setModoRecuperar(true)}
                    className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="cadastrar">
                <form onSubmit={cadastrar} className="space-y-4 pt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nome">Nome completo</Label>
                    <Input id="nome" name="nome" required placeholder="João da Silva" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email-c">E-mail</Label>
                    <Input id="email-c" name="email" type="email" required placeholder="voce@email.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="senha-c">Senha</Label>
                    <Input id="senha-c" name="senha" type="password" required placeholder="mínimo 6 caracteres" />
                  </div>
                  <Button type="submit" className="w-full rounded-2xl" disabled={carregando}>
                    {carregando ? "Criando..." : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          O MeuMapa organiza suas medições. Ele não substitui a avaliação do seu médico.
        </p>
      </div>
    </div>
  );
}
