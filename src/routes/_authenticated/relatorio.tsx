import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  HeartPulse,
  Printer,
  ShieldCheck,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { useProfile, useSession } from "@/hooks/use-session";
import { useMedicoes, useProtocoloAtivo } from "@/hooks/use-medicoes";
import {
  agruparPorDia,
  formatarData,
  media,
  PERIODO_LABEL,
} from "@/lib/meumapa";

export const Route = createFileRoute("/_authenticated/relatorio")({
  head: () => ({
    meta: [
      {
        title: "Relatório médico — MeuMapa",
      },
      {
        name: "description",
        content:
          "Relatório residencial de pressão arterial com médias, gráficos, observações e aferições detalhadas.",
      },
      {
        property: "og:title",
        content: "Relatório médico — MeuMapa",
      },
      {
        property: "og:description",
        content:
          "Relatório residencial de pressão arterial pronto para impressão ou PDF.",
      },
    ],
  }),
  component: Relatorio,
});

function calcularIdade(dataNascimento?: string | null) {
  if (!dataNascimento) return null;

  const nascimento = new Date(`${dataNascimento}T12:00:00`);
  const hoje = new Date();

  let idade = hoje.getFullYear() - nascimento.getFullYear();

  const diferencaMes =
    hoje.getMonth() - nascimento.getMonth();

  if (
    diferencaMes < 0 ||
    (diferencaMes === 0 &&
      hoje.getDate() < nascimento.getDate())
  ) {
    idade -= 1;
  }

  return idade;
}

function formatarPressao(
  sistolica: number | null,
  diastolica: number | null
) {
  if (sistolica === null || diastolica === null) {
    return "—";
  }

  return `${sistolica} × ${diastolica}`;
}

function minutosEntre(
  data: string,
  horaInicial: string,
  horaFinal: string
) {
  const inicio = new Date(`${data}T${horaInicial}`);
  const fim = new Date(`${data}T${horaFinal}`);

  return Math.round(
    (fim.getTime() - inicio.getTime()) / 60000
  );
}

