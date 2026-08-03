import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Clock, Moon, Ruler, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/orientacoes")({
  head: () => ({
    meta: [
      { title: "Como medir corretamente a pressão em casa — MeuMapa" },
      {
        name: "description",
        content:
          "Orientações para a medição residencial da pressão arterial: preparo, horários recomendados, tempo de acompanhamento e interpretação prática.",
      },
      { property: "og:title", content: "Como medir corretamente a pressão em casa — MeuMapa" },
      {
        property: "og:description",
        content: "Preparo, horários, duração do acompanhamento e interpretação prática.",
      },
    ],
  }),
  component: Orientacoes,
});

function Bloco({
  icone,
  titulo,
  children,
}: {
  icone: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-surface animate-rise p-6">
      <div className="flex items-center gap-2">
        {icone}
        <h2 className="text-lg font-extrabold">{titulo}</h2>
      </div>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function Orientacoes() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </Button>

      <h1 className="text-3xl font-extrabold tracking-tight">Como medir corretamente</h1>

      <Bloco icone={<Ruler className="h-5 w-5 text-primary" />} titulo="Preparo e técnica">
        <ul className="space-y-2">
          <li>• Utilize aparelho digital de braço validado com braçadeira adequada.</li>
          <li>• Descanse por pelo menos cinco minutos antes da medição.</li>
          <li>• Sente-se com as costas apoiadas.</li>
          <li>• Apoie os pés no chão.</li>
          <li>• Mantenha as pernas descruzadas.</li>
          <li>• Não converse durante a aferição.</li>
          <li>• Faça duas aferições com intervalo aproximado de um minuto.</li>
          <li>• Registre as duas medições.</li>
        </ul>
      </Bloco>

      <Bloco icone={<Clock className="h-5 w-5 text-primary" />} titulo="Horário recomendado">
        <div className="rounded-2xl bg-secondary/60 p-4">
          <p className="flex items-center gap-2 font-bold text-foreground">
            <Sun className="h-4 w-4 text-morning" /> Manhã
          </p>
          <ul className="mt-2 space-y-1">
            <li>• Realizar dentro de aproximadamente uma hora após acordar.</li>
            <li>• Após urinar.</li>
            <li>• Antes do café da manhã.</li>
            <li>• Antes dos medicamentos para pressão, quando houver.</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-secondary/60 p-4">
          <p className="flex items-center gap-2 font-bold text-foreground">
            <Moon className="h-4 w-4 text-night" /> Noite
          </p>
          <ul className="mt-2 space-y-1">
            <li>• Antes de dormir.</li>
            <li>• Em repouso.</li>
            <li>• Evitando medir logo após exercício físico.</li>
            <li>• Evitando medir logo após café.</li>
            <li>• Evitando medir logo após bebida alcoólica.</li>
            <li>• Evitando medir logo após fumar.</li>
          </ul>
        </div>
      </Bloco>

      <Bloco icone={<Clock className="h-5 w-5 text-primary" />} titulo="Tempo de acompanhamento">
        <p>
          <strong className="text-foreground">Ideal:</strong> 7 dias consecutivos.
        </p>
        <p>
          <strong className="text-foreground">Mínimo aceitável:</strong> 5 dias.
        </p>
      </Bloco>

      <Bloco
        icone={<AlertTriangle className="h-5 w-5 text-warning" />}
        titulo="Interpretação prática"
      >
        <p>
          Em geral, média residencial inferior a 135 × 85 mmHg costuma estar dentro da faixa
          desejável para muitos adultos.
        </p>
        <p>Valores persistentemente acima dessa faixa devem ser discutidos com o médico.</p>
        <p className="rounded-2xl bg-destructive/10 p-4 font-medium text-foreground">
          Caso exista pressão muito elevada acompanhada de dor no peito, falta de ar, fraqueza
          importante ou dor de cabeça intensa, procure atendimento médico imediatamente.
        </p>
      </Bloco>
    </div>
  );
}
