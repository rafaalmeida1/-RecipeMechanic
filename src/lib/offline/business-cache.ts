"use client";

const KEY = "ribeirocar:business-profile";

export type BusinessProfileSnapshot = {
  legalName: string;
  cnpj: string;
  phone: string;
  email: string;
};

export function readCachedBusiness(): BusinessProfileSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BusinessProfileSnapshot;
  } catch {
    return null;
  }
}

export function writeCachedBusiness(b: BusinessProfileSnapshot): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    /* ignore quota */
  }
}
