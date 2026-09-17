// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import React from "react";
import { render, screen, act } from "@testing-library/react";

const { mockReplace, mockPush, mockRouter, mockRecoverCurrentBooking, mockSubmitCardPayment, mockOnBookingUnavailable, cardOnSubmitRef } = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY = "test-key";
  const replace = vi.fn();
  const push = vi.fn();
  return {
    mockReplace: replace,
    mockPush: push,
    mockRouter: { replace, push },
    mockRecoverCurrentBooking: vi.fn(),
    mockSubmitCardPayment: vi.fn(),
    mockOnBookingUnavailable: vi.fn(),
    cardOnSubmitRef: { current: null as ((form: { token: string; payment_method_id: string; installments: number }) => Promise<void>) | null },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));
vi.mock("motion/react", () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  useReducedMotion: () => true,
}));
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => React.createElement("img", { src: String(props.src), alt: String(props.alt) }),
}));
vi.mock("@mercadopago/sdk-react", () => ({
  CardPayment: (props: { onSubmit: (form: { token: string; payment_method_id: string; installments: number }) => Promise<void> }) => {
    cardOnSubmitRef.current = props.onSubmit;
    return React.createElement("div", { "data-testid": "brick" });
  },
  initMercadoPago: vi.fn(),
}));
vi.mock("@/lib/motion", () => ({ useReducedMotion: () => true }));
vi.mock("@/lib/booking", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/booking")>();
  return {
    ...actual,
    recoverCurrentBooking: mockRecoverCurrentBooking,
    saveBookingContact: vi.fn(),
  };
});
vi.mock("@/lib/payment", () => ({
  get submitCardPayment() { return mockSubmitCardPayment; },
}));

import ConfirmationPage from "@/app/onboarding/confirmation/page";
import CheckoutPage from "@/app/onboarding/checkout/page";
import TestimonialPage from "@/app/onboarding/testimonial/page";
import { PaymentSection } from "@/components/checkout/PaymentSection";
import { OnboardingProvider } from "@/context/OnboardingProvider";
import { BookingRecoveryError } from "@/lib/booking";
import { routes } from "@/lib/flow";

function fakeBooking(overrides?: Record<string, unknown>) {
  return {
    appointmentId: "apt-1", status: "held",
    holdExpiresAt: new Date(Date.now() + 600_000).toISOString(),
    slot: { id: "slot-1", startsAt: "2026-09-16T18:00:00-05:00", endsAt: "2026-09-16T18:50:00-05:00", timezone: "America/Mexico_City" },
    contact: null, amountMinor: 500, currency: "MXN", payment: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  cardOnSubmitRef.current = null;
  process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY = "test-key";
});

afterEach(() => vi.useRealTimers());

