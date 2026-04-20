import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { ReceiptPdfDocument, type ReceiptPdfProps } from "@/pdf/receipt-document";
import { loadLogoDataUriServer } from "@/pdf/load-logo-server";

export async function renderFinalizedReceiptPdfBuffer(
  receipt: ReceiptPdfProps["receipt"],
  business: ReceiptPdfProps["business"],
): Promise<Buffer> {
  const doc = React.createElement(ReceiptPdfDocument, {
    business,
    logoSrc: loadLogoDataUriServer(),
    receipt,
  });
  return renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
}
