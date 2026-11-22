import { describe, expect, it } from "vitest";
import { generateKode, isValidNisn, namesMatch, normalizePhone, ortuEmail, isValidNis } from "@/lib/auth-utils";

describe("login identities", () => {
  it("normalizes phone numbers to 62 format", () => {
    expect(normalizePhone("0812-3456-7890")).toBe("6281234567890");
    expect(normalizePhone("+62 812 3456 7890")).toBe("6281234567890");
    expect(normalizePhone("81234567890")).toBe("6281234567890");
  });
  it("builds the parent email from phone + NIS so siblings can share a phone", () => {
    expect(ortuEmail("08123456789", "654321")).toBe("628123456789.654321@ortu.aiis.app");
    expect(ortuEmail("08123456789", "654321")).not.toBe(ortuEmail("08123456789", "654322"));
  });
  it("validates NIS as 6-15 digits", () => {
    expect(isValidNis("654321")).toBe(true);
    expect(isValidNis("12345")).toBe(false);
    expect(isValidNis("12A456")).toBe(false);
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

describe("isValidNisn", () => {
  it("accepts exactly 9 digits", () => {
    expect(isValidNisn("123456789")).toBe(true);
    expect(isValidNisn(" 123456789 ")).toBe(true);
  });
  it.each(["12345678", "1234567890", "1234567890123456", "12345678A", ""])("rejects %j", (v) => expect(isValidNisn(v)).toBe(false));
});

import { isValidKode, normalizeKode } from "@/lib/auth-utils";
describe("teacher kode", () => {
  it("accepts 6-12 letters/digits, any case", () => {
    expect(isValidKode("abc123")).toBe(true);
    expect(isValidKode("FNATB4Z5")).toBe(true);
    expect(normalizeKode(" abc123 ")).toBe("ABC123");
  });
  it("rejects short, long, or symbols", () => {
    expect(isValidKode("abc12")).toBe(false);
    expect(isValidKode("ABCDEFGHJKLMN")).toBe(false);
    expect(isValidKode("abc 123")).toBe(false);
    expect(isValidKode("abc-123")).toBe(false);
  });
});
