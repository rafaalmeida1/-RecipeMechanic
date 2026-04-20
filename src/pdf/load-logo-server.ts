import fs from "fs";
import path from "path";

/** Logo do recibo em PDF (servidor Node apenas). */
export function loadLogoDataUriServer(): string | null {
  const candidates = [
    path.join(process.cwd(), "public", "logo", "logo_ribeirocar.png"),
    path.join(process.cwd(), "public", "logo", "ribeirocar.png"),
    path.join(process.cwd(), "logo_ribeirocar.png"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const b = fs.readFileSync(p);
      return `data:image/png;base64,${b.toString("base64")}`;
    }
  }
  return null;
}
