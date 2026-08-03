export type Periodo = "manha" | "noite";
export type Braco = "direito" | "esquerdo";

export type Medicao = {
  id: string;
  user_id: string;
  protocolo_id: string | null;
  data: string;
  hora: string;
  periodo: Periodo;
  ordem: number;
  sistolica: number;
  diastolica: number;
  pulso: number | null;
  braco: Braco;
  observacao: string | null;
  created_at: string;
};

export type MediaPeriodo = {
  id: string;
  user_id: string;
  data: string;
  periodo: Periodo;
  media_sistolica: number;
  media_diastolica: number;
  media_pulso: number | null;
  qtd_afericoes: number;
};

export type Protocolo = {
  id: string;
  user_id: string;
  data_inicio: string;
  duracao_dias: number;
  minimo_dias: number;
  status: string;
  observacoes: string | null;
};

export type Profile = {
  id: string;
  nome: string;
  email: string | null;
  data_nascimento: string | null;
  sexo: "masculino" | "feminino" | "outro" | "nao_informado";
  peso_kg: number | null;
  altura_cm: number | null;
  telefone: string | null;
  foto_url: string | null;
};

export const PERIODO_LABEL: Record<Periodo, string> = {
  manha: "Manhã",
  noite: "Noite",
};

/** Data local no formato YYYY-MM-DD (evita deslocamento de fuso do toISOString). */
export function hojeISO(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatarData(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function saudacao(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function diffDias(inicioISO: string, fimISO: string): number {
  const a = new Date(`${inicioISO}T00:00:00`);
  const b = new Date(`${fimISO}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function addDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return hojeISO(d);
}

/**
 * Classificação apenas informativa da média residencial (referência 135x85).
 * Não substitui avaliação médica.
 */
export type Faixa = { chave: "desejavel" | "limitrofe" | "elevada"; rotulo: string };

export function classificarMediaResidencial(sis: number, dia: number): Faixa {
  if (sis < 135 && dia < 85) return { chave: "desejavel", rotulo: "Dentro da faixa desejável" };
  if (sis < 145 && dia < 90) return { chave: "limitrofe", rotulo: "Levemente acima da faixa" };
  return { chave: "elevada", rotulo: "Acima da faixa desejável" };
}

export function media(nums: Array<number | null | undefined>): number | null {
  const vals = nums.filter((n): n is number => typeof n === "number" && !Number.isNaN(n));
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export type DiaAgrupado = {
  data: string;
  manha: Medicao[];
  noite: Medicao[];
  mediaManha: { s: number | null; d: number | null; p: number | null };
  mediaNoite: { s: number | null; d: number | null; p: number | null };
  completo: boolean;
  parcial: boolean;
};

export function agruparPorDia(medicoes: Medicao[]): DiaAgrupado[] {
  const mapa = new Map<string, Medicao[]>();
  for (const m of medicoes) {
    const lista = mapa.get(m.data) ?? [];
    lista.push(m);
    mapa.set(m.data, lista);
  }
  return [...mapa.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([data, itens]) => {
      const manha = itens
        .filter((i) => i.periodo === "manha")
        .sort((a, b) => a.ordem - b.ordem);
      const noite = itens
        .filter((i) => i.periodo === "noite")
        .sort((a, b) => a.ordem - b.ordem);
      return {
        data,
        manha,
        noite,
        mediaManha: {
          s: media(manha.map((m) => m.sistolica)),
          d: media(manha.map((m) => m.diastolica)),
          p: media(manha.map((m) => m.pulso)),
        },
        mediaNoite: {
          s: media(noite.map((m) => m.sistolica)),
          d: media(noite.map((m) => m.diastolica)),
          p: media(noite.map((m) => m.pulso)),
        },
        completo: manha.length >= 2 && noite.length >= 2,
        parcial: itens.length > 0 && !(manha.length >= 2 && noite.length >= 2),
      };
    });
}
