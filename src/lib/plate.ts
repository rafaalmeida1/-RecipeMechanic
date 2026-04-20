export function normalizePlate(plate: string): string {
  return plate.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function formatPlateDisplay(plateNormalized: string): string {
  const p = plateNormalized.toUpperCase();
  if (p.length === 7 && /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(p)) {
    return `${p.slice(0, 3)}-${p.slice(3)}`;
  }
  if (p.length === 7 && /^[A-Z]{3}[0-9]{4}$/.test(p)) {
    return `${p.slice(0, 3)}-${p.slice(3)}`;
  }
  return p;
}
