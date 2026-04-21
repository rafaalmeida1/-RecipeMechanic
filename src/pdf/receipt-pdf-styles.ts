import { StyleSheet } from "@react-pdf/renderer";
import type { ReceiptPdfTheme } from "@prisma/client";

const GOLD = "#FFD700";
const BLACK = "#000000";
const WHITE = "#FFFFFF";
const MUTED_DARK = "#9CA3AF";
const LINE_DARK = "#3F3F46";

/** Estilos do tema escuro (original). */
export const receiptPdfStylesDark = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: WHITE,
    backgroundColor: BLACK,
  },
  /** Faixa dourada no topo do card unificado (oficina + cliente). */
  goldBarInCard: {
    height: 3,
    width: "100%",
    backgroundColor: GOLD,
    marginBottom: 0,
  },
  combinedCard: {
    borderWidth: 1,
    borderColor: LINE_DARK,
    borderRadius: 8,
    marginBottom: 18,
    overflow: "hidden",
  },
  combinedCardInner: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 0,
  },
  logoWrap: { width: 88, marginRight: 14 },
  logo: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2,
    borderColor: GOLD,
  },
  headerText: { flexGrow: 1, paddingTop: 2 },
  docKind: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: MUTED_DARK,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 5,
    alignItems: "flex-start",
  },
  metaLabel: {
    width: "26%",
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: GOLD,
  },
  metaValue: {
    width: "74%",
    fontSize: 9,
    color: WHITE,
  },
  refLine: { marginTop: 8, fontSize: 8, color: MUTED_DARK },
  /** Cliente/veículo dentro do mesmo card escuro da oficina. */
  customerInCard: {
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: LINE_DARK,
  },
  sectionGoldDivider: {
    height: 3,
    width: "100%",
    backgroundColor: GOLD,
    marginTop: 0,
    marginBottom: 12,
  },
  twoCol: { flexDirection: "row" },
  col: { flexGrow: 1, width: "48%" },
  fieldBlock: { marginBottom: 8 },
  fieldLabel: {
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textTransform: "uppercase",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  fieldValue: {
    color: WHITE,
    fontSize: 10,
    lineHeight: 1.35,
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
  tableHeaderText: { color: BLACK },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE_DARK,
    paddingVertical: 7,
    paddingHorizontal: 8,
    minHeight: 26,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE_DARK,
    paddingVertical: 7,
    paddingHorizontal: 8,
    minHeight: 26,
    backgroundColor: "#0C0C0C",
  },
  tableCell: { color: WHITE },
  colKind: { width: "11%", textAlign: "center" },
  colPart: { width: "33%" },
  colQty: { width: "9%", textAlign: "center" },
  colUnit: { width: "22%", textAlign: "right" },
  colTot: { width: "25%", textAlign: "right" },
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
    borderTopColor: LINE_DARK,
  },
  footerText: {
    fontSize: 8,
    color: MUTED_DARK,
    textAlign: "center",
    lineHeight: 1.4,
  },
});

const STONE_50 = "#FAFAF9";
const STONE_200 = "#E7E5E4";
const STONE_500 = "#78716C";
const STONE_800 = "#292524";
const STONE_900 = "#1C1917";
const AMBER_800 = "#92400E";
const HEADER_BG = "#18181B";

/** Tema claro: cabeçalho escuro, corpo tipo recibo em papel. */
export const receiptPdfStylesLight = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 40,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: STONE_900,
    backgroundColor: "#F5F5F4",
  },
  headerCard: {
    backgroundColor: HEADER_BG,
    borderRadius: 8,
    marginBottom: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#27272A",
  },
  goldBarInCard: {
    height: 3,
    width: "100%",
    backgroundColor: GOLD,
    marginBottom: 0,
  },
  headerInner: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 0,
  },
  logoWrap: { width: 88, marginRight: 14 },
  logo: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2,
    borderColor: GOLD,
  },
  headerText: { flexGrow: 1, paddingTop: 2 },
  docKind: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: "#A1A1AA",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 5,
    alignItems: "flex-start",
  },
  metaLabel: {
    width: "26%",
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: GOLD,
  },
  metaValue: {
    width: "74%",
    fontSize: 9,
    color: WHITE,
  },
  refLine: { marginTop: 8, fontSize: 8, color: "#A1A1AA" },
  customerInCard: {
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#3F3F46",
  },
  sectionGoldDivider: {
    height: 3,
    width: "100%",
    backgroundColor: GOLD,
    marginTop: 0,
    marginBottom: 12,
  },
  twoCol: { flexDirection: "row" },
  col: { flexGrow: 1, width: "48%" },
  fieldBlock: { marginBottom: 8 },
  fieldLabel: {
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textTransform: "uppercase",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  fieldValue: {
    color: WHITE,
    fontSize: 10,
    lineHeight: 1.35,
  },
  tableTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: STONE_800,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: GOLD,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  tableHeaderText: { color: STONE_900 },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: STONE_200,
    paddingVertical: 7,
    paddingHorizontal: 8,
    minHeight: 26,
    backgroundColor: WHITE,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: STONE_200,
    paddingVertical: 7,
    paddingHorizontal: 8,
    minHeight: 26,
    backgroundColor: STONE_50,
  },
  tableCell: { color: STONE_900 },
  colKind: { width: "11%", textAlign: "center" },
  colPart: { width: "33%" },
  colQty: { width: "9%", textAlign: "center" },
  colUnit: { width: "22%", textAlign: "right" },
  colTot: { width: "25%", textAlign: "right" },
  totals: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: STONE_200,
    alignItems: "flex-end",
  },
  totalLine: {
    color: AMBER_800,
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
  },
  footer: {
    marginTop: 28,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: STONE_200,
  },
  footerText: {
    fontSize: 8,
    color: STONE_500,
    textAlign: "center",
    lineHeight: 1.45,
  },
});

export type ReceiptPdfStyleSheet =
  | typeof receiptPdfStylesDark
  | typeof receiptPdfStylesLight;

export function getReceiptPdfStyles(theme: ReceiptPdfTheme): ReceiptPdfStyleSheet {
  return theme === "LIGHT" ? receiptPdfStylesLight : receiptPdfStylesDark;
}
