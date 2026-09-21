export interface PaymentResult {
  success: boolean;
  latencyMs: number;
}

let forceFailMode = false;

export function setForceFailMode(enabled: boolean): void {
  forceFailMode = enabled;
}

export async function simulatePayment(
  failRate: number,
  latencyMs: number
): Promise<PaymentResult> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  // In force-fail mode, always fail (for cascading failure demo)
  if (forceFailMode) {
    return { success: false, latencyMs };
  }

  // Random success/fail based on failRate
  const random = Math.random();
  const success = random > failRate;

  return { success, latencyMs };
}
