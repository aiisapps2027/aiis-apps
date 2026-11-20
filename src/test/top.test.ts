import { describe, expect, it } from "vitest";
import { rentangPekan } from "@/lib/top";

describe("rentangPekan", () => {
  it("shows the month once inside one month", () => expect(rentangPekan("2026-11-16", "2026-11-22")).toBe("16–22 Nov"));
  it("shows both months across a month boundary", () => expect(rentangPekan("2026-11-30", "2026-12-06")).toBe("30 Nov – 6 Des"));
});
