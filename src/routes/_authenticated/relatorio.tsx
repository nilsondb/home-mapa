import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Printer } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useProfile, useSession } from "@/hooks/use-session";
import { useMedicoes, useProtocoloAtivo } from "@/hooks/use-medicoes";
import {
  agruparPorDia,
  classificarMediaResidencial,
  formatarData,
  media,
  PERIODO_LABEL,
} from "@/lib/meumapa";

export const Route = createFileRoute("/_authenticated/relatorio")({
  head: () => ({
    meta: [
      { title: "Relatório em PDF — MeuMapa" },
      {
        name: "description",
        content:
          "Gere um relatório limpo com nome, período, todas as aferições, médias, gráficos e observações.",
      },
      { property: "og:title", content: "Relatório em PDF — MeuMapa" },
      {
        property: "og:description",
        content: "Relatório pronto para levar à consulta médica.",
      },
    ],
  }),
  component: Relatorio,
});

function Relatorio() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { data: medicoes = [] } = useMedicoes(user?.id);
  const { data: protocolo } = useProtocoloAtivo(user?.id);

  const dias = useMemo(
    () => agruparPorDia(medicoes).slice().sort((a, b) => (a.data < b.data ? -1 : 1)),
    [medicoes],
  );
  const mediaS = media(medicoes.map((m) => m.sistolica));
  const mediaD = media(medicoes.map((m) => m.diastolica));
  const mediaP = media(medicoes.map((m) => m.pulso));
  const faixa = mediaS && mediaD ? classificarMediaResidencial(mediaS, mediaD) : null;
  const periodoTexto =
    dias.length > 0
      ? `${formatarData(dias[0].data)} a ${formatarData(dias[dias.length - 1].data)}`
      : "—";

  const dadosGrafico = dias.map((d) => ({
    rotulo: formatarData(d.data).slice(0, 5),
    sistolica: media([...d.manha, ...d.noite].map((m) => m.sistolica)) ?? 0,
    diastolica: media([...d.manha, ...d.noite].map((m) => m.diastolica)) ?? 0,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 no-print">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight">Relatório</h1>
          <p className="text-sm text-muted-foreground">
            Gere o PDF e leve para a consulta.
          </p>
        </div>
        <Button className="shrink-0 rounded-2xl" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Exportar PDF
        </Button>
      </div>

      <article className="card-surface space-y-6 p-6">
        <header className="border-b border-border pb-4">
          <h2 className="text-xl font-extrabold">Mapa residencial de pressão arterial</h2>
          <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            <div>
              <dt className="inline text-muted-foreground">Nome: </dt>
              <dd className="inline font-medium">{profile?.nome || "—"}</dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground">Período: </dt>
              <dd className="inline font-medium">{periodoTexto}</dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground">Protocolo: </dt>
              <dd className="inline font-medium">
                {protocolo?.duracao_dias ?? 7} dias (mínimo {protocolo?.minimo_dias ?? 5})
              </dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground">Emitido em: </dt>
              <dd className="inline font-medium">
                {new Date().toLocaleDateString("pt-BR")}
              </dd>
            </div>
          </dl>
        </header>

        <section>
          <h3 className="font-bold">Médias do período</h3>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-secondary/60 p-3">
              <p className="text-xs text-muted-foreground">Sistólica</p>
              <p className="text-xl font-extrabold">{mediaS ?? "—"}</p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <p className="text-xs text-muted-foreground">Diastólica</p>
              <p className="text-xl font-extrabold">{mediaD ?? "—"}</p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <p className="text-xs text-muted-foreground">Pulso</p>
              <p className="text-xl font-extrabold">{mediaP ?? "—"}</p>
            </div>
          </div>
          {faixa ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Referência residencial: 135 × 85 mmHg — {faixa.rotulo}. Interpretação apenas
              informativa; a avaliação é do médico.
            </p>
          ) : null}
        </section>

        {dadosGrafico.length > 0 ? (
          <section>
            <h3 className="font-bold">Evolução diária</h3>
            <div className="mt-2 h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGrafico} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="rotulo" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Bar dataKey="sistolica" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="diastolica" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        ) : null}

        <section>
          <h3 className="font-bold">Todas as aferições</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="py-2">Data</th>
                  <th>Período</th>
                  <th>Hora</th>
                  <th>Aferição</th>
                  <th>PA</th>
                  <th>Pulso</th>
                  <th>Braço</th>
                </tr>
              </thead>
              <tbody>
                {medicoes
                  .slice()
                  .sort((a, b) => (a.data === b.data ? a.hora.localeCompare(b.hora) : a.data < b.data ? -1 : 1))
                  .map((m) => (
                    <tr key={m.id} className="border-b border-border/60">
                      <td className="py-2">{formatarData(m.data)}</td>
                      <td>{PERIODO_LABEL[m.periodo]}</td>
                      <td>{m.hora.slice(0, 5)}</td>
                      <td>{m.ordem}ª</td>
                      <td className="font-semibold">
                        {m.sistolica}×{m.diastolica}
                      </td>
                      <td>{m.pulso ?? "—"}</td>
                      <td className="capitalize">{m.braco}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className="font-bold">Médias por dia</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {dias.map((d) => (
              <li key={d.data}>
                <span className="font-medium">{formatarData(d.data)}</span> — Manhã:{" "}
                {d.mediaManha.s ? `${d.mediaManha.s}×${d.mediaManha.d}` : "—"} · Noite:{" "}
                {d.mediaNoite.s ? `${d.mediaNoite.s}×${d.mediaNoite.d}` : "—"}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="font-bold">Observações</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {medicoes.filter((m) => m.observacao).length === 0 ? (
              <li className="text-muted-foreground">Sem observações registradas.</li>
            ) : (
              medicoes
                .filter((m) => m.observacao)
                .map((m) => (
                  <li key={m.id}>
                    {formatarData(m.data)} ({PERIODO_LABEL[m.periodo]}): {m.observacao}
                  </li>
                ))
            )}
          </ul>
        </section>
      </article>
    </div>
  );
}
