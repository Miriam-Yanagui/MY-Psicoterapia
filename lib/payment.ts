export type PaymentResult =
  | { status: "approved"; reference: string }
  | { status: "pending"; reference: string }
  | { status: "rejected"; message?: string };

export interface PaymentProvider {
  createPayment(): Promise<PaymentResult>;
}
