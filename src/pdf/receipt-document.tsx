import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import {
  ReceiptLineKind,
  ReceiptPaymentMethod,
  ReceiptPdfTheme,
  type Receipt,
  type ReceiptLine,
  type Vehicle,
  type Customer,
} from "@prisma/client";
import { formatPlateDisplay } from "@/lib/plate";
import { formatCentsBRL } from "@/lib/money";
import {
  cardInstallmentSummaryPt,
  getClientAmountDueCents,
  subtotalsByKind,
} from "@/lib/receipt-totals";
import {
  getReceiptPdfStyles,
  receiptPdfStylesDark,
  receiptPdfStylesLight,
} from "@/pdf/receipt-pdf-styles";

const GOLD = "#FFD700";

function paymentBlockText(
  method: ReceiptPaymentMethod,
  totalCents: number,
  cardInstallmentCount: number | null,
): string {
  if (method === ReceiptPaymentMethod.PIX) return "Forma de pagamento: PIX";
  if (method === ReceiptPaymentMethod.OUTRO) {
    return "Forma de pagamento: (outro)";
  }
  const n = cardInstallmentCount && cardInstallmentCount >= 1 ? cardInstallmentCount : 1;
  if (n <= 1) return "Forma de pagamento: cartão à vista";
  return `Forma de pagamento: ${cardInstallmentSummaryPt(totalCents, n)} (total: ${formatCentsBRL(totalCents)}).`;
}

