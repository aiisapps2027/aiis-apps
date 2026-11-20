import { describe, expect, it } from "vitest";
import { grupJenjang, isJenjang, JENJANG } from "@/lib/jenjang";

describe("jenjang", () => {
  it("has PG, K1, K2 and SD", () => expect([...JENJANG]).toEqual(["PG", "K1", "K2", "SD"]));
  it("groups PG, K1 and K2 as TK for fees and bank accounts", () => {
    expect(["PG", "K1", "K2"].map(grupJenjang)).toEqual(["TK", "TK", "TK"]);
    expect(grupJenjang("SD")).toBe("SD");
  });
  it("validates", () => {
    expect(isJenjang("K1")).toBe(true);
    expect(isJenjang("TK")).toBe(false);
  });
});
