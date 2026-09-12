-- CreateEnum
CREATE TYPE "ReceiptPdfTheme" AS ENUM ('DARK', 'LIGHT');

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN "pdfTheme" "ReceiptPdfTheme" NOT NULL DEFAULT 'DARK';
