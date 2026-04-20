import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function AdminHomePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Administrativo
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Criar recibo
        </h1>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          Passo a passo: placa, dados do carro e cliente, depois peças e valores. O
          rascunho salva sozinho.
        </p>
      </header>

      <Card className="flex flex-col gap-5 border-primary/15 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <FileText className="h-5 w-5 text-primary" aria-hidden />
            Novo recibo
          </div>
          <p className="text-sm text-muted-foreground">
            Leva poucos minutos no celular. Ideal no balcão com o cliente.
          </p>
        </div>
        <Button asChild className="shrink-0 sm:min-w-[180px]">
          <Link href="/receipts/new">Começar agora</Link>
        </Button>
      </Card>

      <Card className="border-border/80">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Search className="h-5 w-5 text-foreground" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="font-semibold text-foreground">Pesquisar antes</h2>
            <p className="text-sm text-muted-foreground">
              Veja histórico e último serviço por placa ou nome antes de montar o
              recibo.
            </p>
            <Button variant="outline" asChild className="mt-2 w-full sm:w-auto">
              <Link href="/search">Abrir pesquisa</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
