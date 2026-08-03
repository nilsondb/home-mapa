import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Stethoscope, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { agruparPorDia, formatarData, media } from "@/lib/meumapa";
import type { Medicao } from "@/lib/meumapa";

export const Route = createFileRoute("/_authenticated/pacientes")({
  head: () => ({
    meta: [
      { title: "Meus pacientes — MeuMapa" },
      {
        name: "description",
        content: "Acompanhe os mapas residenciais de pressão arterial dos seus pacientes.",
      },
      { property: "og:title", content: "Meus pacientes — MeuMapa" },
      {
        property: "og:description",
        content: "Painel do médico com médias e registros dos pacientes vinculados.",
      },
    ],
  }),
  component: Pacientes,
});

type PacienteResumo = {
  id: string;
  nome: string;
  medicoes: Medicao[];
};

function Pacientes() {
  const { user } = useSession();

  const { data: pacientes = [], isLoading } = useQuery({
    queryKey: ["pacientes", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<PacienteResumo[]> => {
      const { data: vinculos, error } = await supabase
        .from("medico_paciente")
        .select("paciente_id")
        .eq("medico_id", user!.id);
      if (error) throw error;
      const ids = (vinculos ?? []).map((v: { paciente_id: string }) => v.paciente_id);
      if (!ids.length) return [];

      const [{ data: perfis }, { data: medicoes }] = await Promise.all([
        supabase.from("profiles").select("id, nome").in("id", ids),
        supabase.from("medicoes").select("*").in("user_id", ids).order("data", { ascending: false }),
      ]);

      return (perfis ?? []).map((p: { id: string; nome: string }) => ({
        id: p.id,
        nome: p.nome,
        medicoes: ((medicoes ?? []) as Medicao[]).filter((m) => m.user_id === p.id),
      }));
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Pacientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Somente leitura dos mapas residenciais dos pacientes vinculados a você.
        </p>
      </div>

      {isLoading ? (
        <p className="card-surface p-6 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : pacientes.length === 0 ? (
        <div className="card-surface p-8 text-center">
          <Stethoscope className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3 font-semibold">Nenhum paciente vinculado ainda.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            O vínculo é criado pelo paciente. Assim que ele compartilhar o mapa, os registros
            aparecem aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pacientes.map((p) => {
            const s = media(p.medicoes.map((m) => m.sistolica));
            const d = media(p.medicoes.map((m) => m.diastolica));
            const dias = agruparPorDia(p.medicoes);
            const ultimo = dias[0];
            return (
              <article key={p.id} className="card-surface animate-rise p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft">
                    <UserRound className="h-5 w-5 text-primary" />
                  </span>
                  <h2 className="truncate text-lg font-bold">{p.nome}</h2>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-secondary/60 p-2">
                    <dt className="text-xs text-muted-foreground">Média</dt>
                    <dd className="font-extrabold">
                      {s && d ? `${Math.round(s)}×${Math.round(d)}` : "—"}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-secondary/60 p-2">
                    <dt className="text-xs text-muted-foreground">Dias</dt>
                    <dd className="font-extrabold">{dias.length}</dd>
                  </div>
                  <div className="rounded-xl bg-secondary/60 p-2">
                    <dt className="text-xs text-muted-foreground">Último</dt>
                    <dd className="font-extrabold">
                      {ultimo ? formatarData(ultimo.data).slice(0, 5) : "—"}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
