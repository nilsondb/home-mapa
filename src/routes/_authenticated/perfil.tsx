import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRole, useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — MeuMapa" },
      {
        name: "description",
        content: "Atualize nome, nascimento, sexo, peso, altura, telefone e foto.",
      },
      { property: "og:title", content: "Meu perfil — MeuMapa" },
      { property: "og:description", content: "Seus dados clínicos básicos no MeuMapa." },
    ],
  }),
  component: Perfil,
});

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(120),
  data_nascimento: z.string().optional(),
  sexo: z.enum(["masculino", "feminino", "outro", "nao_informado"]),
  peso_kg: z.string().optional(),
  altura_cm: z.string().optional(),
  telefone: z.string().trim().max(30).optional(),
  foto_url: z.string().trim().url("URL inválida").max(500).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

function Perfil() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { data: role } = useRole(user?.id);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", sexo: "nao_informado" },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        nome: profile.nome ?? "",
        data_nascimento: profile.data_nascimento ?? "",
        sexo: profile.sexo ?? "nao_informado",
        peso_kg: profile.peso_kg ? String(profile.peso_kg) : "",
        altura_cm: profile.altura_cm ? String(profile.altura_cm) : "",
        telefone: profile.telefone ?? "",
        foto_url: profile.foto_url ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const salvar = useMutation({
    mutationFn: async (v: FormValues) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          nome: v.nome,
          data_nascimento: v.data_nascimento || null,
          sexo: v.sexo,
          peso_kg: v.peso_kg ? Number(v.peso_kg) : null,
          altura_cm: v.altura_cm ? Number(v.altura_cm) : null,
          telefone: v.telefone || null,
          foto_url: v.foto_url || null,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Perfil atualizado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conta {role === "medico" ? "de médico" : "de paciente"} · {user?.email}
        </p>
      </div>

      <form
        onSubmit={form.handleSubmit((v) => salvar.mutate(v))}
        className="card-surface animate-rise space-y-4 p-6"
      >
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarImage src={form.watch("foto_url") || undefined} alt="Foto de perfil" />
            <AvatarFallback>{(profile?.nome ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="foto_url">Foto (URL)</Label>
            <Input id="foto_url" placeholder="https://..." {...form.register("foto_url")} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" {...form.register("nome")} />
          <p className="text-xs text-destructive">{form.formState.errors.nome?.message}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="data_nascimento">Nascimento</Label>
            <Input id="data_nascimento" type="date" {...form.register("data_nascimento")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sexo">Sexo</Label>
            <Select
              value={form.watch("sexo")}
              onValueChange={(v) => form.setValue("sexo", v as FormValues["sexo"])}
            >
              <SelectTrigger id="sexo">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
                <SelectItem value="nao_informado">Prefiro não informar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="peso_kg">Peso (kg)</Label>
            <Input id="peso_kg" type="number" step="0.1" {...form.register("peso_kg")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="altura_cm">Altura (cm)</Label>
            <Input id="altura_cm" type="number" step="0.1" {...form.register("altura_cm")} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" placeholder="(00) 00000-0000" {...form.register("telefone")} />
        </div>

        <Button type="submit" className="w-full rounded-2xl" disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </form>
    </div>
  );
}
