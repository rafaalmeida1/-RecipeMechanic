import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import {
  ReceiptLineKind,
  ReceiptPdfTheme,
  type Receipt,
  type ReceiptLine,
  type Vehicle,
  type Customer,
} from "@prisma/client";
import { formatPlateDisplay } from "@/lib/plate";
import { formatCentsBRL } from "@/lib/money";
import {
  getReceiptPdfStyles,
  receiptPdfStylesDark,
  receiptPdfStylesLight,
} from "@/pdf/receipt-pdf-styles";

const GOLD = "#FFD700";

function lineKindLabel(kind: ReceiptLineKind): string {
  return kind === ReceiptLineKind.SERVICE ? "Serviço" : "Peça";
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
              width: 82,
              height: 82,
              borderRadius: 41,
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

        <Text style={styles.tableTitle}>Peças e serviços</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.colKind, styles.tableHeaderText]}>Tipo</Text>
          <Text style={[styles.colPart, styles.tableHeaderText]}>Descrição</Text>
          <Text style={[styles.colQty, styles.tableHeaderText]}>Qtd</Text>
          <Text style={[styles.colUnit, styles.tableHeaderText]}>Valor unit.</Text>
          <Text style={[styles.colTot, styles.tableHeaderText]}>Valor total</Text>
        </View>
        {receipt.lines.map((line, i) => (
          <View
            key={line.id}
            style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
            wrap={false}
          >
            <Text style={[styles.colKind, styles.tableCell]}>
              {lineKindLabel(line.kind)}
            </Text>
            <Text style={[styles.colPart, styles.tableCell]}>{line.description}</Text>
            <Text style={[styles.colQty, styles.tableCell]}>{line.qty}</Text>
            <Text style={[styles.colUnit, styles.tableCell]}>
              {formatCentsBRL(line.unitCents)}
            </Text>
            <Text style={[styles.colTot, styles.tableCell]}>
              {formatCentsBRL(line.lineTotalCents)}
            </Text>
          </View>
        ))}

        <View style={styles.totals}>
          <Text style={styles.totalLine}>
            Total geral: {formatCentsBRL(receipt.totalCents)}
          </Text>
        </View>

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
