"use client";

import { pdf } from "@react-pdf/renderer";
import React from "react";
import { ReceiptPdfDocument } from "@/pdf/receipt-document";
import { buildOfflineReceiptPdfModel } from "@/lib/pdf/build-offline-receipt-model";
import type { BusinessProfileSnapshot } from "@/lib/offline/business-cache";
import type { WizardSyncPayload, BundleLine } from "@/lib/offline/outbox";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchLogoDataUriFromPublic(): Promise<string | null> {
  try {
    const res = await fetch("/logo/logo_ribeirocar.png", { cache: "force-cache" });
    if (!res.ok) {
      const alt = await fetch("/logo/ribeirocar.png", { cache: "force-cache" });
      if (!alt.ok) return null;
      const buf = await alt.arrayBuffer();
      return `data:image/png;base64,${arrayBufferToBase64(buf)}`;
    }
    const buf = await res.arrayBuffer();
    return `data:image/png;base64,${arrayBufferToBase64(buf)}`;
  } catch {
    return null;
  }
}

const FALLBACK_BUSINESS: BusinessProfileSnapshot = {
  legalName: "RIBEIROCAR",
  cnpj: "—",
  phone: "—",
  email: "—",
};

export async function downloadOfflineReceiptPdf(params: {
  wizard: WizardSyncPayload;
  bundleLines: BundleLine[];
  draftKey: string;
  cachedBusiness: BusinessProfileSnapshot | null;
}): Promise<void> {
  const { wizard, bundleLines, draftKey, cachedBusiness } = params;
  const business = cachedBusiness ?? FALLBACK_BUSINESS;
  const receipt = buildOfflineReceiptPdfModel(wizard, bundleLines, draftKey);
  const logoSrc = await fetchLogoDataUriFromPublic();

  const doc = React.createElement(ReceiptPdfDocument, {
    business,
    logoSrc,
    draftFooterNote:
      "Rascunho gerado neste aparelho. Pendente de sincronização com o servidor.",
    receipt,
  });

  const blob = await pdf(doc as Parameters<typeof pdf>[0]).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `recibo-rascunho-${draftKey.slice(0, 8)}.pdf`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
