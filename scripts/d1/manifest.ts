import { foldForSearch } from "../../src/lib/search";

/**
 * Manifesto das tabelas a migrar do PostgreSQL para o Cloudflare D1.
 *
 * A ordem desta lista é a ordem de inserção e respeita as chaves estrangeiras:
 * o D1 valida FKs, por isso um filho nunca pode entrar antes do pai.
 *
 * `dateFields` existe porque o dump intermédio é JSON, e o JSON não tem tipo
 * data — sem esta lista as datas voltariam como strings e o Prisma escrevia-as
 * mal no D1.
 */
export type TableSpec = {
  /** Nome do delegate no Prisma Client (ex.: `prisma.receiptLine`). */
  model: string;
  /** Nome da tabela no SQL, para mensagens e contagens. */
  table: string;
  /** Campos `DateTime` que têm de ser revividos ao ler o JSON. */
  dateFields: readonly string[];
  /** Campos que identificam a linha de forma única, para a verificação. */
  key: readonly string[];
  /**
   * Colunas que só existem no D1 e são derivadas de outra, calculadas na
   * importação. Mapeiam `coluna nova -> coluna de origem`.
   */
  derived?: Readonly<Record<string, string>>;
};

export const TABLES: readonly TableSpec[] = [
  {
    model: "businessProfile",
    table: "BusinessProfile",
    dateFields: ["createdAt", "updatedAt"],
    key: ["id"],
  },
  {
    model: "user",
    table: "User",
    dateFields: ["emailVerified"],
    key: ["id"],
  },
  {
    model: "account",
    table: "Account",
    dateFields: [],
    key: ["id"],
  },
  {
    model: "session",
    table: "Session",
    dateFields: ["expires"],
    key: ["id"],
  },
  {
    // Sem chave primária desde a migração `20260419230336_initial`; a unicidade
    // vem do par (identifier, token).
    model: "verificationToken",
    table: "VerificationToken",
    dateFields: ["expires"],
    key: ["identifier", "token"],
  },
  {
    model: "passwordResetToken",
    table: "PasswordResetToken",
    dateFields: ["expires", "createdAt"],
    key: ["id"],
  },
  {
    model: "customer",
    derived: { nameFolded: "name" },
    table: "Customer",
    dateFields: ["createdAt", "updatedAt"],
    key: ["id"],
  },
  {
    model: "vehicle",
    derived: { labelFolded: "label" },
    table: "Vehicle",
    dateFields: ["createdAt", "updatedAt"],
    key: ["id"],
  },
  {
    model: "receipt",
    table: "Receipt",
    dateFields: [
      "serviceDate",
      "finalizedAt",
      "emailSentAt",
      "createdAt",
      "updatedAt",
    ],
    key: ["id"],
  },
  {
    model: "receiptLine",
    derived: { descriptionFolded: "description" },
    table: "ReceiptLine",
    dateFields: [],
    key: ["id"],
  },
  {
    model: "invite",
    table: "Invite",
    dateFields: ["expiresAt", "consumedAt", "createdAt"],
    key: ["id"],
  },
];

/** Onde fica o dump intermédio. Ignorado pelo git — contém dados reais. */
export const DUMP_DIR = ".migration-data";

export type Row = Record<string, unknown>;

/**
 * Os delegates do Prisma são tipados por modelo e não há forma de os indexar
 * por string sem perder o tipo. O `any` fica confinado aqui.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function delegateFor(client: any, model: string): any {
  const delegate = client[model];
  if (!delegate) {
    throw new Error(`O Prisma Client não expõe o modelo "${model}".`);
  }
  return delegate;
}

/**
 * Preenche as colunas normalizadas que só existem no D1. Usa a mesma função que
 * a app usa a escrever, para a pesquisa encontrar os dados migrados tal como
 * encontra os criados depois.
 */
export function applyDerived(row: Row, spec: TableSpec): Row {
  if (!spec.derived) return row;
  const out: Row = { ...row };
  for (const [target, source] of Object.entries(spec.derived)) {
    const value = row[source];
    if (typeof value !== "string") {
      throw new Error(
        `${spec.table}.${source} devia ser texto para derivar ${target}, veio ${typeof value}.`,
      );
    }
    out[target] = foldForSearch(value);
  }
  return out;
}

/** Converte de volta para `Date` os campos que o JSON achatou em string. */
export function reviveDates(row: Row, spec: TableSpec): Row {
  const out: Row = { ...row };
  for (const field of spec.dateFields) {
    const value = out[field];
    if (typeof value === "string") out[field] = new Date(value);
  }
  return out;
}

/**
 * Quantos parâmetros um INSERT gasta por linha. É o número de colunas
 * efectivamente enviadas — calculado a partir dos dados em vez de fixado à mão,
 * para não desalinhar se o schema mudar.
 */
export function columnsPerRow(rows: readonly Row[]): number {
  let max = 1;
  for (const row of rows) max = Math.max(max, Object.keys(row).length);
  return max;
}
