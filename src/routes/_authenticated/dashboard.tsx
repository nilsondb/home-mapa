import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Activity,
  CalendarClock,
  FileText,
  Heart,
  Moon,
  Plus,
  Sun,
  TrendingUp,
  CircleCheck,
  Circle,
  CircleDashed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSession, useProfile } from "@/hooks/use-session";
import { useMedicoes, useProtocoloAtivo } from "@/hooks/use-medicoes";
import {
  agruparPorDia,
  classificarMediaResidencial,
  diffDias,
  hojeISO,
  media,
  saudacao,
} from "@/lib/meumapa";
import { cn } from "@/lib/utils";
import { ShareDoctorLink } from "@/components/ShareDoctorLink";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Meu painel — MeuMapa" },
      {
        name: "description",
        content:
          "Acompanhe suas medições de pressão arterial do dia, o progresso do protocolo e suas médias.",
      },
      { property: "og:title", content: "Meu painel — MeuMapa" },
      {
        property: "og:description",
        content: "Registro residencial da pressão arterial com médias automáticas.",
      },
    ],
  }),
  component: Dashboard,
});

function StatusLinha({
  icone,
  titulo,
  qtd,
}: {
  icone: React.ReactNode;
  titulo: string;
  qtd: number;
}) {
  const estado =
    qtd >= 2 ? "Concluída" : qtd === 1 ? "1 de 2 aferições" : "Não iniciada";
  const Icone = qtd >= 2 ? CircleCheck : qtd === 1 ? CircleDashed : Circle;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-secondary/60 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0">{icone}</span>
        <span className="truncate font-semibold">{titulo}</span>
      </div>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1.5 text-sm font-medium",
          qtd >= 2 ? "text-success" : qtd === 1 ? "text-warning" : "text-muted-foreground",
        )}
      >
        <Icone className="h-4 w-4" />
        {estado}
      </span>
    </div>
  );
}

function CardMetrica({
  icone,
  rotulo,
  valor,
  detalhe,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: string;
  detalhe?: string;
}) {
  return (
    <div className="card-surface animate-rise p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icone}
        <span className="truncate">{rotulo}</span>
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight">{valor}</p>
      {detalhe ? <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p> : null}
    </div>
  );
}

function Dashboard() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { data: protocolo } = useProtocoloAtivo(user?.id);
  const { data: medicoes = [] } = useMedicoes(user?.id);

  const hoje = hojeISO();
  const dias = useMemo(() => agruparPorDia(medicoes), [medicoes]);
  const diaHoje = dias.find((d) => d.data === hoje);

  const diaAtual = protocolo
    ? Math.min(diffDias(protocolo.data_inicio, hoje) + 1, protocolo.duracao_dias)
    : 1;
  const diasCompletos = dias.filter((d) => d.completo).length;
  const progresso = protocolo
    ? Math.round((diasCompletos / protocolo.duracao_dias) * 100)
    : 0;
  const restantes = protocolo ? Math.max(protocolo.duracao_dias - diasCompletos, 0) : 0;

  const mediaGeralS = media(medicoes.map((m) => m.sistolica));
  const mediaGeralD = media(medicoes.map((m) => m.diastolica));
  const ultima = medicoes[0];
  const faixa =
    mediaGeralS && mediaGeralD ? classificarMediaResidencial(mediaGeralS, mediaGeralD) : null;

  const primeiroNome = (profile?.nome || "").split(" ")[0];

  return (
    <div className="space-y-5">
      <div className="animate-rise">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {saudacao()}
          {primeiroNome ? `, ${primeiroNome}` : ""}.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seu mapa residencial de pressão arterial.
        </p>
      </div>

      <section className="card-surface animate-rise overflow-hidden">
        <div className="gradient-health px-5 py-4">
          <p className="text-sm font-medium text-primary-foreground/80">Hoje</p>
          <p className="text-xl font-extrabold text-primary-foreground">
            Status das medições
          </p>
        </div>
        <div className="space-y-3 p-5">
          <StatusLinha
            icone={<Sun className="h-5 w-5 text-morning" />}
            titulo="Manhã"
            qtd={diaHoje?.manha.length ?? 0}
          />
          <StatusLinha
            icone={<Moon className="h-5 w-5 text-night" />}
            titulo="Noite"
            qtd={diaHoje?.noite.length ?? 0}
          />

          <div className="pt-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-sm">
              <span className="truncate font-medium">
                Dia {diaAtual} de {protocolo?.duracao_dias ?? 7}
              </span>
              <span className="shrink-0 font-bold text-primary">{progresso}%</span>
            </div>
            <Progress value={progresso} className="mt-2 h-2.5" />
            <p className="mt-2 text-xs text-muted-foreground">
              Mínimo aceitável: {protocolo?.minimo_dias ?? 5} dias completos.
            </p>
          </div>

          <Button asChild size="lg" className="mt-2 w-full rounded-2xl">
            <Link to="/nova-medicao">
              <Plus className="h-5 w-5" />
              Nova medição
            </Link>
          </Button>

          <ShareDoctorLink protocoloId={protocolo?.id} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardMetrica
          icone={<TrendingUp className="h-4 w-4 text-primary" />}
          rotulo="Média geral"
          valor={
            mediaGeralS && mediaGeralD
              ? `${Math.round(mediaGeralS)}×${Math.round(mediaGeralD)}`
              : "—"
          }
          detalhe={faixa?.rotulo ?? "Sem registros ainda"}
        />
        <CardMetrica
          icone={<Heart className="h-4 w-4 text-destructive" />}
          rotulo="Última pressão"
          valor={ultima ? `${ultima.sistolica}×${ultima.diastolica}` : "—"}
          detalhe={
            ultima
              ? `${ultima.data.split("-").reverse().join("/")} · ${ultima.hora.slice(0, 5)}`
              : "Registre a primeira aferição"
          }
        />
        <CardMetrica
          icone={<CalendarClock className="h-4 w-4 text-accent" />}
          rotulo="Dias restantes"
          valor={String(restantes)}
          detalhe={`${diasCompletos} dia(s) completo(s)`}
        />
        <Link to="/relatorio" className="block">
          <CardMetrica
            icone={<FileText className="h-4 w-4 text-primary" />}
            rotulo="Relatório"
            valor="PDF"
            detalhe="Gerar para o médico"
          />
        </Link>
      </section>

      <section className="card-surface animate-rise p-5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="font-bold">Últimos dias</h2>
        </div>
        {dias.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum registro ainda. Comece pela medição da manhã.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {dias.slice(0, 3).map((d) => (
              <li
                key={d.data}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span className="truncate font-medium">
                  {d.data.split("-").reverse().join("/")}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {d.mediaManha.s ? `☀️ ${Math.round(d.mediaManha.s)}×${Math.round(d.mediaManha.d!)}` : "☀️ —"}
                  {"  "}
                  {d.mediaNoite.s ? `🌙 ${Math.round(d.mediaNoite.s)}×${Math.round(d.mediaNoite.d!)}` : "🌙 —"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
