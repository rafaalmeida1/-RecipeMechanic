"use client";

import * as React from "react";
import Link from "next/link";
import type { Role } from "@prisma/client";
import {
  FileText,
  Home,
  Menu,
  Search,
  UserPlus,
  Wrench,
} from "lucide-react";
import { OnlineStatus } from "@/components/online-status";
import { SignOutForm } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

type NavItem = {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

const items: NavItem[] = [
  {
    href: "/admin",
    title: "Início (admin)",
    description: "Atalhos para recibo e pesquisa",
    icon: <Home className="h-5 w-5" />,
    adminOnly: true,
  },
  {
    href: "/mechanic",
    title: "Início (oficina)",
    description: "Busca rápida de clientes",
    icon: <Home className="h-5 w-5" />,
    adminOnly: false,
  },
  {
    href: "/receipts/new",
    title: "Novo recibo",
    description: "Placa, dados e peças — passo a passo",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    href: "/search",
    title: "Pesquisar",
    description: "Placa, nome ou telefone",
    icon: <Search className="h-5 w-5" />,
  },
  {
    href: "/invites",
    title: "Convidar equipe",
    description: "Link para novo usuário (admin)",
    icon: <UserPlus className="h-5 w-5" />,
    adminOnly: true,
  },
];

function homeHref(role: Role) {
  return role === "ADMIN" ? "/admin" : "/mechanic";
}

export function NavBar({ role }: { role: Role }) {
  const [open, setOpen] = React.useState(false);
  /** Evita mismatch de aria-controls (Radix Dialog) entre SSR e cliente. */
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const home = homeHref(role);

  const visible = items.filter((item) => {
    if (item.adminOnly === true && role !== "ADMIN") return false;
    if (item.adminOnly === false && role === "ADMIN") return false;
    return true;
  });

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <OnlineStatus />
          <Link
            href={home}
            className="flex min-w-0 flex-1 items-center gap-2 font-bold tracking-tight text-foreground"
          >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-inner">
            <Wrench className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-sm leading-tight sm:text-base">
            RIBEIROCAR
            <span className="block text-[10px] font-normal text-muted-foreground sm:text-xs">
              Recibos
            </span>
          </span>
        </Link>
        </div>

        {mounted ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 border-border/80 bg-muted/20"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-0 overflow-y-auto">
              <SheetHeader className="border-b border-border/60 pb-4 text-left">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Wrench className="h-5 w-5" />
                  </span>
                  Menu
                </SheetTitle>
                <p className="text-left text-sm text-muted-foreground">
                  Toque em uma opção. Tudo em poucos passos.
                </p>
              </SheetHeader>

              <nav className="flex flex-1 flex-col gap-1 py-4">
                {visible.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className="flex gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                    >
                      <span className="mt-0.5 text-primary">{item.icon}</span>
                      <span>
                        <span className="block font-medium text-foreground">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  </SheetClose>
                ))}
              </nav>

              <Separator className="bg-border/80" />

              <div className="py-4">
                <SignOutForm />
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 border-border/80 bg-muted/20"
            aria-label="Abrir menu"
            disabled
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </div>
    </header>
  );
}
