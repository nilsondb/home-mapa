import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  BookOpen,
  CalendarCheck,
  FileText,
  LineChart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MeuMapa — mapa residencial da pressão arterial" },
      {
        name: "description",
        content:
          "Substitua o mapa em papel: registre a pressão arterial em casa, com médias automáticas, gráficos e relatório em PDF para o seu médico.",
      },
      { property: "og:title", content: "MeuMapa — mapa residencial da pressão arterial" },
      {
        property: "og:description",
        content:
          "Substitua o mapa em papel: registre a pressão arterial em casa, com médias automáticas, gráficos e relatório em PDF para o seu médico.",
      },
    ],
  }),
  component: Index,
});

const RECURSOS = [
  {
    icone: CalendarCheck,
    titulo: "Protocolo de 7 dias",
    texto: "Manhã e noite, duas aferições por período, com acompanhamento do progresso.",
  },
  {
    icone: Activity,
    titulo: "Média automática",
    texto: "Você nunca digita a média: ela é calculada a partir das suas aferições.",
  },
  {
    icone: LineChart,
    titulo: "Gráficos claros",
    texto: "Sistólica, diastólica e pulso por dia, semana e mês.",
  },
  {
    icone: FileText,
    titulo: "Relatório em PDF",
    texto: "Um documento limpo com todas as aferições, médias e observações.",
  },
  {
    icone: ShieldCheck,
    titulo: "Seus dados protegidos",
    texto: "Cada paciente enxerga apenas o próprio mapa residencial.",
  },
  {
    icone: Sparkles,
    titulo: "Pronto para evoluir",
    texto: "Estrutura preparada para análises inteligentes de tendências no futuro.",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-health">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="truncate text-lg font-extrabold tracking-tight">MeuMapa</span>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/orientacoes">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Como medir</span>
            </Link>
          </Button>
          <Button size="sm" className="rounded-xl" asChild>
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Adeus, formulário em papel
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          O mapa residencial da sua{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            pressão arterial
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
          Registre as medições em casa conforme a orientação do seu médico. O MeuMapa calcula as
          médias, mostra a evolução e gera o relatório da consulta.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" className="rounded-2xl" asChild>
            <Link to="/auth">Começar agora</Link>
          </Button>
          <Button size="lg" variant="outline" className="rounded-2xl" asChild>
            <Link to="/orientacoes">Como medir corretamente</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RECURSOS.map((r) => (
            <article key={r.titulo} className="card-surface animate-rise p-6">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft">
                <r.icone className="h-5 w-5 text-primary" />
              </span>
              <h2 className="mt-4 text-lg font-bold">{r.titulo}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{r.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        MeuMapa organiza suas medições e não substitui a avaliação do seu médico.
      </footer>
    </div>
  );
}
