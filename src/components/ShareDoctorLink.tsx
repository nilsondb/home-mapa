import { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  MessageCircle,
  Share2,
  Stethoscope,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type PeriodType =
  | "last_7_days"
  | "last_30_days"
  | "all_history";

interface GeneratedLink {
  id: string;
  token: string;
  path: string;
  period_type: PeriodType;
  start_date: string | null;
  end_date: string | null;
  expires_at: string | null;
}

export function ShareDoctorLink() {
  const [open, setOpen] = useState(false);
  const [periodType, setPeriodType] =
    useState<PeriodType>("last_7_days");
  const [validityDays, setValidityDays] = useState("7");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generated, setGenerated] =
    useState<GeneratedLink | null>(null);

  const fullUrl =
    generated && typeof window !== "undefined"
      ? `${window.location.origin}${generated.path}`
      : "";

  async function generateLink() {
    try {
      setLoading(true);
      setCopied(false);

      const days =
        validityDays === "permanent"
          ? 0
          : Number(validityDays);

      const { data, error } = await (
        supabase as any
      ).rpc("create_shared_link", {
        p_period_type: periodType,
        p_validity_days: days,
        p_start_date: null,
        p_end_date: null,
      });

      if (error) {
        throw error;
      }

      setGenerated(data as GeneratedLink);

      toast.success("Link médico criado com sucesso.");
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o link."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!fullUrl) return;

    await navigator.clipboard.writeText(fullUrl);

    setCopied(true);
    toast.success("Link copiado.");

    window.setTimeout(() => {
      setCopied(false);
    }, 2500);
  }

  async function shareLink() {
    if (!fullUrl) return;

    const shareData = {
      title: "MeuMapa — acompanhamento da pressão arterial",
      text:
        "Acesse meu acompanhamento residencial da pressão arterial:",
      url: fullUrl,
    };

    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await copyLink();
  }

  function shareWhatsApp() {
    if (!fullUrl) return;

    const message = [
      "Olá, doutor(a).",
      "",
      "Estou compartilhando meu acompanhamento residencial da pressão arterial pelo MeuMapa.",
      "",
      fullUrl,
    ].join("\n");

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function closeDialog() {
    setOpen(false);

    window.setTimeout(() => {
      setGenerated(null);
      setCopied(false);
    }, 250);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          closeDialog();
          return;
        }

        setOpen(true);
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Stethoscope className="h-4 w-4" />
          Compartilhar com meu médico
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartilhar acompanhamento
          </DialogTitle>

          <DialogDescription>
            Gere um link seguro e somente leitura para seu
            médico acompanhar suas aferições.
          </DialogDescription>
        </DialogHeader>

        {!generated ? (
          <div className="space-y-6 py-2">
            <div className="space-y-3">
              <Label>Período compartilhado</Label>

              <div className="grid gap-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 hover:bg-muted/50">
                  <input
                    type="radio"
                    name="period"
                    value="last_7_days"
                    checked={periodType === "last_7_days"}
                    onChange={() =>
                      setPeriodType("last_7_days")
                    }
                  />

                  <div>
                    <div className="font-medium">
                      Últimos 7 dias
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Ideal para acompanhamento semanal.
                    </div>
                  </div>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 hover:bg-muted/50">
                  <input
                    type="radio"
                    name="period"
                    value="last_30_days"
                    checked={periodType === "last_30_days"}
                    onChange={() =>
                      setPeriodType("last_30_days")
                    }
                  />

                  <div>
                    <div className="font-medium">
                      Últimos 30 dias
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Visão mensal do acompanhamento.
                    </div>
                  </div>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 hover:bg-muted/50">
                  <input
                    type="radio"
                    name="period"
                    value="all_history"
                    checked={periodType === "all_history"}
                    onChange={() =>
                      setPeriodType("all_history")
                    }
                  />

                  <div>
                    <div className="font-medium">
                      Todo o histórico
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Compartilha todas as aferições registradas.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="validity">
                Validade do link
              </Label>

              <select
                id="validity"
                value={validityDays}
                onChange={(event) =>
                  setValidityDays(event.target.value)
                }
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="7">7 dias</option>
                <option value="30">30 dias</option>
                <option value="90">90 dias</option>
                <option value="permanent">
                  Sem expiração
                </option>
              </select>
            </div>

            <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
              O médico poderá apenas visualizar o período
              escolhido. Ele não poderá editar suas aferições,
              acessar sua conta ou consultar outros dados.
            </div>

            <Button
              className="w-full gap-2"
              onClick={generateLink}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando link...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Gerar link seguro
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="rounded-xl border bg-muted/40 p-4">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <Check className="h-4 w-4 text-emerald-600" />
                Link criado com sucesso
              </div>

              <div className="break-all rounded-lg bg-background p-3 text-sm">
                {fullUrl}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={copyLink}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}

                {copied ? "Copiado" : "Copiar link"}
              </Button>

              <Button
                variant="outline"
                className="gap-2"
                onClick={shareLink}
              >
                <Share2 className="h-4 w-4" />
                Compartilhar
              </Button>

              <Button
                variant="outline"
                className="gap-2"
                onClick={shareWhatsApp}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>

              <Button
                variant="outline"
                className="gap-2"
                onClick={() =>
                  window.open(
                    fullUrl,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                <ExternalLink className="h-4 w-4" />
                Visualizar
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Guarde este link. Por segurança, o token original
              não fica armazenado no banco.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
