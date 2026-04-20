import { OfflineReceiptWorkspace } from "@/components/offline-receipt-workspace";

export default async function OfflineReceiptDraftPage({
  params,
}: {
  params: Promise<{ draftKey: string }>;
}) {
  const { draftKey } = await params;
  return <OfflineReceiptWorkspace draftKey={draftKey} />;
}
