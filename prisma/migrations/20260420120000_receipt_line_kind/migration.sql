-- CreateEnum
CREATE TYPE "ReceiptLineKind" AS ENUM ('PRODUCT', 'SERVICE');

-- AlterTable
ALTER TABLE "ReceiptLine" ADD COLUMN "kind" "ReceiptLineKind" NOT NULL DEFAULT 'PRODUCT';
