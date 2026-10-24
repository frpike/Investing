import { describe, expect, it } from "vitest";
import { normalizeSupabaseUrl } from "./config";

describe("normalizeSupabaseUrl", () => {
  it("reduces pasted variants to the bare Project URL", () => {
    for (const raw of ["https://abc.supabase.co", "https://abc.supabase.co/", "https://abc.supabase.co/rest/v1/", " https://abc.supabase.co/rest/v1 ", '"https://abc.supabase.co"'])
      expect(normalizeSupabaseUrl(raw)).toBe("https://abc.supabase.co");
  });
});