function PdfCustomerField({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof getReceiptPdfStyles>;
}) {
  return (
    <View style={styles.fieldBlock} wrap={false}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

export type ReceiptPdfProps = {
  business: {
    legalName: string;
    cnpj: string;
    phone: string;
    email: string;
  };
  logoSrc: string | null;
  draftFooterNote?: string | null;
  /** Por recibo; padrão escuro. */
  pdfTheme?: ReceiptPdfTheme;
  receipt: Receipt & {
    lines: ReceiptLine[];
    vehicle: Vehicle & { customer: Customer };
  };
};

export function ReceiptPdfDocument({
  business,
  receipt,
  logoSrc,
  draftFooterNote,
  pdfTheme = "LIGHT",
}: ReceiptPdfProps) {
  const styles = getReceiptPdfStyles(pdfTheme);
  const logo = logoSrc;
  const plate = formatPlateDisplay(receipt.vehicle.plateNormalized);
  const customerName =
    receipt.customerNameSnap ?? receipt.vehicle.customer.name;
  const ref = receipt.id.replace(/[^a-z0-9]/gi, "").slice(-10).toUpperCase();
  const isLight = pdfTheme === "LIGHT";

  const serviceDateStr = receipt.serviceDate.toLocaleDateString("pt-BR");

  const headerBlock = (
    <View style={styles.headerRow}>
      <View style={styles.logoWrap}>
        {logo ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image is not DOM <img>
          <Image style={styles.logo} src={logo} />
        ) : (
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              borderWidth: 2,
              borderColor: GOLD,
              backgroundColor: isLight ? "#27272A" : "#141414",
            }}
          />
        )}
      </View>
      <View style={styles.headerText}>
        <Text style={styles.docKind}>Recibo de serviço</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Razão social:</Text>
          <Text style={styles.metaValue}>{business.legalName}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>CNPJ:</Text>
          <Text style={styles.metaValue}>{business.cnpj}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Telefone:</Text>
          <Text style={styles.metaValue}>{business.phone}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>E-mail:</Text>
          <Text style={styles.metaValue}>{business.email}</Text>
        </View>
        <Text style={styles.refLine}>Ref. documento: {ref}</Text>
      </View>
    </View>
  );

  const customerBlock = (
    <View style={styles.customerInCard}>
      <View style={styles.twoCol}>
        <View style={styles.col}>
          <PdfCustomerField
            label="Cliente"
            value={customerName}
            styles={styles}
          />
          <PdfCustomerField
            label="Veículo"
            value={receipt.vehicle.label.toUpperCase()}
            styles={styles}
          />
          <PdfCustomerField label="Placa" value={plate.toUpperCase()} styles={styles} />
          <PdfCustomerField
            label="Ano"
            value={receipt.vehicle.year ? String(receipt.vehicle.year) : "—"}
            styles={styles}
          />
        </View>
        <View style={styles.col}>
          <PdfCustomerField label="PIX" value={receipt.pixKey} styles={styles} />
          <PdfCustomerField
            label="KM"
            value={receipt.km != null ? String(receipt.km) : "—"}
            styles={styles}
          />
          <PdfCustomerField label="DATA" value={serviceDateStr} styles={styles} />
        </View>
      </View>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {isLight ? (
          <View style={receiptPdfStylesLight.headerCard}>
            <View style={receiptPdfStylesLight.goldBarInCard} />
            <View style={receiptPdfStylesLight.headerInner}>
              {headerBlock}
              {customerBlock}
            </View>
          </View>
        ) : (
          <View style={receiptPdfStylesDark.combinedCard}>
            <View style={receiptPdfStylesDark.goldBarInCard} />
            <View style={receiptPdfStylesDark.combinedCardInner}>
              {headerBlock}
              {customerBlock}
            </View>
          </View>
        )}

        <View style={styles.sectionGoldDivider} />

        {(() => {
          const parts = receipt.lines
            .filter((l) => l.kind === ReceiptLineKind.PRODUCT)
            .sort((a, b) => a.sortOrder - b.sortOrder);
          const services = receipt.lines
            .filter((l) => l.kind === ReceiptLineKind.SERVICE)
            .sort((a, b) => a.sortOrder - b.sortOrder);
          const { productCents, serviceCents } = subtotalsByKind(receipt.lines);
          const showGrand = receipt.showGrandTotalOnPdf !== false;
          const payMethod = receipt.paymentMethod ?? ReceiptPaymentMethod.PIX;
          const hasPartAndService = parts.length > 0 && services.length > 0;
          const partsPrepaid = receipt.clientPaidForParts === true;
          const documentTotalCents = receipt.totalCents;
          const clientDueCents = getClientAmountDueCents(
            partsPrepaid,
            documentTotalCents,
            receipt.lines,
          );
          const showSomaGeral = partsPrepaid && documentTotalCents !== clientDueCents;

          return (
            <>
              {parts.length > 0 ? (
                <View style={styles.lineItemsGroup} wrap={false}>
                  <Text style={styles.clientSectionTitle}>Peças</Text>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.colPartsDesc, styles.tableHeaderText]}>
                      Descrição
                    </Text>
                    <Text style={[styles.colPartsQty, styles.tableHeaderText]}>Qtd</Text>
                    <Text style={[styles.colPartsUnit, styles.tableHeaderText]}>V. unit.</Text>
                    <Text style={[styles.colPartsTot, styles.tableHeaderText]}>V. tot.</Text>
                  </View>
                  {parts.map((line, i) => (
                    <View
                      key={line.id}
                      style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                      wrap={false}
                    >
                      <Text style={[styles.colPartsDesc, styles.tableCell]}>
                        {line.description}
                      </Text>
                      <Text style={[styles.colPartsQty, styles.tableCell]}>{line.qty}</Text>
                      <Text style={[styles.colPartsUnit, styles.tableCell]}>
                        {formatCentsBRL(line.unitCents)}
                      </Text>
                      <Text style={[styles.colPartsTot, styles.tableCell]}>
                        {formatCentsBRL(line.lineTotalCents)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {services.length > 0 ? (
                <View
                  style={
                    parts.length > 0
                      ? [styles.lineItemsGroup, styles.lineItemsGroupSpaced]
                      : styles.lineItemsGroup
                  }
                  wrap={false}
                >
                  <Text style={styles.clientSectionTitle}>Serviço Técnico</Text>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.colServDesc, styles.tableHeaderText]}>Descrição</Text>
                    <Text style={[styles.colServVal, styles.tableHeaderText]}>Valor</Text>
                  </View>
                  {services.map((line, i) => (
                    <View
                      key={line.id}
                      style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                      wrap={false}
                    >
                      <Text style={[styles.colServDesc, styles.tableCell]}>
                        {line.description}
                      </Text>
                      <Text style={[styles.colServVal, styles.tableCell]}>
                        {formatCentsBRL(line.lineTotalCents)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {showGrand ? (
                <View style={styles.grandBlock} wrap={false}>
                  <View style={styles.clientTotalsBlock} wrap={false}>
                    {partsPrepaid ? (
                      <>
                        {productCents > 0 ? (
                          <View style={styles.totalBreakdownRow} wrap={false}>
                            <Text style={styles.totalBreakdownLabel}>
                              Peças (valores informativos — já quitas)
                            </Text>
                            <Text style={styles.totalBreakdownValue}>
                              {formatCentsBRL(productCents)}
                            </Text>
                          </View>
                        ) : null}
                        {serviceCents > 0 ? (
                          <View style={styles.totalBreakdownRow} wrap={false}>
                            <Text style={styles.totalBreakdownLabel}>Mão de obra</Text>
                            <Text style={styles.totalBreakdownValue}>
                              {formatCentsBRL(serviceCents)}
                            </Text>
                          </View>
                        ) : null}
                        {showSomaGeral ? (
                          <View style={styles.totalDocumentGeralRow} wrap={false}>
                            <Text style={styles.totalDocumentGeralText}>
                              Soma geral (todos os itens): {formatCentsBRL(documentTotalCents)}
                            </Text>
                          </View>
                        ) : null}
                        <View
                          style={
                            productCents > 0 || serviceCents > 0
                              ? [styles.totalToPayRow, styles.totalToPayRowGapped]
                              : styles.totalToPayRow
                          }
                          wrap={false}
                        >
                          <Text style={styles.totalToPayLabel}>Total a pagar</Text>
                          <Text style={styles.totalToPayValue}>
                            {formatCentsBRL(clientDueCents)}
                          </Text>
                        </View>
                      </>
                    ) : hasPartAndService ? (
                      <>
                        <View style={styles.totalBreakdownRow} wrap={false}>
                          <Text style={styles.totalBreakdownLabel}>Peças</Text>
                          <Text style={styles.totalBreakdownValue}>
                            {formatCentsBRL(productCents)}
                          </Text>
                        </View>
                        <View style={styles.totalBreakdownRow} wrap={false}>
                          <Text style={styles.totalBreakdownLabel}>Mão de obra</Text>
                          <Text style={styles.totalBreakdownValue}>
                            {formatCentsBRL(serviceCents)}
                          </Text>
                        </View>
                        <View
                          style={[styles.totalToPayRow, styles.totalToPayRowGapped]}
                          wrap={false}
                        >
                          <Text style={styles.totalToPayLabel}>Total</Text>
                          <Text style={styles.totalToPayValue}>
                            {formatCentsBRL(documentTotalCents)}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.totalToPayRow} wrap={false}>
                        <Text style={styles.totalToPayLabel}>Total</Text>
                        <Text style={styles.totalToPayValue}>
                          {formatCentsBRL(documentTotalCents)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.totalPaymentBlock} wrap={false}>
                    <Text style={styles.paymentLine} wrap>
                      {paymentBlockText(
                        payMethod,
                        clientDueCents,
                        receipt.cardInstallmentCount,
                      )}
                    </Text>
                  </View>
                </View>
              ) : null}
            </>
          );
        })()}

        {receipt.receiptNote?.trim() ? (
          <View style={styles.noteBox} wrap={false}>
            <Text style={styles.noteLabel}>Observação</Text>
            <Text style={styles.noteText} wrap>
              {receipt.receiptNote.trim()}
            </Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Documento para controle de serviços prestados. Valores expressos em
            reais (BRL).{"\n"}
            RIBEIROCAR — Obrigado pela preferência.
            {draftFooterNote ? `\n\n${draftFooterNote}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
