import {
  ReceiptPdfTheme,
  ReceiptStatus,
  type Receipt,
  type ReceiptLine,
  type Vehicle,
  type Customer,
} from "@prisma/client";
import { normalizePlate } from "@/lib/plate";
import type { WizardSyncPayload, BundleLine } from "@/lib/offline/outbox";

export type OfflineReceiptForPdf = Receipt & {
  lines: ReceiptLine[];
  vehicle: Vehicle & { customer: Customer };
};

export function buildOfflineReceiptPdfModel(
  wizard: WizardSyncPayload,
  bundleLines: BundleLine[],
  draftKey: string,
): OfflineReceiptForPdf {
  const plate = normalizePlate(wizard.plate);
  const serviceDate = new Date(`${wizard.serviceDate}T12:00:00`);
  const yearParsed =
    wizard.year && wizard.year.trim()
      ? Number.parseInt(wizard.year, 10)
      : null;
  const year =
    yearParsed && Number.isFinite(yearParsed) && yearParsed >= 1950 && yearParsed <= 2035
      ? yearParsed
      : null;
  const kmParsed =
    wizard.km && wizard.km.trim() ? Number.parseInt(wizard.km, 10) : null;
  const km =
    kmParsed && Number.isFinite(kmParsed) && kmParsed >= 0 && kmParsed <= 9999999
      ? kmParsed
      : null;

  const lines: ReceiptLine[] = bundleLines.map((l, i) => {
    const lineTotalCents = l.qty * l.unitCents;
    return {
      id: `offline-line-${i}`,
      receiptId: draftKey,
      kind: l.kind,
      description: l.description,
      qty: l.qty,
      unitCents: l.unitCents,
      lineTotalCents,
      sortOrder: i,
    };
  });

  const totalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);

  const customer: Customer = {
    id: "offline-customer",
    name: wizard.customerName,
    email: wizard.customerEmail || null,
    phone: wizard.customerPhone || null,
    notes: null,
    createdAt: serviceDate,
    updatedAt: serviceDate,
  };

  const vehicle: Vehicle & { customer: Customer } = {
    id: "offline-vehicle",
    plateNormalized: plate,
    label: wizard.vehicleLabel,
    year,
    customerId: customer.id,
    customer,
    createdAt: serviceDate,
    updatedAt: serviceDate,
  };

  const receipt: OfflineReceiptForPdf = {
    id: draftKey,
    importSourceKey: null,
    clientDraftKey: draftKey,
    status: ReceiptStatus.DRAFT,
    vehicleId: vehicle.id,
    km,
    serviceDate,
    pixKey: wizard.pixKey,
    customerNameSnap: wizard.customerName,
    customerEmail: wizard.customerEmail || null,
    customerPhone: wizard.customerPhone || null,
    totalCents,
    finalizedAt: null,
    emailSentAt: null,
    pdfTheme: ReceiptPdfTheme.LIGHT,
    createdAt: serviceDate,
    updatedAt: serviceDate,
    lines,
    vehicle,
  };

  return receipt;
}
