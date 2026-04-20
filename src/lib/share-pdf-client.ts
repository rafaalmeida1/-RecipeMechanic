"use client";

/**
 * Baixa o PDF autenticado (cookie de sessão) e oferece o menu nativo de compartilhamento
 * com o arquivo — no Android costuma listar WhatsApp com anexo.
 */
export async function sharePdfFileFromUrl(
  pdfUrl: string,
  fileName: string,
  meta: { title: string; text: string },
): Promise<"shared" | "not_supported" | "cancelled"> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return "not_supported";
  }

  const res = await fetch(pdfUrl, { credentials: "include" });
  if (!res.ok) throw new Error("Não foi possível baixar o PDF.");

  const blob = await res.blob();
  const file = new File([blob], fileName, { type: "application/pdf" });

  const data: ShareData = {
    files: [file],
    title: meta.title,
    text: meta.text,
  };

  if (navigator.canShare && !navigator.canShare(data)) {
    return "not_supported";
  }

  try {
    await navigator.share(data);
    return "shared";
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return "cancelled";
    throw e;
  }
}
