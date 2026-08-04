import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HeartPulse,
  Loader2,
  Printer,
  ShieldCheck,
  Stethoscope,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/shared/$token")({
  component: SharedMedicalReport,
});

type Periodo = "manha" | "noite";

interface Medicao {
  id: string;
  data: string;
  periodo: Periodo;
  ordem: number;
  sistolica: number;
  diastolica: number;
  pulso: number | null;
  braco?: string | null;
  observacao?: string | null;
  hora?: string | null;
  created_at?: string;
}

interface SharedReport {
  shared: {
    period_type: string;
    start_date: string | null;
    end_date: string | null;
    expires_at: string | null;
    created_at: string;
  };
  profile: {
    nome?: string;
    nascimento?: string | null;
    sexo?: string | null;
    peso?: number | null;
    altura?: number | null;
    foto_url?: string | null;
    avatar_url?: string | null;
  };
  medicoes: Medicao[];
  generated_at: string;
}

interface PeriodSummary {
  medicoes: Medicao[];
  mediaSistolica: number | null;
  mediaDiastolica: number | null;
  mediaPulso: number | null;
  completo: boolean;
}

interface DaySummary {
  data: string;
  manha: PeriodSummary;
  noite: PeriodSummary;
  completo: boolean;
}

function average(values: Array<number | null | undefined>) {
  const valid = values.filter(
    (value): value is number =>
      typeof value === "number" &&
      Number.isFinite(value)
  );

  if (valid.length === 0) return null;

  return Math.round(
    valid.reduce((sum, value) => sum + value, 0) /
      valid.length
  );
}

