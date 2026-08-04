import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/shared/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mapa residencial compartilhado — MeuMapa" },
      {
        name: "description",
        content:
          "Visualização somente leitura do mapa residencial de pressão arterial compartilhado pelo paciente.",
      },
      { property: "og:title", content: "Mapa residencial compartilhado — MeuMapa" },
      {
        property: "og:description",
        content: "Relatório somente leitura das medições residenciais de pressão arterial.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SharedReport,
});

type Medicao = {
  id: string;
  data: string;
  hora: string;
  periodo: string;
  ordem: number;
  sistolica: number;
  diastolica: number;
  pulso: number | null;
};
type Media = {
  data: string;
  periodo: string;
  media_sistolica: number;
  media_diastolica: number;
  media_pulso: number | null;
  qtd_afericoes: number;
};
type Relatorio = {
  paciente: { nome: string; data_nascimento: string | null; sexo: string } | null;
  protocolo: { data_inicio: string; duracao_dias: number } | null;
  medicoes: Medicao[];
  medias: Media[];
  expires_at: string;
};

function br(d: string) {
  return d.split("-").reverse().join("/");
}

function SharedReport() {
  const { token } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["shared-report", token],
    queryFn: async (): Promise<Relatorio | null> => {
      const { data, error } = await supabase.rpc("get_shared_report", { _token: token });
      if (error) throw error;
      return (data as unknown as Relatorio) ?? null;
    },
  });

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted-foreground">
        Carregando relatório…
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold">Link indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este link expirou, foi revogado ou não existe.
          </p>
        </div>
      </main>
    );
  }

  const medias = [...data.medias].sort((a, b) => a.data.localeCompare(b.data));

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="card-surface p-5">
        <div className="flex items-center gap-2 text-primary">
          <Activity className="h-5 w-5" />
          <span className="font-bold">MeuMapa</span>
          <span className="ml-auto rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
            Somente leitura
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-bold">{data.paciente?.nome ?? "Paciente"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.protocolo
            ? `Protocolo iniciado em ${br(data.protocolo.data_inicio)} · ${data.protocolo.duracao_dias} dias`
            : "Sem protocolo ativo"}
          {" · "}Link válido até {new Date(data.expires_at).toLocaleDateString("pt-BR")}
        </p>
      </header>

      <section className="card-surface p-5">
        <h2 className="font-bold">Médias por período</h2>
        {medias.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma medição registrada.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2">Data</th>
                  <th>Período</th>
                  <th>Média PA</th>
                  <th>Pulso</th>
                  <th>Aferições</th>
                </tr>
              </thead>
              <tbody>
                {medias.map((m) => (
                  <tr key={`${m.data}-${m.periodo}`} className="border-t border-border">
                    <td className="py-2">{br(m.data)}</td>
                    <td className="capitalize">{m.periodo}</td>
                    <td className="font-semibold">
                      {Math.round(m.media_sistolica)}×{Math.round(m.media_diastolica)}
                    </td>
                    <td>{m.media_pulso ? Math.round(m.media_pulso) : "—"}</td>
                    <td>{m.qtd_afericoes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card-surface p-5">
        <h2 className="font-bold">Aferições</h2>
        {data.medicoes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma aferição registrada.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2">Data</th>
                  <th>Hora</th>
                  <th>Período</th>
                  <th>#</th>
                  <th>PA</th>
                  <th>Pulso</th>
                </tr>
              </thead>
              <tbody>
                {data.medicoes.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="py-2">{br(m.data)}</td>
                    <td>{m.hora.slice(0, 5)}</td>
                    <td className="capitalize">{m.periodo}</td>
                    <td>{m.ordem}</td>
                    <td className="font-semibold">
                      {m.sistolica}×{m.diastolica}
                    </td>
                    <td>{m.pulso ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
