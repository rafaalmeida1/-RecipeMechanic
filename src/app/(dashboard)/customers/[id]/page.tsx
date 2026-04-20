import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Car, FileText, User } from "lucide-react";
import prisma from "@/lib/db";
import { formatPlateDisplay } from "@/lib/plate";
import { formatCentsBRL } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function CustomerHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      vehicles: {
        orderBy: { label: "asc" },
        include: {
          receipts: {
            where: { status: "FINALIZED" },
            orderBy: { serviceDate: "desc" },
            include: {
              lines: { orderBy: { sortOrder: "asc" }, take: 4 },
            },
          },
        },
      },
    },
  });

  if (!customer) notFound();

  const allReceipts = customer.vehicles
    .flatMap((v) =>
      v.receipts.map((r) => ({
        receipt: r,
        vehicleLabel: v.label,
        plateNormalized: v.plateNormalized,
      })),
    )
    .sort((a, b) => b.receipt.serviceDate.getTime() - a.receipt.serviceDate.getTime());

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Button variant="ghost" className="w-fit gap-2 px-0 text-muted-foreground" asChild>
          <Link href="/search">
            <ArrowLeft className="h-4 w-4" />
            Voltar à pesquisa
          </Link>
        </Button>
      </div>

      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Cliente
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <User className="h-7 w-7" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {customer.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {customer.phone ? (
                <span>Tel: {customer.phone}</span>
              ) : (
                <span>Sem telefone cadastrado</span>
              )}
              {customer.phone && customer.email ? " · " : null}
              {customer.email ? <span>{customer.email}</span> : null}
            </p>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Veículos ({customer.vehicles.length})
        </h2>
        {customer.vehicles.length === 0 ? (
          <Card className="border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum veículo cadastrado para este cliente.
          </Card>
        ) : (
          <div className="space-y-2">
            {customer.vehicles.map((v) => (
              <Card
                key={v.id}
                className="flex items-start gap-3 border-border/80 bg-muted/15 p-4"
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-sm">
                  <Car className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground">{v.label}</div>
                  <div className="font-mono text-sm text-muted-foreground">
                    {formatPlateDisplay(v.plateNormalized)}
                  </div>
                  {v.year ? (
                    <div className="mt-1 text-xs text-muted-foreground">Ano {v.year}</div>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recibos ({allReceipts.length})
        </h2>
        {allReceipts.length === 0 ? (
          <Card className="border-dashed p-6 text-center text-sm text-muted-foreground">
            Ainda não há recibos para este cliente.
          </Card>
        ) : (
          <div className="space-y-3">
            {allReceipts.map(({ receipt: r, vehicleLabel, plateNormalized }) => (
              <Card
                key={r.id}
                className="border-border/80 bg-card/80 p-4 shadow-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <div className="font-medium text-foreground">
                        {vehicleLabel}{" "}
                        <span className="font-normal text-muted-foreground">
                          · {formatPlateDisplay(plateNormalized)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {r.serviceDate.toLocaleDateString("pt-BR")}
                        <span className="ml-2 font-medium text-primary">
                          {formatCentsBRL(r.totalCents)}
                        </span>
                      </div>
                      {r.lines.length > 0 ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {r.lines.map((l) => l.description).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Button className="w-full shrink-0 sm:w-auto" asChild>
                    <Link href={`/receipts/${r.id}`}>Abrir recibo</Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
