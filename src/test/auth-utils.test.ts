import { describe, expect, it } from "vitest";
import { generateKode, namesMatch, normalizePhone, ortuEmail } from "@/lib/auth-utils";

describe("login identities", () => {
  it("normalizes phone numbers to 62 format", () => {
    expect(normalizePhone("0812-3456-7890")).toBe("6281234567890");
    expect(normalizePhone("+62 812 3456 7890")).toBe("6281234567890");
    expect(normalizePhone("81234567890")).toBe("6281234567890");
  });
  it("builds the parent email from the phone", () => {
    expect(ortuEmail("08123456789")).toBe("628123456789@ortu.aiis.app");
  });
  it("matches student names ignoring case and extra spaces", () => {
    expect(namesMatch("  ahmad   FADLI ", "Ahmad Fadli")).toBe(true);
    expect(namesMatch("Ahmad", "Ahmad Fadli")).toBe(false);
  });
  it("generates 8-char kode without ambiguous characters", () => {
    for (let i = 0; i < 50; i++) {
      const k = generateKode();
      expect(k).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    }
  });
});
