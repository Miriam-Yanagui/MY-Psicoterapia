import { describe, expect, it } from "vitest";
import { formatAmount, paymentStatusForProvider } from "./payment";

describe("payment contract", () => {
  it("formats the server amount in major units", () => expect(formatAmount(80000)).toBe("800.00"));
  it.each([["approved", "approved_provisional"], ["pending", "pending"], ["in_process", "processing"], ["rejected", "rejected"]])
    ("maps provider status %s", (provider, expected) => expect(paymentStatusForProvider(provider)).toBe(expected));
});
