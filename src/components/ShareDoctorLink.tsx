import { useState } from "react";
import { Copy, Link2, Loader2, Share2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";

type SharedLink = { token: string; expires_at: string };

export function ShareDoctorLink({ protocoloId }: { protocoloId?: string | null }) {
  const [open, setOpen] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [link, setLink] = useState<SharedLink | null>(null);

  const url = link
    ? `${typeof window === "undefined" ? "" : window.location.origin}/shared/${link.token}`
    : "";

  async function gerar() {
    setCarregando(true);
    const { data, error } = await supabase.rpc("create_shared_link", {
      _dias: 30,
      ...(protocoloId ? { _protocolo_id: protocoloId } : {}),
    });
    setCarregando(false);
    if (error || !data) {
      toast.error("Não foi possível gerar o link.");
      return;
    }
    const row = (Array.isArray(data) ? data[0] : data) as SharedLink;
    setLink(row);
    toast.success("Link criado. Válido por 30 dias.");
  }

  async function revogar() {
    if (!link) return;
    setCarregando(true);
    const { error } = await supabase.rpc("revoke_shared_link", { _token: link.token });
    setCarregando(false);
    if (error) {
      toast.error("Não foi possível revogar o link.");
      return;
    }
    setLink(null);
    toast.success("Link revogado.");
  }

  async function copiar() {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado.");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="w-full rounded-2xl">
          <Share2 className="h-5 w-5" />
          Compartilhar com meu médico
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link para o médico</DialogTitle>
          <DialogDescription>
            Gera um endereço seguro e somente leitura com seu mapa residencial. Você pode
            revogar quando quiser.
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input readOnly value={url} className="text-xs" />
              <Button type="button" variant="secondary" size="icon" onClick={copiar}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Expira em {new Date(link.expires_at).toLocaleDateString("pt-BR")}.
            </p>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-destructive"
              onClick={revogar}
              disabled={carregando}
            >
              <ShieldOff className="h-4 w-4" />
              Revogar link
            </Button>
          </div>
        ) : (
          <Button type="button" onClick={gerar} disabled={carregando} className="w-full">
            {carregando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            Gerar link seguro
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
