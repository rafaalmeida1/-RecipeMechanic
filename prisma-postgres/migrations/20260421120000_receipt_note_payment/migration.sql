-- CreateEnum
CREATE TYPE "ReceiptPaymentMethod" AS ENUM ('PIX', 'CARTAO', 'OUTRO');

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN "receiptNote" TEXT,
ADD COLUMN "paymentMethod" "ReceiptPaymentMethod" NOT NULL DEFAULT 'PIX',
ADD COLUMN "cardInstallmentCount" INTEGER,
ADD COLUMN "showGrandTotalOnPdf" BOOLEAN NOT NULL DEFAULT true;