function formatPressure(
  systolic: number | null,
  diastolic: number | null
) {
  if (systolic === null || diastolic === null) {
    return "—";
  }

  return `${systolic} × ${diastolic}`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function calculateAge(date?: string | null) {
  if (!date) return null;

  const birth = new Date(`${date}T12:00:00`);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  const monthDifference =
    today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function buildDays(medicoes: Medicao[]): DaySummary[] {
  const map = new Map<
    string,
    {
      manha: Medicao[];
      noite: Medicao[];
    }
  >();

  for (const medicao of medicoes) {
    const current = map.get(medicao.data) ?? {
      manha: [],
      noite: [],
    };

    current[medicao.periodo].push(medicao);
    map.set(medicao.data, current);
  }

  return Array.from(map.entries())
    .map(([data, periods]) => {
      const createPeriod = (
        entries: Medicao[]
      ): PeriodSummary => {
        const ordered = [...entries].sort(
          (a, b) => a.ordem - b.ordem
        );

        return {
          medicoes: ordered,
          mediaSistolica: average(
            ordered.map((item) => item.sistolica)
          ),
          mediaDiastolica: average(
            ordered.map((item) => item.diastolica)
          ),
          mediaPulso: average(
            ordered.map((item) => item.pulso)
          ),
          completo: ordered.length >= 2,
        };
      };

      const manha = createPeriod(periods.manha);
      const noite = createPeriod(periods.noite);

      return {
        data,
        manha,
        noite,
        completo: manha.completo && noite.completo,
      };
    })
    .sort((a, b) => a.data.localeCompare(b.data));
}

function periodLabel(type: string) {
  switch (type) {
    case "last_7_days":
      return "Últimos 7 dias";
    case "last_30_days":
      return "Últimos 30 dias";
    case "all_history":
      return "Todo o histórico";
    case "custom":
      return "Período personalizado";
    default:
      return "Período compartilhado";
  }
}

function SharedMedicalReport() {
  const { token } = Route.useParams();

  const [report, setReport] =
    useState<SharedReport | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        setLoading(true);
        setErrorMessage(null);

        const { data, error } = await (
          supabase as any
        ).rpc("get_shared_report", {
          p_token: token,
        });

        if (error) {
          throw error;
        }

        if (!cancelled) {
          setReport(data as SharedReport);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o acompanhamento."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const medicoes = report?.medicoes ?? [];

  const days = useMemo(
    () => buildDays(medicoes),
    [medicoes]
  );

  const statistics = useMemo(() => {
    const systolic = medicoes.map(
      (item) => item.sistolica
    );

    const diastolic = medicoes.map(
      (item) => item.diastolica
    );

    const pulse = medicoes.map((item) => item.pulso);

    const completeDays = days.filter(
      (day) => day.completo
    ).length;

    return {
      averageSystolic: average(systolic),
      averageDiastolic: average(diastolic),
      averagePulse: average(pulse),
      maximumSystolic:
        systolic.length > 0
          ? Math.max(...systolic)
          : null,
      minimumSystolic:
        systolic.length > 0
          ? Math.min(...systolic)
          : null,
      totalMeasurements: medicoes.length,
      completeDays,
      completion:
        days.length > 0
          ? Math.round(
              (completeDays / days.length) * 100
            )
          : 0,
    };
  }, [days, medicoes]);

  const chartData = useMemo(
    () =>
      days.flatMap((day) => {
        const result = [];

        if (day.manha.medicoes.length > 0) {
          result.push({
            label: `${formatDate(day.data)} manhã`,
            data: day.data,
            periodo: "Manhã",
            sistolica: day.manha.mediaSistolica,
            diastolica: day.manha.mediaDiastolica,
            pulso: day.manha.mediaPulso,
          });
        }

        if (day.noite.medicoes.length > 0) {
          result.push({
            label: `${formatDate(day.data)} noite`,
            data: day.data,
            periodo: "Noite",
            sistolica: day.noite.mediaSistolica,
            diastolica: day.noite.mediaDiastolica,
            pulso: day.noite.mediaPulso,
          });
        }

        return result;
      }),
    [days]
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            Carregando acompanhamento...
          </p>
        </div>
      </main>
    );
  }

  if (errorMessage || !report) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />

            <h1 className="mb-2 text-xl font-semibold">
              Link indisponível
            </h1>

            <p className="text-muted-foreground">
              Este link pode ser inválido, ter expirado ou
              ter sido revogado pelo paciente.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const profile = report.profile ?? {};
  const age = calculateAge(profile.nascimento);

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <HeartPulse className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-xl font-bold">
                MeuMapa
              </h1>

              <p className="text-sm text-muted-foreground">
                Acompanhamento residencial da pressão arterial
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="gap-1.5 py-1.5"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Somente leitura
            </Badge>

            <Button
              variant="outline"
              className="gap-2 print:hidden"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                <Stethoscope className="h-4 w-4" />
                Relatório compartilhado com o médico
              </div>

              <h2 className="text-2xl font-bold">
                {profile.nome || "Paciente"}
              </h2>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {age !== null && (
                  <span>{age} anos</span>
                )}

                {profile.sexo && (
                  <span>{profile.sexo}</span>
                )}

                <span>
                  {periodLabel(report.shared.period_type)}
                </span>
              </div>
            </div>

            <div className="grid gap-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                Atualizado em{" "}
                {formatDateTime(report.generated_at)}
              </div>

              {report.shared.expires_at && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Link válido até{" "}
                  {formatDateTime(
                    report.shared.expires_at
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Média geral"
            value={formatPressure(
              statistics.averageSystolic,
              statistics.averageDiastolic
            )}
            suffix="mmHg"
            icon={<HeartPulse className="h-5 w-5" />}
          />

          <SummaryCard
            title="Pulso médio"
            value={
              statistics.averagePulse?.toString() ?? "—"
            }
            suffix="bpm"
            icon={<Activity className="h-5 w-5" />}
          />

          <SummaryCard
            title="Maior sistólica"
            value={
              statistics.maximumSystolic?.toString() ??
              "—"
            }
            suffix="mmHg"
            icon={<TrendingUp className="h-5 w-5" />}
          />

          <SummaryCard
            title="Menor sistólica"
            value={
              statistics.minimumSystolic?.toString() ??
              "—"
            }
            suffix="mmHg"
            icon={<TrendingDown className="h-5 w-5" />}
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <SimpleStat
            label="Total de aferições"
            value={statistics.totalMeasurements}
          />

          <SimpleStat
            label="Dias completos"
            value={statistics.completeDays}
          />

          <SimpleStat
            label="Protocolo concluído"
            value={`${statistics.completion}%`}
          />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>
              Evolução da pressão arterial
            </CardTitle>
          </CardHeader>

          <CardContent>
            {chartData.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="h-[360px] w-full">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={chartData}
                    margin={{
                      top: 10,
                      right: 20,
                      bottom: 20,
                      left: 0,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      angle={-20}
                      textAnchor="end"
                      height={70}
                    />

                    <YAxis
                      domain={["dataMin - 10", "dataMax + 10"]}
                    />

                    <Tooltip />
                    <Legend />

                    <Line
                      type="monotone"
                      dataKey="sistolica"
                      name="Sistólica"
                      stroke="currentColor"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />

                    <Line
                      type="monotone"
                      dataKey="diastolica"
                      name="Diastólica"
                      stroke="currentColor"
                      strokeDasharray="6 4"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolução do pulso</CardTitle>
          </CardHeader>

          <CardContent>
            {chartData.every(
              (item) => item.pulso === null
            ) ? (
              <EmptyState />
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={chartData}
                    margin={{
                      top: 10,
                      right: 20,
                      bottom: 20,
                      left: 0,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      angle={-20}
                      textAnchor="end"
                      height={70}
                    />

                    <YAxis />

                    <Tooltip />

                    <Line
                      type="monotone"
                      dataKey="pulso"
                      name="Pulso"
                      stroke="currentColor"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">
              Histórico detalhado
            </h2>

            <p className="text-sm text-muted-foreground">
              Duas aferições pela manhã e duas à noite,
              com suas respectivas médias.
            </p>
          </div>

          {days.length === 0 ? (
            <Card>
              <CardContent className="py-10">
                <EmptyState />
              </CardContent>
            </Card>
          ) : (
            days.map((day) => (
              <DayCard
                key={day.data}
                day={day}
              />
            ))
          )}
        </section>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex gap-3 p-5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

            <div className="text-sm">
              <p className="font-medium">
                Informações para acompanhamento clínico
              </p>

              <p className="mt-1 text-muted-foreground">
                Os dados apresentados foram registrados pelo
                paciente e destinam-se ao acompanhamento pelo
                profissional responsável. Este relatório não
                substitui consulta, diagnóstico ou avaliação
                médica presencial.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  suffix,
  icon,
}: {
  title: string;
  value: string;
  suffix?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {title}
          </span>

          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            {icon}
          </div>
        </div>

        <div className="text-2xl font-bold">
          {value}
        </div>

        {suffix && (
          <div className="mt-1 text-xs text-muted-foreground">
            {suffix}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SimpleStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">
          {label}
        </div>

        <div className="mt-2 text-2xl font-bold">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function DayCard({ day }: { day: DaySummary }) {
  const observations = [
    ...day.manha.medicoes,
    ...day.noite.medicoes,
  ]
    .map((item) => item.observacao?.trim())
    .filter(
      (value): value is string => Boolean(value)
    );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">
          {formatDate(day.data)}
        </CardTitle>

        {day.completo ? (
          <Badge className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Dia completo
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="gap-1"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Dia incompleto
          </Badge>
        )}
      </CardHeader>

      <CardContent className="grid gap-4 lg:grid-cols-2">
        <PeriodCard
          title="Manhã"
          period={day.manha}
        />

        <PeriodCard
          title="Noite"
          period={day.noite}
        />

        {observations.length > 0 && (
          <div className="rounded-xl border bg-muted/40 p-4 lg:col-span-2">
            <div className="mb-2 text-sm font-medium">
              Observações
            </div>

            <ul className="space-y-1 text-sm text-muted-foreground">
              {observations.map(
                (observation, index) => (
                  <li key={`${observation}-${index}`}>
                    • {observation}
                  </li>
                )
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PeriodCard({
  title,
  period,
}: {
  title: string;
  period: PeriodSummary;
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>

        <span className="text-xs text-muted-foreground">
          {period.medicoes.length}/2 aferições
        </span>
      </div>

      <div className="space-y-2">
        {[1, 2].map((order) => {
          const measurement = period.medicoes.find(
            (item) => item.ordem === order
          );

          return (
            <div
              key={order}
              className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">
                {order}ª aferição
              </span>

              <strong>
                {measurement
                  ? `${measurement.sistolica} × ${measurement.diastolica}`
                  : "—"}
              </strong>
            </div>
          );
        })}

        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <span className="font-medium">
            Média
          </span>

          <strong className="text-lg">
            {formatPressure(
              period.mediaSistolica,
              period.mediaDiastolica
            )}
          </strong>
        </div>

        {period.mediaPulso !== null && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Pulso médio</span>
            <span>{period.mediaPulso} bpm</span>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-8 text-center text-muted-foreground">
      Nenhuma aferição encontrada para este período.
    </div>
  );
}
