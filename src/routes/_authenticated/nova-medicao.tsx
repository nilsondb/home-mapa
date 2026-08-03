import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Moon, Sun, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useMedicoes, useProtocoloAtivo } from "@/hooks/use-medicoes";
import { hojeISO, media, PERIODO_LABEL, type Periodo } from "@/lib/meumapa";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/nova-medicao")({
  head: () => ({
    meta: [
      { title: "Nova medição — MeuMapa" },
      {
        name: "description",
        content: "Registre duas aferições de pressão arterial e obtenha a média automática.",
      },
      { property: "og:title", content: "Nova medição — MeuMapa" },
      {
        property: "og:description",
        content: "Registre duas aferições e a média é calculada automaticamente.",
      },
    ],
  }),
  component: NovaMedicao,
});

const schema = z.object({
  sistolica: z.coerce.number().int().min(50, "Mínimo 50").max(300, "Máximo 300"),
  diastolica: z.coerce.number().int().min(30, "Mínimo 30").max(200, "Máximo 200"),
  pulso: z.coerce.number().int().min(20).max(250).optional().or(z.literal("" as never)),
  braco: z.enum(["direito", "esquerdo"]),
  observacao: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});
type FormValues = z.input<typeof schema>;

function NovaMedicao() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { data: protocolo } = useProtocoloAtivo(user?.id);
  const { data: medicoes = [] } = useMedicoes(user?.id);

  const [periodo, setPeriodo] = useState<Periodo | null>(null);
  const [aguardando, setAguardando] = useState(false);

  const hoje = hojeISO();
  const feitasHoje = useMemo(
    () => medicoes.filter((m) => m.data === hoje && m.periodo === periodo),
    [medicoes, hoje, periodo],
  );
  const ordem = feitasHoje.length + 1;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { braco: "esquerdo", observacao: "" },
  });

  const salvar = useMutation({
    mutationFn: async (values: FormValues) => {
      const parsed = schema.parse(values);
      const agora = new Date();
      const { error } = await supabase.from("medicoes").insert({
        user_id: user!.id,
        protocolo_id: protocolo?.id ?? null,
        data: hoje,
        hora: agora.toTimeString().slice(0, 8),
        periodo: periodo!,
        ordem,
        sistolica: parsed.sistolica,
        diastolica: parsed.diastolica,
        pulso: typeof parsed.pulso === "number" ? parsed.pulso : null,
        braco: parsed.braco,
        observacao: parsed.observacao || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["medicoes"] });
      form.reset({ braco: "esquerdo", observacao: "" });
      if (ordem === 1) {
        setAguardando(true);
      } else {
        toast.success("Segunda aferição salva. Média calculada automaticamente.");
        navigate({ to: "/historico" });
      }
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível salvar."),
  });

  if (!periodo) {
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="card-surface animate-rise p-6 text-center">
          <h1 className="text-xl font-extrabold">É uma medição de manhã ou de noite?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha o período para começar a aferição.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setPeriodo("manha")}
              className="rounded-2xl border border-border bg-secondary/50 p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Sun className="mx-auto h-9 w-9 text-morning" />
              <span className="mt-3 block text-lg font-bold">Manhã</span>
            </button>
            <button
              onClick={() => setPeriodo("noite")}
              className="rounded-2xl border border-border bg-secondary/50 p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Moon className="mx-auto h-9 w-9 text-night" />
              <span className="mt-3 block text-lg font-bold">Noite</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (aguardando) {
    const s = media(feitasHoje.map((m) => m.sistolica));
    const d = media(feitasHoje.map((m) => m.diastolica));
    return (
      <div className="mx-auto max-w-lg">
        <div className="card-surface animate-rise p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <h1 className="mt-4 text-xl font-extrabold">Primeira aferição concluída.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Aguarde aproximadamente 1 minuto para realizar a segunda aferição.
          </p>
          {s && d ? (
            <p className="mt-4 text-3xl font-extrabold tracking-tight">
              {Math.round(s)}×{Math.round(d)}
            </p>
          ) : null}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Timer className="h-4 w-4" /> Permaneça sentado e em repouso.
          </div>
          <Button
            size="lg"
            className="mt-6 w-full rounded-2xl"
            onClick={() => setAguardando(false)}
          >
            Registrar segunda aferição
          </Button>
          <Button
            variant="ghost"
            className="mt-2 w-full"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            Fazer depois
          </Button>
        </div>
      </div>
    );
  }

  if (feitasHoje.length >= 2) {
    return (
      <div className="mx-auto max-w-lg card-surface p-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h1 className="mt-4 text-xl font-extrabold">
          Período da {PERIODO_LABEL[periodo].toLowerCase()} já concluído hoje.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          As duas aferições foram registradas e a média já foi calculada.
        </p>
        <Button className="mt-6 w-full rounded-2xl" onClick={() => navigate({ to: "/historico" })}>
          Ver histórico
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setPeriodo(null)}>
        <ArrowLeft className="h-4 w-4" /> Trocar período
      </Button>

      <form
        onSubmit={form.handleSubmit((v) => salvar.mutate(v))}
        className="card-surface animate-rise space-y-5 p-6"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold">
              {ordem === 1 ? "Primeira" : "Segunda"} aferição
            </h1>
            <p className="text-sm text-muted-foreground">
              {PERIODO_LABEL[periodo]} · {hoje.split("-").reverse().join("/")}
            </p>
          </div>
          {periodo === "manha" ? (
            <Sun className="h-7 w-7 shrink-0 text-morning" />
          ) : (
            <Moon className="h-7 w-7 shrink-0 text-night" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="sistolica">Sistólica (mmHg)</Label>
            <Input
              id="sistolica"
              type="number"
              inputMode="numeric"
              placeholder="120"
              className="h-14 text-center text-2xl font-bold"
              {...form.register("sistolica")}
            />
            <p className="text-xs text-destructive">
              {form.formState.errors.sistolica?.message}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="diastolica">Diastólica (mmHg)</Label>
            <Input
              id="diastolica"
              type="number"
              inputMode="numeric"
              placeholder="80"
              className="h-14 text-center text-2xl font-bold"
              {...form.register("diastolica")}
            />
            <p className="text-xs text-destructive">
              {form.formState.errors.diastolica?.message}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pulso">Pulso (bpm)</Label>
          <Input id="pulso" type="number" inputMode="numeric" placeholder="72" {...form.register("pulso")} />
        </div>

        <div className="space-y-2">
          <Label>Braço</Label>
          <RadioGroup
            value={form.watch("braco")}
            onValueChange={(v) => form.setValue("braco", v as "direito" | "esquerdo")}
            className="grid grid-cols-2 gap-3"
          >
            {(["esquerdo", "direito"] as const).map((b) => (
              <Label
                key={b}
                htmlFor={`braco-${b}`}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-3 capitalize transition-colors",
                  form.watch("braco") === b && "border-primary bg-primary-soft text-primary",
                )}
              >
                <RadioGroupItem id={`braco-${b}`} value={b} />
                {b}
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="observacao">Observações</Label>
          <Textarea
            id="observacao"
            rows={3}
            maxLength={500}
            placeholder="Ex.: dor de cabeça leve, tomei o medicamento às 7h..."
            {...form.register("observacao")}
          />
        </div>

        <Button type="submit" size="lg" className="w-full rounded-2xl" disabled={salvar.isPending}>
          {salvar.isPending
            ? "Salvando..."
            : ordem === 1
              ? "Salvar primeira aferição"
              : "Salvar segunda aferição"}
        </Button>
      </form>
    </div>
  );
}
