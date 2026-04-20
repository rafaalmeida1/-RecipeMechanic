"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouterWithLoading } from "@/components/navigation-progress";
import {
  createReceiptDraft,
  getBusinessProfileSnapshot,
  lookupPlate,
} from "@/server/receipts/actions";
import {
  OFFLINE_SYNC_EVENT,
  enqueueOfflineBundle,
  type OfflineSyncDetail,
} from "@/lib/offline/receipt-sync";
import { writeCachedBusiness } from "@/lib/offline/business-cache";
import { formatPlateDisplay, normalizePlate } from "@/lib/plate";
import { Car, ChevronRight, Hash } from "lucide-react";
import { BrazilianDatePicker } from "@/components/brazilian-date-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function todayLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function NewReceiptWizard({ pixDefault }: { pixDefault: string }) {
  const router = useRouterWithLoading();
  const [clientDraftKey] = useState(() => crypto.randomUUID());
  const [step, setStep] = useState<1 | 2>(1);
  const [plate, setPlate] = useState("");
  const [lookup, setLookup] = useState<Awaited<
    ReturnType<typeof lookupPlate>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [customerName, setCustomerName] = useState("");
  const [vehicleLabel, setVehicleLabel] = useState("");
  const [year, setYear] = useState<string>("");
  const [km, setKm] = useState<string>("");
  const [serviceDate, setServiceDate] = useState(todayLocalISO());
  const [pixKey, setPixKey] = useState(pixDefault);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void getBusinessProfileSnapshot().then((b) => {
        if (b) writeCachedBusiness(b);
      });
    }
  }, []);

  useEffect(() => {
    const onSynced = (e: Event) => {
      const d = (e as CustomEvent<OfflineSyncDetail>).detail;
      if (
        (d.kind === "wizard" || d.kind === "bundle") &&
        d.clientDraftKey === clientDraftKey
      ) {
        router.push(`/receipts/${d.receiptId}`);
      }
    };
    window.addEventListener(OFFLINE_SYNC_EVENT, onSynced);
    return () => window.removeEventListener(OFFLINE_SYNC_EVENT, onSynced);
  }, [clientDraftKey, router]);

  const plateHint = useMemo(() => {
    if (!lookup?.ok) return null;
    return formatPlateDisplay(lookup.normalized);
  }, [lookup]);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-[10px] font-bold text-primary">
            {step}/2
          </span>
          Novo recibo
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {step === 1 ? "Qual é a placa?" : "Dados do atendimento"}
        </h1>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          {step === 1
            ? "Começamos pela placa. Se o carro já veio na oficina, mostramos o cadastro na hora."
            : "Confira nome, carro, quilometragem e PIX. Depois você adiciona peças e valores."}
        </p>
      </header>

      {step === 1 ? (
        <Card className="space-y-4 border-primary/10">
          <div className="space-y-2">
            <Label htmlFor="plate" className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" aria-hidden />
              Placa do veículo
            </Label>
            <Input
              id="plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="Ex.: ABC1D23"
              autoCapitalize="characters"
            />
            <p className="text-xs text-muted-foreground">
              Letras e números; pode digitar com ou sem hífen.
            </p>
          </div>

          {lookup?.ok && lookup.vehicle ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/35 p-4 text-sm text-emerald-50">
              <div className="flex items-center gap-2 font-semibold text-emerald-100">
                <Car className="h-4 w-4" aria-hidden />
                Já temos esse carro cadastrado
              </div>
              <p className="mt-2 text-emerald-100/90">
                {lookup.vehicle.customer.name} · {lookup.vehicle.label} ·{" "}
                <span className="font-mono font-medium">{plateHint}</span>
              </p>
            </div>
          ) : lookup?.ok && !lookup.vehicle ? (
            <div className="rounded-lg border border-amber-500/35 bg-amber-950/40 p-4 text-sm text-amber-50">
              <div className="font-semibold text-amber-100">Primeira vez desta placa</div>
              <p className="mt-2 text-amber-100/85">
                Na próxima etapa você informa cliente e modelo do carro.
              </p>
            </div>
          ) : null}

          {error ? (
            <p
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              className="gap-2"
              loading={pending}
              disabled={pending || plate.trim().length < 5}
              onClick={() => {
                setError(null);
                if (typeof navigator !== "undefined" && !navigator.onLine) {
                  const n = normalizePlate(plate);
                  if (n.length < 5) {
                    setError("Placa inválida (mín. 5 caracteres).");
                    return;
                  }
                  setLookup({ ok: true, normalized: n, vehicle: null });
                  setCustomerName("");
                  setVehicleLabel("");
                  setYear("");
                  setCustomerEmail("");
                  setCustomerPhone("");
                  setStep(2);
                  return;
                }
                startTransition(async () => {
                  const res = await lookupPlate(plate);
                  if (!res.ok) {
                    setError(res.error);
                    return;
                  }
                  setLookup(res);
                  if (res.vehicle) {
                    setCustomerName(res.vehicle.customer.name);
                    setVehicleLabel(res.vehicle.label);
                    setYear(res.vehicle.year ? String(res.vehicle.year) : "");
                    setCustomerEmail(res.vehicle.customer.email ?? "");
                    setCustomerPhone(res.vehicle.customer.phone ?? "");
                  } else {
                    setCustomerName("");
                    setVehicleLabel("");
                    setYear("");
                    setCustomerEmail("");
                    setCustomerPhone("");
                  }
                  setStep(2);
                });
              }}
            >
              Continuar
              {!pending ? <ChevronRight className="h-4 w-4" aria-hidden /> : null}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="space-y-5 border-primary/10">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            <Car className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            Placa{" "}
            <span className="font-mono font-semibold text-foreground">{plateHint}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="customerName">Cliente</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="vehicleLabel">Veículo</Label>
              <Input
                id="vehicleLabel"
                value={vehicleLabel}
                onChange={(e) => setVehicleLabel(e.target.value)}
                placeholder="Ex.: Vectra"
              />
            </div>
            <div>
              <Label htmlFor="year">Ano (opcional)</Label>
              <Input
                id="year"
                inputMode="numeric"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Ex.: 1997"
              />
            </div>
            <div>
              <Label htmlFor="km">KM</Label>
              <Input
                id="km"
                inputMode="numeric"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                placeholder="Ex.: 267473"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceDate">Data do serviço</Label>
              <BrazilianDatePicker
                id="serviceDate"
                value={serviceDate}
                onChange={setServiceDate}
              />
              <p className="text-xs text-muted-foreground">
                Calendário em português. A data no recibo sai no formato brasileiro.
              </p>
            </div>
            <div>
              <Label htmlFor="pixKey">PIX (como aparece no recibo)</Label>
              <Input
                id="pixKey"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Chave PIX"
              />
            </div>
            <div>
              <Label htmlFor="customerEmail">E-mail do cliente (opcional)</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Para enviar o recibo depois"
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Telefone (opcional)</Label>
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="WhatsApp / celular"
              />
            </div>
          </div>

          {error ? (
            <p
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button
              type="button"
              className="gap-2"
              loading={pending}
              disabled={pending}
              onClick={() => {
                setError(null);
                const wizardPayload = {
                  plate,
                  customerName,
                  vehicleLabel,
                  year,
                  km,
                  serviceDate,
                  pixKey,
                  customerEmail,
                  customerPhone,
                };
                if (typeof navigator !== "undefined" && !navigator.onLine) {
                  void enqueueOfflineBundle(clientDraftKey, wizardPayload).then(() => {
                    router.push(`/receipts/offline/${clientDraftKey}`);
                  });
                  return;
                }
                startTransition(async () => {
                  try {
                    const res = await createReceiptDraft({
                      ...wizardPayload,
                      clientDraftKey,
                    });
                    if (!res.ok) {
                      setError(res.error);
                      return;
                    }
                    router.push(`/receipts/${res.receiptId}`);
                  } catch {
                    await enqueueOfflineBundle(clientDraftKey, wizardPayload);
                    router.push(`/receipts/offline/${clientDraftKey}`);
                  }
                });
              }}
            >
              Ir para peças e valores
              {!pending ? <ChevronRight className="h-4 w-4" aria-hidden /> : null}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
