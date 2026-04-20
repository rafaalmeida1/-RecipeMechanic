import prisma from "@/lib/db";
import { NewReceiptWizard } from "@/components/new-receipt-wizard";

export default async function NewReceiptPage() {
  const business = await prisma.businessProfile.findFirst();
  return <NewReceiptWizard pixDefault={business?.pixDefault ?? ""} />;
}
