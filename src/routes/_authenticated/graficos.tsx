import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSession } from "@/hooks/use-session";
import { useMedicoes } from "@/hooks/use-medicoes";
import { agruparPorDia, formatarData, media } from "@/lib/meumapa";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/graficos")({
  head: () => ({
    meta: [
      { title: "Gráficos da pressão — MeuMapa" },
      {
        name: "description",
        content:
          "Visualize a evolução da pressão sistólica, diastólica e do pulso por dia, semana e mês.",
      },
      { property: "og:title", content: "Gráficos da pressão — MeuMapa" },
      {
        property: "og:description",
        content: "Tendências diárias, semanais e mensais das suas medições.",
      },
    ],
  }),
  component: Graficos,
});

type Agrupamento = "dia" | "semana" | "mes";

function chaveSemana(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const inicio = new Date(d);
  inicio.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return inicio.toISOString().slice(0, 10);
}

function Graficos() {
  const { user } = useSession();
  const { data: medicoes = [] } = useMedicoes(user?.id);
  const [agrupamento, setAgrupamento] = useState<Agrupamento>("dia");

  const dados = useMemo(() => {
    const dias = agruparPorDia(medicoes)
      .slice()
      .sort((a, b) => (a.data < b.data ? -1 : 1))
      .map((d) => {
        const todos = [...d.manha, ...d.noite];
        return {
          data: d.data,
          sistolica: media(todos.map((m) => m.sistolica)) ?? 0,
          diastolica: media(todos.map((m) => m.diastolica)) ?? 0,
          pulso: media(todos.map((m) => m.pulso)) ?? 0,
        };
      });

    if (agrupamento === "dia") {
      return dias.map((d) => ({ ...d, rotulo: formatarData(d.data).slice(0, 5) }));
    }

    const chave = (iso: string) =>
      agrupamento === "semana" ? chaveSemana(iso) : iso.slice(0, 7);
    const mapa = new Map<string, typeof dias>();
    for (const d of dias) {
      const k = chave(d.data);
      mapa.set(k, [...(mapa.get(k) ?? []), d]);
    }
    return [...mapa.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([k, itens]) => ({
        data: k,
        rotulo:
          agrupamento === "semana"
            ? `Sem. ${formatarData(k).slice(0, 5)}`
            : k.split("-").reverse().join("/"),
        sistolica: media(itens.map((i) => i.sistolica)) ?? 0,
        diastolica: media(itens.map((i) => i.diastolica)) ?? 0,
        pulso: media(itens.map((i) => i.pulso)) ?? 0,
      }));
  }, [medicoes, agrupamento]);

  const graficos = [
    { titulo: "Pressão sistólica", chave: "sistolica", cor: "var(--chart-1)", ref: 135 },
    { titulo: "Pressão diastólica", chave: "diastolica", cor: "var(--chart-2)", ref: 85 },
    { titulo: "Pulso", chave: "pulso", cor: "var(--chart-4)", ref: null },
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Gráficos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Médias por período. A linha tracejada indica a referência residencial (135×85).
        </p>
      </div>

      <div className="flex gap-2">
        {(
          [
            ["dia", "Diária"],
            ["semana", "Semanal"],
            ["mes", "Mensal"],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            onClick={() => setAgrupamento(valor)}
            className={cn(
              "rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors",
              agrupamento === valor
                ? "border-primary bg-primary-soft text-primary"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {dados.length === 0 ? (
        <p className="card-surface p-6 text-center text-sm text-muted-foreground">
          Registre medições para visualizar os gráficos.
        </p>
      ) : (
        graficos.map((g) => (
          <section key={g.chave} className="card-surface animate-rise p-5">
            <h2 className="font-bold">{g.titulo}</h2>
            <div className="mt-4 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dados} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="rotulo" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      color: "var(--popover-foreground)",
                    }}
                  />
                  {g.ref ? (
                    <ReferenceLine y={g.ref} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
                  ) : null}
                  <Line
                    type="monotone"
                    dataKey={g.chave}
                    stroke={g.cor}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
