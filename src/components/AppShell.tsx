import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BookOpen,
  CalendarDays,
  FileText,
  Home,
  LineChart,
  LogOut,
  Stethoscope,
  User as UserIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Início", icon: Home },
  { to: "/historico", label: "Histórico", icon: CalendarDays },
  { to: "/graficos", label: "Gráficos", icon: LineChart },
  { to: "/relatorio", label: "Relatório", icon: FileText },
  { to: "/perfil", label: "Perfil", icon: UserIcon },
] as const;

export function AppShell({
  children,
  isMedico = false,
}: {
  children: ReactNode;
  isMedico?: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const itens = isMedico
    ? ([{ to: "/pacientes", label: "Pacientes", icon: Stethoscope }, ...NAV] as const)
    : NAV;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-xl no-print">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-health">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="truncate text-lg font-extrabold tracking-tight">MeuMapa</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/orientacoes">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Como medir</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={sair} aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <nav className="mx-auto hidden max-w-6xl gap-1 px-4 pb-2 md:flex">
          {itens.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                pathname === item.to && "bg-primary-soft text-primary",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 md:pb-12">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-xl md:hidden no-print">
        <div className="mx-auto flex max-w-6xl items-stretch justify-between px-1 py-1">
          {itens.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium text-muted-foreground transition-colors",
                pathname === item.to && "text-primary",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
