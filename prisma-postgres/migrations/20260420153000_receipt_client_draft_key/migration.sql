-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN "clientDraftKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_clientDraftKey_key" ON "Receipt"("clientDraftKey");
