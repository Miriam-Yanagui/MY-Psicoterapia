import { afterEach, describe, expect, it, vi } from "vitest";
import { createUuid } from "@/lib/uuid";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("createUuid", () => {
  it("uses the native implementation when available", () => {
    const expected = "123e4567-e89b-42d3-a456-426614174000";
    vi.spyOn(crypto, "randomUUID").mockReturnValue(expected);
    expect(createUuid()).toBe(expected);
  });

  it("creates a valid v4 UUID when randomUUID is unavailable", () => {
    const getRandomValues = vi.fn((array: ArrayBufferView) => {
      const bytes = array as Uint8Array;
      bytes.forEach((_, index) => { bytes[index] = index; });
      return array;
    });
    vi.stubGlobal("crypto", { getRandomValues });
    expect(createUuid()).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
  });
});
