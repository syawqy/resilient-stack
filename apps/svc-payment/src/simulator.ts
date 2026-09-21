export interface PaymentResult {
  success: boolean;
  latencyMs: number;
}

export async function simulatePayment(
  failRate: number,
  latencyMs: number
): Promise<PaymentResult> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  // Random success/fail based on failRate
  const random = Math.random();
  const success = random > failRate;

  return { success, latencyMs };
}
