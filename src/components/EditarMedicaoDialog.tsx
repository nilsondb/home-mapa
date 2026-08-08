import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { PERIODO_LABEL, type Medicao, type Periodo } from "@/lib/meumapa";
import { cn } from "@/lib/utils";

const schema = z.object({
  data: z.string().min(10, "Informe a data"),
  hora: z.string().min(4, "Informe o horário"),
  periodo: z.enum(["manha", "noite"]),
  sistolica: z.coerce.number().int().min(50, "Mínimo 50").max(300, "Máximo 300"),
  diastolica: z.coerce.number().int().min(30, "Mínimo 30").max(200, "Máximo 200"),
  pulso: z.coerce.number().int().min(20).max(250).optional().or(z.literal("" as never)),
  braco: z.enum(["direito", "esquerdo"]),
  observacao: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});
type FormValues = z.input<typeof schema>;

export function EditarMedicaoDialog({ medicao }: { medicao: Medicao }) {
  const [aberto, setAberto] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      data: medicao.data,
      hora: medicao.hora.slice(0, 5),
      periodo: medicao.periodo,
      sistolica: medicao.sistolica,
      diastolica: medicao.diastolica,
      pulso: (medicao.pulso ?? "") as never,
      braco: medicao.braco,
      observacao: medicao.observacao ?? "",
    },
  });

  useEffect(() => {
    if (aberto) {
      form.reset({
        data: medicao.data,
        hora: medicao.hora.slice(0, 5),
        periodo: medicao.periodo,
        sistolica: medicao.sistolica,
        diastolica: medicao.diastolica,
        pulso: (medicao.pulso ?? "") as never,
        braco: medicao.braco,
        observacao: medicao.observacao ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, medicao.id]);

  async function atualizar() {
    await queryClient.invalidateQueries({ queryKey: ["medicoes"] });
    await queryClient.invalidateQueries({ queryKey: ["protocolo"] });
    await queryClient.invalidateQueries({ queryKey: ["shared-report"] });
  }

  /** Renumera a ordem das aferições de um período (1..n) por horário. */
  async function reordenar(data: string, periodo: Periodo) {
    const { data: itens, error } = await supabase
      .from("medicoes")
      .select("id, hora, created_at")
      .eq("user_id", medicao.user_id)
      .eq("data", data)
      .eq("periodo", periodo)
      .order("hora", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    let i = 1;
    for (const item of itens ?? []) {
      const { error: e } = await supabase
        .from("medicoes")
        .update({ ordem: i })
        .eq("id", item.id);
      if (e) throw e;
      i += 1;
    }
  }

  const salvar = useMutation({
    mutationFn: async (values: FormValues) => {
      const p = schema.parse(values);
      const { error } = await supabase
        .from("medicoes")
        .update({
          data: p.data,
          hora: p.hora.length === 5 ? `${p.hora}:00` : p.hora,
          periodo: p.periodo,
          sistolica: p.sistolica,
          diastolica: p.diastolica,
          pulso: typeof p.pulso === "number" ? p.pulso : null,
          braco: p.braco,
          observacao: p.observacao || null,
        })
        .eq("id", medicao.id);
      if (error) throw error;

      // Reorganiza a ordem no destino e, se mudou de grupo, também na origem.
      await reordenar(p.data, p.periodo);
      if (p.data !== medicao.data || p.periodo !== medicao.periodo) {
        await reordenar(medicao.data, medicao.periodo);
      }
    },
    onSuccess: async () => {
      await atualizar();
      setAberto(false);
      toast.success("Aferição atualizada com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível atualizar."),
  });

  const excluir = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("medicoes").delete().eq("id", medicao.id);
      if (error) throw error;
      await reordenar(medicao.data, medicao.periodo);
    },
    onSuccess: async () => {
      await atualizar();
      setAberto(false);
      toast.success("Aferição excluída.");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível excluir."),
  });

  const periodo = form.watch("periodo");

  return (
    <>
      <button
        type="button"
        aria-label="Editar aferição"
        onClick={() => setAberto(true)}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar aferição</DialogTitle>
            <DialogDescription>
              Corrija turno, data, horário ou valores sem precisar excluir o registro.
            </DialogDescription>
          </DialogHeader>

          <form
            id="form-editar-medicao"
            onSubmit={form.handleSubmit((v) => salvar.mutate(v))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Período</Label>
              <div className="grid grid-cols-2 gap-3">
                {(["manha", "noite"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => form.setValue("periodo", p)}
                    className={cn(
                      "rounded-xl border border-border px-4 py-3 text-sm font-semibold transition-colors",
                      periodo === p && "border-primary bg-primary-soft text-primary",
                    )}
                  >
                    {PERIODO_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-data">Data</Label>
                <Input id="edit-data" type="date" {...form.register("data")} />
                <p className="text-xs text-destructive">{form.formState.errors.data?.message}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-hora">Horário</Label>
                <Input id="edit-hora" type="time" {...form.register("hora")} />
                <p className="text-xs text-destructive">{form.formState.errors.hora?.message}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-sistolica">Sistólica (mmHg)</Label>
                <Input
                  id="edit-sistolica"
                  type="number"
                  inputMode="numeric"
                  className="h-12 text-center text-xl font-bold"
                  {...form.register("sistolica")}
                />
                <p className="text-xs text-destructive">
                  {form.formState.errors.sistolica?.message}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-diastolica">Diastólica (mmHg)</Label>
                <Input
                  id="edit-diastolica"
                  type="number"
                  inputMode="numeric"
                  className="h-12 text-center text-xl font-bold"
                  {...form.register("diastolica")}
                />
                <p className="text-xs text-destructive">
                  {form.formState.errors.diastolica?.message}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-pulso">Pulso (bpm)</Label>
              <Input
                id="edit-pulso"
                type="number"
                inputMode="numeric"
                {...form.register("pulso")}
              />
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
                    htmlFor={`edit-braco-${b}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-3 capitalize transition-colors",
                      form.watch("braco") === b && "border-primary bg-primary-soft text-primary",
                    )}
                  >
                    <RadioGroupItem id={`edit-braco-${b}`} value={b} />
                    {b}
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-observacao">Observações</Label>
              <Textarea
                id="edit-observacao"
                rows={3}
                maxLength={500}
                {...form.register("observacao")}
              />
            </div>
          </form>

          <DialogFooter className="gap-2 sm:justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost" className="text-destructive">
                  <Trash2 className="h-4 w-4" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir esta aferição?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A aferição será removida e as médias do período serão recalculadas. Esta ação
                    não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => excluir.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              type="submit"
              form="form-editar-medicao"
              disabled={salvar.isPending || excluir.isPending}
            >
              {salvar.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
