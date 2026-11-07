// Shared, browser-safe helpers for AIIS login identities.

export const ORTU_DOMAIN = "ortu.aiis.app";
export const USTADZ_DOMAIN = "ustadz.aiis.app";
export const ADMIN_EMAIL = "aiisapps2027@gmail.com";

/** Normalize an Indonesian phone number to 62xxxxxxxx (digits only). */
export function normalizePhone(input: string): string {
  let d = (input || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return d;
}

/** Case-insensitive, trimmed, collapsed-space name for comparison. */
export function normalizeName(input: string): string {
  return (input || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function namesMatch(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b) && normalizeName(a).length > 0;
}

export const ortuEmail = (phone: string) => `${normalizePhone(phone)}@${ORTU_DOMAIN}`;
export const ustadzEmail = (kode: string) => `${kode.trim().toLowerCase()}@${USTADZ_DOMAIN}`;

const KODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1

export function generateKode(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => KODE_CHARS[b % KODE_CHARS.length]).join("");
}

export const isValidNik = (nik: string) => /^\d{16}$/.test(nik.trim());
export const isValidPhone = (p: string) => /^62\d{8,13}$/.test(normalizePhone(p));