describe("ConfirmationPage — retry real", () => {
  it("retries on temporary_failure then shows confirmed", async () => {
    const confirmed = fakeBooking({ status: "confirmed", payment: { id: "p", status: "approved" } });
    let callCount = 0;
    mockRecoverCurrentBooking.mockImplementation(async () => {
      callCount++;
      if (callCount <= 2) throw new BookingRecoveryError("temporary_failure", `503 call ${callCount}`);
      return confirmed;
    });

    await act(async () => { render(<ConfirmationPage />); });
    expect(screen.getByText("Verificando tu cita…")).toBeTruthy();
    expect(mockRecoverCurrentBooking).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(mockRecoverCurrentBooking).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Verificando tu cita…")).toBeTruthy();

    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(mockRecoverCurrentBooking).toHaveBeenCalledTimes(3);
    expect(screen.getByText("Tu espacio está reservado.")).toBeTruthy();
    expect(screen.getByText(/miércoles, 16 de septiembre/i)).toBeTruthy();
    expect(screen.getByText(/17:00 · Google Meet/i)).toBeTruthy();
    expect(screen.getByText(/Pago confirmado · \$5 MXN/i)).toBeTruthy();
    expect(screen.getByText("¿Qué sigue?")).toBeTruthy();
    const whatsappLink = screen.getByRole("link", { name: /Hablar con Miriam/i });
    expect(whatsappLink.getAttribute("href")).toContain("https://wa.me/5216243167794");
    expect(whatsappLink.getAttribute("target")).toBe("_blank");
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe("ConfirmationPage — null", () => {
  it("navigates to schedule when booking is null", async () => {
    mockRecoverCurrentBooking.mockResolvedValue(null);
    await act(async () => { render(<ConfirmationPage />); });
    await act(async () => {});
    expect(mockReplace).toHaveBeenCalledWith(routes.schedule);
  });
});

describe("TestimonialPage — automatic orientation", () => {
  it("replaces the loading dots with a continue control after 2.8 seconds", async () => {
    await act(async () => { render(<TestimonialPage />); });
    expect(screen.getByText("Guardando tus respuestas…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Continuar" })).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(2800); });
    expect(screen.getByRole("button", { name: "Continuar" })).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe("CheckoutPage F11 — null", () => {
  it("clears the recovered booking and navigates to schedule", async () => {
    const heldWithContact = fakeBooking({
      contact: { email: "ana@example.com", countryCode: "+52", phone: "5512345678", consented: true },
    });
    mockRecoverCurrentBooking
      .mockResolvedValueOnce(heldWithContact)
      .mockResolvedValueOnce(null);

    await act(async () => {
      render(<OnboardingProvider><CheckoutPage /></OnboardingProvider>);
    });
    await act(async () => {});

    expect(mockRecoverCurrentBooking).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenCalledWith(routes.schedule);
    expect(screen.getByText("No encontramos una reserva vigente. Volviendo a agenda…")).toBeTruthy();
  });
});

describe("PaymentSection — terminal callback", () => {
  beforeEach(() => { mockOnBookingUnavailable.mockClear(); });

  it("HOLD_EXPIRED → calls onBookingUnavailable", async () => {
    mockSubmitCardPayment.mockRejectedValue(Object.assign(new Error("HOLD_EXPIRED"), { code: "HOLD_EXPIRED" }));
    await act(async () => {
      render(<PaymentSection amountMinor={500} currency="MXN" onBookingUnavailable={mockOnBookingUnavailable} />);
    });
    expect(cardOnSubmitRef.current).toBeTypeOf("function");
    await act(async () => { await cardOnSubmitRef.current!({ token: "tok", payment_method_id: "visa", installments: 1 }); });
    expect(mockOnBookingUnavailable).toHaveBeenCalledTimes(1);
  });

  it("BOOKING_NOT_ACTIVE → calls onBookingUnavailable", async () => {
    mockSubmitCardPayment.mockRejectedValue(Object.assign(new Error("BOOKING_NOT_ACTIVE"), { code: "BOOKING_NOT_ACTIVE" }));
    await act(async () => {
      render(<PaymentSection amountMinor={500} currency="MXN" onBookingUnavailable={mockOnBookingUnavailable} />);
    });
    await act(async () => { await cardOnSubmitRef.current!({ token: "tok", payment_method_id: "visa", installments: 1 }); });
    expect(mockOnBookingUnavailable).toHaveBeenCalledTimes(1);
  });

  it("BOOKING_NOT_FOUND → calls onBookingUnavailable", async () => {
    mockSubmitCardPayment.mockRejectedValue(Object.assign(new Error("BOOKING_NOT_FOUND"), { code: "BOOKING_NOT_FOUND" }));
    await act(async () => {
      render(<PaymentSection amountMinor={500} currency="MXN" onBookingUnavailable={mockOnBookingUnavailable} />);
    });
    await act(async () => { await cardOnSubmitRef.current!({ token: "tok", payment_method_id: "visa", installments: 1 }); });
    expect(mockOnBookingUnavailable).toHaveBeenCalledTimes(1);
  });

  it("PAYMENT_UNAVAILABLE → does NOT call onBookingUnavailable", async () => {
    mockSubmitCardPayment.mockRejectedValue(Object.assign(new Error("PAYMENT_UNAVAILABLE"), { code: "PAYMENT_UNAVAILABLE" }));
    await act(async () => {
      render(<PaymentSection amountMinor={500} currency="MXN" onBookingUnavailable={mockOnBookingUnavailable} />);
    });
    await act(async () => { await cardOnSubmitRef.current!({ token: "tok", payment_method_id: "visa", installments: 1 }); });
    expect(mockOnBookingUnavailable).not.toHaveBeenCalled();
  });
});
