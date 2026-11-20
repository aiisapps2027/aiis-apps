/** School levels as used by the foundation: PG (Playgroup), K1, K2 (kindergarten) and SD. */
export const JENJANG = ["PG", "K1", "K2", "SD"] as const;
export type Jenjang = (typeof JENJANG)[number];

export const isJenjang = (v: unknown): v is Jenjang => typeof v === "string" && (JENJANG as readonly string[]).includes(v);

/** Bank accounts, SPP prices and the fee catalogue are kept per group: PG, K1 and K2 share "TK". */
export const grupJenjang = (j: string): string => (j === "PG" || j === "K1" || j === "K2" ? "TK" : j);
