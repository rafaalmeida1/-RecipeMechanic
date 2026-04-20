import Link from "next/link";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SearchPanel } from "@/components/search-panel";

export default async function MechanicHomePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Oficina
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Pesquisa rápida
        </h1>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          Digite placa, nome ou telefone. Mostramos o último serviço e o histórico do
          veículo.
        </p>
      </header>

      <SearchPanel />

      <Card className="flex flex-col gap-5 border-primary/15 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <FileText className="h-5 w-5 text-primary" aria-hidden />
            Novo recibo
          </div>
          <p className="text-sm text-muted-foreground">
            Atalho para o assistente: placa → dados → peças.
          </p>
        </div>
        <Button asChild className="shrink-0 sm:min-w-[180px]">
          <Link href="/receipts/new">Abrir assistente</Link>
        </Button>
      </Card>
    </div>
  );
}
