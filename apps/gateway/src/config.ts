import { DEFAULT_CONFIG } from '@resilient/shared';
import type { GatewayConfig } from '@resilient/shared';

export let currentConfig: GatewayConfig = structuredClone(DEFAULT_CONFIG);

export function updateConfig(partial: Partial<GatewayConfig>): GatewayConfig {
  if (partial.rateLimiter) {
    currentConfig.rateLimiter = { ...currentConfig.rateLimiter, ...partial.rateLimiter };
  }
  if (partial.cache) {
    currentConfig.cache = { ...currentConfig.cache, ...partial.cache };
  }
  if (partial.circuitBreaker) {
    currentConfig.circuitBreaker = { ...currentConfig.circuitBreaker, ...partial.circuitBreaker };
  }
  if (partial.retry) {
    currentConfig.retry = { ...currentConfig.retry, ...partial.retry };
  }
  if (partial.services) {
    currentConfig.services = { ...currentConfig.services, ...partial.services };
  }
  return currentConfig;
}

export function getConfig(): GatewayConfig {
  return currentConfig;
}
