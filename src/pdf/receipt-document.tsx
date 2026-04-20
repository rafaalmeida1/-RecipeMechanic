import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import type { Receipt, ReceiptLine, Vehicle, Customer } from "@prisma/client";
import { formatPlateDisplay } from "@/lib/plate";
import { formatCentsBRL } from "@/lib/money";

const GOLD = "#FFD700";
const BLACK = "#000000";
const WHITE = "#FFFFFF";
const MUTED = "#9CA3AF";
const LINE = "#3F3F46";

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: WHITE,
    backgroundColor: BLACK,
  },
  goldBar: {
    height: 3,
    width: "100%",
    backgroundColor: GOLD,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  logoWrap: {
    width: 88,
    marginRight: 14,
  },
  logo: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2,
    borderColor: GOLD,
  },
  headerText: {
    flexGrow: 1,
    paddingTop: 2,
  },
  brand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    letterSpacing: 2,
    color: GOLD,
    marginBottom: 2,
  },
  docKind: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: MUTED,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  metaLine: {
    marginBottom: 3,
    color: WHITE,
    fontSize: 9,
  },
  refLine: {
    marginTop: 6,
    fontSize: 8,
    color: MUTED,
  },
  section: {
    borderWidth: 1.5,
    borderColor: WHITE,
    borderRadius: 6,
    padding: 14,
    marginBottom: 16,
  },
  twoCol: { flexDirection: "row" },
  col: { flexGrow: 1, width: "48%" },
  label: {
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textTransform: "uppercase",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  value: {
    color: WHITE,
    marginBottom: 8,
    fontSize: 10,
  },
  tableTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: GOLD,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: GOLD,
    color: BLACK,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 7,
    paddingHorizontal: 8,
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 7,
    paddingHorizontal: 8,
    minHeight: 26,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 7,
    paddingHorizontal: 8,
    minHeight: 26,
    backgroundColor: "#0C0C0C",
  },
  colPart: { width: "44%" },
  colQty: { width: "10%", textAlign: "center" },
  colUnit: { width: "23%", textAlign: "right" },
  colTot: { width: "23%", textAlign: "right" },
  totals: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: GOLD,
    alignItems: "flex-end",
  },
  totalLine: {
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
  },
  footer: {
    marginTop: 28,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  footerText: {
    fontSize: 8,
    color: MUTED,
    textAlign: "center",
    lineHeight: 1.4,
  },
});

/** Logo do recibo: prioriza `public/logo/logo_ribeirocar.png`. */
function loadLogoDataUri(): string | null {
  const candidates = [
    path.join(process.cwd(), "public", "logo", "logo_ribeirocar.png"),
    path.join(process.cwd(), "public", "logo", "ribeirocar.png"),
    path.join(process.cwd(), "logo_ribeirocar.png"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const b = fs.readFileSync(p);
      return `data:image/png;base64,${b.toString("base64")}`;
    }
  }
  return null;
}

export type ReceiptPdfProps = {
  business: {
    legalName: string;
    cnpj: string;
    phone: string;
    email: string;
  };
  receipt: Receipt & {
    lines: ReceiptLine[];
    vehicle: Vehicle & { customer: Customer };
  };
};

export function ReceiptPdfDocument({ business, receipt }: ReceiptPdfProps) {
  const logo = loadLogoDataUri();
  const plate = formatPlateDisplay(receipt.vehicle.plateNormalized);
  const customerName =
    receipt.customerNameSnap ?? receipt.vehicle.customer.name;
  const ref = receipt.id.replace(/[^a-z0-9]/gi, "").slice(-10).toUpperCase();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.goldBar} />

        <View style={styles.headerRow}>
          <View style={styles.logoWrap}>
            {logo ? (
              <Image style={styles.logo} src={logo} />
            ) : (
              <View
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: 41,
                  borderWidth: 2,
                  borderColor: GOLD,
                  backgroundColor: "#141414",
                }}
              />
            )}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.brand}>RIBEIROCAR</Text>
            <Text style={styles.docKind}>Recibo de serviço</Text>
            <Text style={styles.metaLine}>Razão social: {business.legalName}</Text>
            <Text style={styles.metaLine}>CNPJ: {business.cnpj}</Text>
            <Text style={styles.metaLine}>Telefone: {business.phone}</Text>
            <Text style={styles.metaLine}>E-mail: {business.email}</Text>
            <Text style={styles.refLine}>Ref. documento: {ref}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.label}>Cliente</Text>
              <Text style={styles.value}>{customerName}</Text>
              <Text style={styles.label}>Veículo</Text>
              <Text style={styles.value}>{receipt.vehicle.label}</Text>
              <Text style={styles.label}>Placa</Text>
              <Text style={styles.value}>{plate}</Text>
              <Text style={styles.label}>Ano</Text>
              <Text style={styles.value}>
                {receipt.vehicle.year ? String(receipt.vehicle.year) : "—"}
              </Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>PIX</Text>
              <Text style={styles.value}>{receipt.pixKey}</Text>
              <Text style={styles.label}>KM</Text>
              <Text style={styles.value}>
                {receipt.km != null ? String(receipt.km) : "—"}
              </Text>
              <Text style={styles.label}>Data do serviço</Text>
              <Text style={styles.value}>
                {receipt.serviceDate.toLocaleDateString("pt-BR")}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.tableTitle}>Peças e serviços</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.colPart}>Descrição</Text>
          <Text style={styles.colQty}>Qtd</Text>
          <Text style={styles.colUnit}>Valor unit.</Text>
          <Text style={styles.colTot}>Valor total</Text>
        </View>
        {receipt.lines.map((line, i) => (
          <View
            key={line.id}
            style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
            wrap={false}
          >
            <Text style={styles.colPart}>{line.description}</Text>
            <Text style={styles.colQty}>{line.qty}</Text>
            <Text style={styles.colUnit}>{formatCentsBRL(line.unitCents)}</Text>
            <Text style={styles.colTot}>{formatCentsBRL(line.lineTotalCents)}</Text>
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
          </Text>
        </View>
      </Page>
    </Document>
  );
}