function Relatorio() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { data: medicoes = [] } = useMedicoes(user?.id);
  const { data: protocolo } = useProtocoloAtivo(user?.id);

  const medicoesOrdenadas = useMemo(
    () =>
      [...medicoes].sort((a, b) => {
        const dataComparada = a.data.localeCompare(b.data);

        if (dataComparada !== 0) {
          return dataComparada;
        }

        return a.hora.localeCompare(b.hora);
      }),
    [medicoes]
  );

  const dias = useMemo(
    () =>
      agruparPorDia(medicoes)
        .slice()
        .sort((a, b) =>
          a.data.localeCompare(b.data)
        ),
    [medicoes]
  );

  const mediaS = media(
    medicoes.map((m) => m.sistolica)
  );

  const mediaD = media(
    medicoes.map((m) => m.diastolica)
  );

  const mediaP = media(
    medicoes
      .map((m) => m.pulso)
      .filter(
        (pulso): pulso is number =>
          typeof pulso === "number"
      )
  );

  const maiorMedicao =
    medicoesOrdenadas.length > 0
      ? medicoesOrdenadas.reduce((maior, atual) =>
          atual.sistolica > maior.sistolica
            ? atual
            : maior
        )
      : null;

  const menorMedicao =
    medicoesOrdenadas.length > 0
      ? medicoesOrdenadas.reduce((menor, atual) =>
          atual.sistolica < menor.sistolica
            ? atual
            : menor
        )
      : null;

  const diasCompletos = dias.filter(
    (dia) =>
      dia.manha.length >= 2 &&
      dia.noite.length >= 2
  ).length;

  const duracaoProtocolo =
    protocolo?.duracao_dias ?? 7;

  const adesao =
    duracaoProtocolo > 0
      ? Math.min(
          100,
          Math.round(
            (diasCompletos / duracaoProtocolo) * 100
          )
        )
      : 0;

  const medicoesEsperadas =
    duracaoProtocolo * 4;

  const percentualRegistros =
    medicoesEsperadas > 0
      ? Math.min(
          100,
          Math.round(
            (medicoes.length /
              medicoesEsperadas) *
              100
          )
        )
      : 0;

  const gruposPorPeriodo = new Map<
    string,
    typeof medicoes
  >();

  for (const medicao of medicoesOrdenadas) {
    const chave =
      `${medicao.data}-${medicao.periodo}`;

    const grupo =
      gruposPorPeriodo.get(chave) ?? [];

    grupo.push(medicao);
    gruposPorPeriodo.set(chave, grupo);
  }

  const intervalos = Array.from(
    gruposPorPeriodo.values()
  )
    .filter((grupo) => grupo.length >= 2)
    .map((grupo) => {
      const ordenado = [...grupo].sort(
        (a, b) => a.ordem - b.ordem
      );

      return minutosEntre(
        ordenado[0].data,
        ordenado[0].hora,
        ordenado[1].hora
      );
    })
    .filter((valor) => valor >= 0);

  const intervalosRegistrados =
    intervalos.filter(
      (valor) => valor >= 1 && valor <= 15
    ).length;

  const percentualIntervalos =
    intervalos.length > 0
      ? Math.round(
          (intervalosRegistrados /
            intervalos.length) *
            100
        )
      : 0;

  const completude = Math.round(
    adesao * 0.6 +
      percentualRegistros * 0.25 +
      percentualIntervalos * 0.15
  );

  const afericoesElevadas = medicoes.filter(
    (m) =>
      m.sistolica >= 135 ||
      m.diastolica >= 85
  );

  const afericoesBaixas = medicoes.filter(
    (m) =>
      m.sistolica < 90 ||
      m.diastolica < 60
  );

  const classificacao =
    mediaS !== null &&
    mediaD !== null &&
    mediaS < 90 &&
    mediaD < 60
      ? {
          titulo:
            "Média abaixo da faixa residencial habitual",
          descricao:
            "Foram observados valores médios inferiores a 90 × 60 mmHg. A interpretação deve ser realizada pelo médico responsável.",
          classe:
            "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200",
          Icone: TrendingDown,
        }
      : mediaS !== null &&
          mediaD !== null &&
          mediaS < 135 &&
          mediaD < 85
        ? {
            titulo:
              "Média residencial dentro da referência",
            descricao:
              "A média do período está abaixo de 135 × 85 mmHg. Esta classificação é informativa e não constitui diagnóstico.",
            classe:
              "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
            Icone: CheckCircle2,
          }
        : {
            titulo:
              "Média residencial acima da referência",
            descricao:
              "A média do período atingiu ou ultrapassou 135 × 85 mmHg. Os resultados devem ser avaliados pelo médico responsável.",
            classe:
              "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
            Icone: AlertCircle,
          };

  const IconeClassificacao =
    classificacao.Icone;

  const dadosGrafico = dias.flatMap((dia) => {
    const itens = [];

    if (dia.mediaManha.s && dia.mediaManha.d) {
      itens.push({
        nome: `${formatarData(dia.data).slice(0, 5)} M`,
        sistolica: dia.mediaManha.s,
        diastolica: dia.mediaManha.d,
      });
    }

    if (dia.mediaNoite.s && dia.mediaNoite.d) {
      itens.push({
        nome: `${formatarData(dia.data).slice(0, 5)} N`,
        sistolica: dia.mediaNoite.s,
        diastolica: dia.mediaNoite.d,
      });
    }

    return itens;
  });

  const observacoes = medicoesOrdenadas.filter(
    (m) => m.observacao?.trim()
  );

  const idade = calcularIdade(
    profile?.data_nascimento
  );

  const periodoTexto =
    dias.length > 0
      ? `${formatarData(dias[0].data)} a ${formatarData(
          dias[dias.length - 1].data
        )}`
      : "—";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 no-print">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight">
            Relatório
          </h1>

          <p className="text-sm text-muted-foreground">
            Visualize, imprima ou salve como PDF.
          </p>
        </div>

        <Button
          className="shrink-0 rounded-2xl"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          Imprimir / PDF
        </Button>
      </div>

      <article className="space-y-6 print:space-y-4">
        <header className="card-surface overflow-hidden p-0 print:shadow-none">
          <div className="border-b border-border bg-primary/5 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <HeartPulse className="h-6 w-6" />
              </div>

              <div>
                <div className="text-xl font-extrabold">
                  MeuMapa
                </div>

                <p className="text-sm text-muted-foreground">
                  Relatório residencial de pressão arterial
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Stethoscope className="h-4 w-4" />
                  Relatório para acompanhamento médico
                </div>

                <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
                  {profile?.nome || "Paciente"}
                </h2>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  {idade !== null && (
                    <span className="flex items-center gap-1.5">
                      <UserRound className="h-4 w-4" />
                      {idade} anos
                    </span>
                  )}

                  {profile?.sexo && (
                    <span>
                      Sexo: {profile.sexo}
                    </span>
                  )}

                  {profile?.data_nascimento && (
                    <span>
                      Nascimento:{" "}
                      {formatarData(
                        profile.data_nascimento
                      )}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Período: {periodoTexto}
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Protocolo de{" "}
                  {duracaoProtocolo} dias
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PainelCard
            titulo="Média geral"
            valor={formatarPressao(
              mediaS,
              mediaD
            )}
            detalhe="mmHg"
            icone={
              <HeartPulse className="h-5 w-5" />
            }
          />

          <PainelCard
            titulo="Pulso médio"
            valor={
              mediaP === null
                ? "—"
                : String(mediaP)
            }
            detalhe="bpm"
            icone={
              <Activity className="h-5 w-5" />
            }
          />

          <PainelCard
            titulo="Maior aferição"
            valor={
              maiorMedicao
                ? `${maiorMedicao.sistolica} × ${maiorMedicao.diastolica}`
                : "—"
            }
            detalhe={
              maiorMedicao
                ? `${formatarData(
                    maiorMedicao.data
                  )} às ${maiorMedicao.hora.slice(
                    0,
                    5
                  )}`
                : undefined
            }
            icone={
              <TrendingUp className="h-5 w-5" />
            }
          />

          <PainelCard
            titulo="Menor aferição"
            valor={
              menorMedicao
                ? `${menorMedicao.sistolica} × ${menorMedicao.diastolica}`
                : "—"
            }
            detalhe={
              menorMedicao
                ? `${formatarData(
                    menorMedicao.data
                  )} às ${menorMedicao.hora.slice(
                    0,
                    5
                  )}`
                : undefined
            }
            icone={
              <TrendingDown className="h-5 w-5" />
            }
          />
        </section>

        <section className="card-surface p-5 print:break-inside-avoid print:shadow-none">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold">
                    Adesão ao protocolo
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {diasCompletos} de{" "}
                    {duracaoProtocolo} dias completos
                  </p>
                </div>

                <strong className="text-2xl text-primary">
                  {adesao}%
                </strong>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${adesao}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Foram realizadas {medicoes.length} de{" "}
                {medicoesEsperadas} aferições previstas.
              </p>
            </div>

            <div className="border-t pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold">
                    Completude do protocolo
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Dias completos, registros e intervalos
                  </p>
                </div>

                <strong className="text-2xl text-primary">
                  {completude}%
                </strong>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${completude}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                {intervalosRegistrados} de{" "}
                {intervalos.length} pares tiveram
                intervalo entre 1 e 15 minutos.
              </p>
            </div>
          </div>
        </section>

        <section
          className={`rounded-2xl border p-5 ${classificacao.classe}`}
        >
          <div className="flex items-start gap-3">
            <IconeClassificacao className="mt-0.5 h-6 w-6 shrink-0" />

            <div>
              <h3 className="font-bold">
                {classificacao.titulo}
              </h3>

              <p className="mt-1 text-sm opacity-90">
                {classificacao.descricao}
              </p>
            </div>
          </div>
        </section>

        <section className="card-surface p-5 print:shadow-none">
          <h3 className="text-lg font-bold">
            Resumo do período
          </h3>

          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 text-sm leading-7">
            <p>
              Foram registradas{" "}
              <strong>{medicoes.length} aferições</strong>{" "}
              distribuídas em{" "}
              <strong>{dias.length} dias</strong>.
            </p>

            <p>
              A média residencial foi de{" "}
              <strong>
                {formatarPressao(
                  mediaS,
                  mediaD
                )}{" "}
                mmHg
              </strong>
              , com pulso médio de{" "}
              <strong>
                {mediaP ?? "—"} bpm
              </strong>
              .
            </p>

            <p>
              A adesão ao protocolo foi de{" "}
              <strong>{adesao}%</strong>.
            </p>

            <p>
              Foram identificadas{" "}
              <strong>
                {afericoesElevadas.length}
              </strong>{" "}
              aferições com pressão sistólica ≥ 135 mmHg
              ou diastólica ≥ 85 mmHg.
            </p>

            <p>
              Foram identificadas{" "}
              <strong>
                {afericoesBaixas.length}
              </strong>{" "}
              aferições inferiores a 90 × 60 mmHg.
            </p>

            <p className="mt-3 text-xs text-muted-foreground">
              Este resumo é informativo e não substitui
              avaliação médica.
            </p>
          </div>
        </section>

        {dadosGrafico.length > 0 && (
          <section className="card-surface p-5 print:break-inside-avoid print:shadow-none">
            <h3 className="text-lg font-bold">
              Evolução da pressão arterial
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Médias da manhã e da noite durante
              o período monitorado.
            </p>

            <div className="mt-5 h-[340px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={dadosGrafico}
                  margin={{
                    top: 15,
                    right: 20,
                    bottom: 35,
                    left: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="nome"
                    tick={{ fontSize: 11 }}
                    angle={-20}
                    textAnchor="end"
                    height={75}
                  />

                  <YAxis />

                  <Tooltip />
                  <Legend />

                  <ReferenceLine
                    y={135}
                    stroke="currentColor"
                    strokeDasharray="4 4"
                  />

                  <ReferenceLine
                    y={85}
                    stroke="currentColor"
                    strokeDasharray="4 4"
                  />

                  <Line
                    type="monotone"
                    dataKey="sistolica"
                    name="Sistólica"
                    stroke="currentColor"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="diastolica"
                    name="Diastólica"
                    stroke="currentColor"
                    strokeDasharray="7 4"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {observacoes.length > 0 && (
          <section className="card-surface p-5 print:shadow-none">
            <h3 className="font-bold">
              Observações do paciente
            </h3>

            <div className="mt-4 space-y-3">
              {observacoes.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-border bg-muted/30 p-4"
                >
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {formatarData(m.data)}
                    </span>

                    <span>
                      {m.hora.slice(0, 5)}
                    </span>

                    <span>
                      {PERIODO_LABEL[m.periodo]}
                    </span>

                    <span>
                      {m.ordem}ª aferição
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-relaxed">
                    {m.observacao}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="card-surface p-5 print:shadow-none">
          <h3 className="font-bold">
            Todas as aferições
          </h3>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
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
                {medicoesOrdenadas.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-border/60"
                  >
                    <td className="py-2">
                      {formatarData(m.data)}
                    </td>

                    <td>
                      {PERIODO_LABEL[m.periodo]}
                    </td>

                    <td>
                      {m.hora.slice(0, 5)}
                    </td>

                    <td>{m.ordem}ª</td>

                    <td className="font-semibold">
                      {m.sistolica}×{m.diastolica}
                    </td>

                    <td>
                      {m.pulso ?? "—"}
                    </td>

                    <td className="capitalize">
                      {m.braco}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="card-surface p-5 text-sm print:break-inside-avoid print:shadow-none">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />

            <div>
              <p className="font-semibold">
                Documento eletrônico MeuMapa
              </p>

              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Relatório gerado automaticamente com
                informações registradas pelo paciente.
                Os dados destinam-se ao acompanhamento
                clínico e não substituem avaliação,
                diagnóstico ou conduta médica.
              </p>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}

function PainelCard({
  titulo,
  valor,
  detalhe,
  icone,
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  icone: React.ReactNode;
}) {
  return (
    <div className="card-surface p-5 print:break-inside-avoid print:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {titulo}
        </span>

        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          {icone}
        </span>
      </div>

      <div className="mt-4 text-2xl font-extrabold">
        {valor}
      </div>

      {detalhe && (
        <div className="mt-1 text-xs text-muted-foreground">
          {detalhe}
        </div>
      )}
    </div>
  );
}
