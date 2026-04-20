-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN "importSourceKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_importSourceKey_key" ON "Receipt"("importSourceKey");
