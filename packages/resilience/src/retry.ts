export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryOn: (error: Error, attempt: number) => boolean;
  onRetry: (error: Error, attempt: number) => void;
}

const defaultOptions: RetryOptions = {
  maxRetries: 3,
  baseDelay: 200,
  maxDelay: 5000,
  retryOn: () => true,
  onRetry: () => {},
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt >= opts.maxRetries || !opts.retryOn(lastError, attempt + 1)) {
        throw lastError;
      }

      const delay = calculateDelay(opts.baseDelay, opts.maxDelay, attempt);
      opts.onRetry(lastError, attempt + 1);
      console.log(`[Retry] Attempt ${attempt + 1}/${opts.maxRetries} failed, retrying in ${delay}ms...`);

      await sleep(delay);
    }
  }

  throw lastError ?? new Error('Retry failed with unknown error');
}

function calculateDelay(baseDelay: number, maxDelay: number, attempt: number): number {
  const exponential = baseDelay * Math.pow(2, attempt);
  const jitter = exponential * (0.5 + Math.random() * 0.5);
  return Math.min(jitter, maxDelay);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
