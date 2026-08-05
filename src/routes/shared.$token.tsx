import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  HeartPulse,
  Lock,
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

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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
  observacao: string | null;
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

function calcularMedia(valores: number[]) {
  if (valores.length === 0) return null;

  return Math.round(
    valores.reduce((total, valor) => total + valor, 0) /
      valores.length
  );
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

function calcularIdade(dataNascimento?: string | null) {
  if (!dataNascimento) return null;

  const nascimento = new Date(`${dataNascimento}T12:00:00`);
  const hoje = new Date();

  let idade =
    hoje.getFullYear() - nascimento.getFullYear();

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

function formatarDataHora(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

function minutosEntre(
  data: string,
  horaInicial: string,
  horaFinal: string
) {
  const inicio = new Date(`${data}T${horaInicial}`);
  const fim = new Date(`${data}T${horaFinal}`);

  const diferenca =
    (fim.getTime() - inicio.getTime()) / 60000;

  return Math.round(diferenca);
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

  const observacoes = data.medicoes
    .filter((medicao) => medicao.observacao?.trim())
    .sort((a, b) => {
      const dataComparada = a.data.localeCompare(b.data);

      if (dataComparada !== 0) {
        return dataComparada;
      }

      return a.hora.localeCompare(b.hora);
    });

  const mediaGeralSistolica = calcularMedia(
    data.medicoes.map((medicao) => medicao.sistolica)
  );

  const mediaGeralDiastolica = calcularMedia(
    data.medicoes.map((medicao) => medicao.diastolica)
  );

  const pulsosValidos = data.medicoes
    .map((medicao) => medicao.pulso)
    .filter(
      (pulso): pulso is number =>
        typeof pulso === "number"
    );

  const pulsoMedio = calcularMedia(pulsosValidos);

  const mediasManha = medias.filter(
    (item) => item.periodo.toLowerCase() === "manha"
  );

  const mediasNoite = medias.filter(
    (item) => item.periodo.toLowerCase() === "noite"
  );

  const mediaManhaSistolica = calcularMedia(
    mediasManha.map((item) => item.media_sistolica)
  );

  const mediaManhaDiastolica = calcularMedia(
    mediasManha.map((item) => item.media_diastolica)
  );

  const mediaNoiteSistolica = calcularMedia(
    mediasNoite.map((item) => item.media_sistolica)
  );

  const mediaNoiteDiastolica = calcularMedia(
    mediasNoite.map((item) => item.media_diastolica)
  );

  const maiorMedicao =
    data.medicoes.length > 0
      ? data.medicoes.reduce((maior, atual) =>
          atual.sistolica > maior.sistolica
            ? atual
            : maior
        )
      : null;

  const menorMedicao =
    data.medicoes.length > 0
      ? data.medicoes.reduce((menor, atual) =>
          atual.sistolica < menor.sistolica
            ? atual
            : menor
        )
      : null;

  const periodosPorDia = new Map<
    string,
    { manha: number; noite: number }
  >();

  for (const medicao of data.medicoes) {
    const registro =
      periodosPorDia.get(medicao.data) ?? {
        manha: 0,
        noite: 0,
      };

    if (medicao.periodo.toLowerCase() === "manha") {
      registro.manha += 1;
    }

    if (medicao.periodo.toLowerCase() === "noite") {
      registro.noite += 1;
    }

    periodosPorDia.set(medicao.data, registro);
  }

  const diasCompletos = Array.from(
    periodosPorDia.values()
  ).filter(
    (dia) => dia.manha >= 2 && dia.noite >= 2
  ).length;

  const duracaoProtocolo =
    data.protocolo?.duracao_dias ??
    periodosPorDia.size;

  const adesao =
    duracaoProtocolo > 0
      ? Math.min(
          100,
          Math.round(
            (diasCompletos / duracaoProtocolo) * 100
          )
        )
      : 0;

  const afericoesElevadas = data.medicoes.filter(
    (medicao) =>
      medicao.sistolica >= 135 ||
      medicao.diastolica >= 85
  );

  const afericoesBaixas = data.medicoes.filter(
    (medicao) =>
      medicao.sistolica < 90 ||
      medicao.diastolica < 60
  );

  const afericoesElevadasNoite =
    afericoesElevadas.filter(
      (medicao) =>
        medicao.periodo.toLowerCase() === "noite"
    ).length;

  const idade = calcularIdade(
    data.paciente?.data_nascimento
  );

  const resumoPorDia = new Map<
    string,
    {
      manha?: Media;
      noite?: Media;
    }
  >();

  for (const item of medias) {
    const atual = resumoPorDia.get(item.data) ?? {};

    if (item.periodo.toLowerCase() === "manha") {
      atual.manha = item;
    }

    if (item.periodo.toLowerCase() === "noite") {
      atual.noite = item;
    }

    resumoPorDia.set(item.data, atual);
  }

  const dadosGrafico = Array.from(
    resumoPorDia.entries()
  )
    .sort(([dataA], [dataB]) =>
      dataA.localeCompare(dataB)
    )
    .flatMap(([dataResumo, periodos]) => {
      const itens: Array<{
        nome: string;
        sistolica: number;
        diastolica: number;
        pulso: number | null;
      }> = [];

      if (periodos.manha) {
        itens.push({
          nome: `${br(dataResumo)} M`,
          sistolica: Math.round(
            periodos.manha.media_sistolica
          ),
          diastolica: Math.round(
            periodos.manha.media_diastolica
          ),
          pulso:
            periodos.manha.media_pulso === null
              ? null
              : Math.round(
                  periodos.manha.media_pulso
                ),
        });
      }

      if (periodos.noite) {
        itens.push({
          nome: `${br(dataResumo)} N`,
          sistolica: Math.round(
            periodos.noite.media_sistolica
          ),
          diastolica: Math.round(
            periodos.noite.media_diastolica
          ),
          pulso:
            periodos.noite.media_pulso === null
              ? null
              : Math.round(
                  periodos.noite.media_pulso
                ),
        });
      }

      return itens;
    });

  const medicoesOrdenadas = [...data.medicoes].sort(
    (a, b) => {
      const dataComparada =
        a.data.localeCompare(b.data);

      if (dataComparada !== 0) {
        return dataComparada;
      }

      return a.hora.localeCompare(b.hora);
    }
  );

  const primeiraAfericao =
    medicoesOrdenadas[0] ?? null;

  const ultimaAfericao =
    medicoesOrdenadas[
      medicoesOrdenadas.length - 1
    ] ?? null;

  const paresPorPeriodo = new Map<
    string,
    Medicao[]
  >();

  for (const medicao of medicoesOrdenadas) {
    const chave =
      `${medicao.data}-${medicao.periodo}`;

    const grupo =
      paresPorPeriodo.get(chave) ?? [];

    grupo.push(medicao);
    paresPorPeriodo.set(chave, grupo);
  }

  const intervalos = Array.from(
    paresPorPeriodo.values()
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
    .filter((intervalo) => intervalo >= 0);

  const intervalosAdequados =
    intervalos.filter(
      (intervalo) =>
        intervalo >= 1 && intervalo <= 15
    ).length;

  const percentualIntervalos =
    intervalos.length > 0
      ? Math.round(
          (intervalosAdequados /
            intervalos.length) *
            100
        )
      : 0;

  const medicoesEsperadas =
    duracaoProtocolo * 4;

  const percentualRegistros =
    medicoesEsperadas > 0
      ? Math.min(
          100,
          Math.round(
            (data.medicoes.length /
              medicoesEsperadas) *
              100
          )
        )
      : 0;

  const qualidadeProtocolo =
    Math.round(
      adesao * 0.6 +
        percentualRegistros * 0.25 +
        percentualIntervalos * 0.15
    );

  const relatorioId =
    token.slice(0, 4).toUpperCase() +
    "-" +
    token.slice(4, 8).toUpperCase() +
    "-" +
    token.slice(-4).toUpperCase();

  const mediaDentroReferencia =
    mediaGeralSistolica !== null &&
    mediaGeralDiastolica !== null &&
    mediaGeralSistolica < 135 &&
    mediaGeralDiastolica < 85;

  const mediaAbaixoReferencia =
    mediaGeralSistolica !== null &&
    mediaGeralDiastolica !== null &&
    (mediaGeralSistolica < 90 ||
      mediaGeralDiastolica < 60);

  const classificacao = mediaAbaixoReferencia
    ? {
        titulo:
          "Média abaixo da faixa residencial habitual",
        descricao:
          "Foram observados valores médios inferiores a 90 × 60 mmHg. A interpretação deve ser realizada pelo médico responsável.",
        classe:
          "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200",
        Icone: TrendingDown,
      }
    : mediaDentroReferencia
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

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="card-surface overflow-hidden p-0 print:shadow-none">
        <div className="border-b border-border bg-primary/5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Somente leitura
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" />
                Imprimir / PDF
              </Button>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Stethoscope className="h-4 w-4" />
                Relatório compartilhado com o médico
              </div>

              <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">
                {data.paciente?.nome ?? "Paciente"}
              </h1>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {idade !== null && (
                  <span className="flex items-center gap-1.5">
                    <UserRound className="h-4 w-4" />
                    {idade} anos
                  </span>
                )}

                {data.paciente?.sexo && (
                  <span>Sexo: {data.paciente.sexo}</span>
                )}

                {data.paciente?.data_nascimento && (
                  <span>
                    Nascimento:{" "}
                    {br(data.paciente.data_nascimento)}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              {data.protocolo ? (
                <>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Início:{" "}
                    {br(data.protocolo.data_inicio)}
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Protocolo de{" "}
                    {data.protocolo.duracao_dias} dias
                  </div>
                </>
              ) : (
                <div>Sem protocolo ativo.</div>
              )}

              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Link válido até{" "}
                {formatarDataHora(data.expires_at)}
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PainelCard
          titulo="Média geral"
          valor={formatarPressao(
            mediaGeralSistolica,
            mediaGeralDiastolica
          )}
          detalhe="mmHg"
          icone={
            <HeartPulse className="h-5 w-5" />
          }
        />

        <PainelCard
          titulo="Média da manhã"
          valor={formatarPressao(
            mediaManhaSistolica,
            mediaManhaDiastolica
          )}
          detalhe="mmHg"
          icone={
            <Activity className="h-5 w-5" />
          }
        />

        <PainelCard
          titulo="Média da noite"
          valor={formatarPressao(
            mediaNoiteSistolica,
            mediaNoiteDiastolica
          )}
          detalhe="mmHg"
          icone={
            <Activity className="h-5 w-5" />
          }
        />

        <PainelCard
          titulo="Pulso médio"
          valor={
            pulsoMedio === null
              ? "—"
              : String(pulsoMedio)
          }
          detalhe="bpm"
          icone={
            <Activity className="h-5 w-5" />
          }
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PainelCard
          titulo="Maior aferição"
          valor={
            maiorMedicao
              ? `${maiorMedicao.sistolica} × ${maiorMedicao.diastolica}`
              : "—"
          }
          detalhe={
            maiorMedicao
              ? `${br(maiorMedicao.data)} às ${maiorMedicao.hora.slice(0, 5)}`
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
              ? `${br(menorMedicao.data)} às ${menorMedicao.hora.slice(0, 5)}`
              : undefined
          }
          icone={
            <TrendingDown className="h-5 w-5" />
          }
        />

        <PainelCard
          titulo="Aferições"
          valor={String(data.medicoes.length)}
          detalhe="registros realizados"
          icone={
            <Stethoscope className="h-5 w-5" />
          }
        />

        <PainelCard
          titulo="Adesão"
          valor={`${adesao}%`}
          detalhe={`${diasCompletos} de ${duracaoProtocolo} dias completos`}
          icone={
            <CheckCircle2 className="h-5 w-5" />
          }
        />
      </section>

      <section className="card-surface p-5 print:break-inside-avoid print:shadow-none">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold">
                  Adesão ao protocolo
                </h2>

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
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    adesao
                  )}%`,
                }}
              />
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Foram realizadas{" "}
              {data.medicoes.length} de{" "}
              {medicoesEsperadas} aferições
              previstas no protocolo completo.
            </p>
          </div>

          <div className="border-t pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold">
                  Qualidade do protocolo
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Completude, adesão e intervalos
                </p>
              </div>

              <strong className="text-2xl text-primary">
                {qualidadeProtocolo}%
              </strong>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    qualidadeProtocolo
                  )}%`,
                }}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground">
                  Primeiro registro
                </span>

                <strong className="mt-1 block">
                  {primeiraAfericao
                    ? primeiraAfericao.hora.slice(
                        0,
                        5
                      )
                    : "—"}
                </strong>
              </div>

              <div className="rounded-xl bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground">
                  Último registro
                </span>

                <strong className="mt-1 block">
                  {ultimaAfericao
                    ? ultimaAfericao.hora.slice(
                        0,
                        5
                      )
                    : "—"}
                </strong>
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              {intervalosAdequados} de{" "}
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
            <h2 className="font-bold">
              {classificacao.titulo}
            </h2>

            <p className="mt-1 text-sm opacity-90">
              {classificacao.descricao}
            </p>
          </div>
        </div>
      </section>

      <section className="card-surface p-5 print:shadow-none">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />

          <h2 className="text-lg font-bold">
            Resumo do período
          </h2>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 text-sm leading-7">
          <p>
            Durante o período analisado foram
            registradas{" "}
            <strong>
              {data.medicoes.length} aferições
            </strong>{" "}
            distribuídas em{" "}
            <strong>
              {periodosPorDia.size} dias
            </strong>
            .
          </p>

          <p>
            A média residencial foi de{" "}
            <strong>
              {formatarPressao(
                mediaGeralSistolica,
                mediaGeralDiastolica
              )}{" "}
              mmHg
            </strong>
            , com pulso médio de{" "}
            <strong>
              {pulsoMedio ?? "—"} bpm
            </strong>
            .
          </p>

          <p>
            A adesão ao protocolo foi de{" "}
            <strong>{adesao}%</strong>, com{" "}
            <strong>
              {diasCompletos} dias completos
            </strong>{" "}
            de um total previsto de{" "}
            <strong>{duracaoProtocolo}</strong>.
          </p>

          <p>
            Foram identificadas{" "}
            <strong>
              {afericoesElevadas.length}
            </strong>{" "}
            aferições iguais ou superiores à referência
            residencial de 135 × 85 mmHg
            {afericoesElevadasNoite > 0
              ? `, sendo ${afericoesElevadasNoite} no período noturno`
              : ""}
            .
          </p>

          <p>
            Foram identificadas{" "}
            <strong>{afericoesBaixas.length}</strong>{" "}
            aferições inferiores a 90 × 60 mmHg.
          </p>

          <p className="mt-3 text-xs text-muted-foreground">
            Este resumo é gerado automaticamente a
            partir dos registros informados pelo
            paciente. Não constitui diagnóstico nem
            substitui avaliação médica.
          </p>
        </div>
      </section>

      <section className="card-surface p-5 print:break-inside-avoid print:shadow-none">
        <div>
          <h2 className="text-lg font-bold">
            Evolução da pressão arterial
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Médias da manhã e da noite durante
            o período monitorado.
          </p>
        </div>

        {dadosGrafico.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhum dado disponível para o gráfico.
          </p>
        ) : (
          <div className="mt-5 h-[360px] w-full">
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

                <YAxis
                  domain={[
                    "dataMin - 10",
                    "dataMax + 10",
                  ]}
                />

                <Tooltip />
                <Legend />

                <ReferenceLine
                  y={135}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  label={{
                    value: "Referência sistólica 135",
                    position: "insideTopRight",
                    fontSize: 10,
                  }}
                />

                <ReferenceLine
                  y={85}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  label={{
                    value: "Referência diastólica 85",
                    position: "insideBottomRight",
                    fontSize: 10,
                  }}
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
        )}

        <p className="mt-2 text-xs text-muted-foreground">
          As linhas de referência têm finalidade
          informativa e não representam diagnóstico.
        </p>
      </section>

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

      {observacoes.length > 0 && (
        <section className="card-surface p-5">
          <h2 className="font-bold">Observações do paciente</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Informações registradas junto às aferições.
          </p>

          <div className="mt-4 space-y-3">
            {observacoes.map((medicao) => (
              <div
                key={`observacao-${medicao.id}`}
                className="rounded-xl border border-border bg-muted/30 p-4"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{br(medicao.data)}</span>
                  <span>{medicao.hora.slice(0, 5)}</span>
                  <span className="capitalize">{medicao.periodo}</span>
                  <span>{medicao.ordem}ª aferição</span>
                </div>

                <p className="mt-2 text-sm leading-relaxed">
                  {medicao.observacao}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

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
      <footer className="card-surface p-5 text-sm print:break-inside-avoid print:shadow-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Documento eletrônico MeuMapa
            </div>

            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Relatório gerado automaticamente com
              informações registradas pelo paciente.
              Os dados destinam-se ao acompanhamento
              clínico e não substituem avaliação,
              diagnóstico ou conduta médica.
            </p>
          </div>

          <div className="text-xs text-muted-foreground sm:text-right">
            <p>
              ID do relatório:{" "}
              <strong className="text-foreground">
                {relatorioId}
              </strong>
            </p>

            <p className="mt-1">
              Emitido em{" "}
              {formatarDataHora(
                new Date().toISOString()
              )}
            </p>
          </div>
        </div>
      </footer>
    </main>
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

