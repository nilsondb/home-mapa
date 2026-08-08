import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useMedicoes, useProtocoloAtivo } from "@/hooks/use-medicoes";
import { agruparPorDia, addDias, formatarData, PERIODO_LABEL } from "@/lib/meumapa";
import type { DiaAgrupado, Medicao } from "@/lib/meumapa";
import { EditarMedicaoDialog } from "@/components/EditarMedicaoDialog";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de medições — MeuMapa" },
      {
        name: "description",
        content: "Veja todas as aferições por dia, com médias de manhã e noite e calendário.",
      },
      { property: "og:title", content: "Histórico de medições — MeuMapa" },
      {
        property: "og:description",
        content: "Todos os dias do protocolo com médias automáticas de manhã e noite.",
      },
    ],
  }),
  component: Historico,
});

function BlocoPeriodo({
  titulo,
  icone,
  itens,
  media,
}: {
  titulo: string;
  icone: React.ReactNode;
  itens: Medicao[];
  media: { s: number | null; d: number | null; p: number | null };
}) {
  return (
    <div className="rounded-2xl bg-secondary/50 p-4">
      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
        {icone}
        {titulo}
      </div>
      {itens.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Sem registro.</p>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap gap-2">
            {itens.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 rounded-lg bg-card py-1 pl-2.5 pr-1 text-sm font-semibold shadow-sm"
              >
                {m.sistolica}×{m.diastolica}
                {m.pulso ? (
                  <span className="text-xs font-normal text-muted-foreground">
                    {m.pulso} bpm
                  </span>
                ) : null}
                <EditarMedicaoDialog medicao={m} />
              </span>
            ))}
          </div>

          {media.s && media.d ? (
            <p className="mt-3 text-sm">
              <span className="text-muted-foreground">Média </span>
              <span className="text-lg font-extrabold text-primary">
                {Math.round(media.s)}×{Math.round(media.d)}
              </span>
              {media.p ? (
                <span className="ml-2 text-muted-foreground">{Math.round(media.p)} bpm</span>
              ) : null}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function CardDia({ dia }: { dia: DiaAgrupado }) {
  const observacoes = [...dia.manha, ...dia.noite]
    .map((m) => m.observacao)
    .filter((o): o is string => !!o);
  return (
    <article className="card-surface animate-rise p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="truncate text-lg font-extrabold">{formatarData(dia.data)}</h2>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
            dia.completo
              ? "bg-success-soft text-success"
              : "bg-warning-soft text-warning-foreground",
          )}
        >
          {dia.completo ? "Completo" : "Incompleto"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <BlocoPeriodo
          titulo={PERIODO_LABEL.manha}
          icone={<Sun className="h-4 w-4 text-morning" />}
          itens={dia.manha}
          media={dia.mediaManha}
        />
        <BlocoPeriodo
          titulo={PERIODO_LABEL.noite}
          icone={<Moon className="h-4 w-4 text-night" />}
          itens={dia.noite}
          media={dia.mediaNoite}
        />
      </div>
      {observacoes.length > 0 ? (
        <div className="mt-4 rounded-xl border border-border p-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Observações</p>
          <ul className="mt-1 space-y-1 text-sm">
            {observacoes.map((o, i) => (
              <li key={i}>• {o}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function Historico() {
  const { user } = useSession();
  const { data: medicoes = [] } = useMedicoes(user?.id);
  const { data: protocolo } = useProtocoloAtivo(user?.id);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const dias = useMemo(() => agruparPorDia(medicoes), [medicoes]);
  const mapaDias = useMemo(() => new Map(dias.map((d) => [d.data, d])), [dias]);

  const calendario = useMemo(() => {
    if (!protocolo) return [];
    return Array.from({ length: protocolo.duracao_dias }, (_, i) =>
      addDias(protocolo.data_inicio, i),
    );
  }, [protocolo]);

  const listados = selecionado
    ? dias.filter((d) => d.data === selecionado)
    : dias;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Histórico</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada dia com as duas aferições e a média automática.
        </p>
      </div>

      <section className="card-surface p-5">
        <h2 className="font-bold">Calendário do protocolo</h2>
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {calendario.map((data) => {
            const dia = mapaDias.get(data);
            const estado = dia?.completo ? "completo" : dia ? "parcial" : "vazio";
            return (
              <button
                key={data}
                onClick={() => setSelecionado(selecionado === data ? null : data)}
                className={cn(
                  "rounded-xl border px-2 py-3 text-center text-xs font-semibold transition-all hover:-translate-y-0.5",
                  estado === "completo" && "border-success bg-success-soft text-success",
                  estado === "parcial" && "border-warning bg-warning-soft text-warning-foreground",
                  estado === "vazio" && "border-border bg-muted text-muted-foreground",
                  selecionado === data && "ring-2 ring-ring",
                )}
              >
                {formatarData(data).slice(0, 5)}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-success" /> Completo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-warning" /> Incompleto
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" /> Sem registro
          </span>
        </div>
      </section>

      {listados.length === 0 ? (
        <p className="card-surface p-6 text-center text-sm text-muted-foreground">
          Nenhum registro para exibir.
        </p>
      ) : (
        <div className="space-y-4">
          {listados.map((d) => (
            <CardDia key={d.data} dia={d} />
          ))}
        </div>
      )}
    </div>
  );
}
