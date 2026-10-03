/**
 * Tunable behaviour of the mock API.
 *
 * Production defaults simulate a slow, occasionally flaky network registry.
 * Tests dial latency and failure to zero so suites stay fast and
 * deterministic; handler-level failures are still injected explicitly with
 * `server.use(...)` where a test needs a specific error.
 */
export interface MockApiConfig {
  readonly latencyMinMs: number;
  readonly latencyMaxMs: number;
  readonly failureRate: number;
}

export const mockApiConfig: MockApiConfig = {
  latencyMinMs: 400,
  latencyMaxMs: 900,
  failureRate: 0.1,
};

export function configureMockApi(patch: Partial<MockApiConfig>): void {
  Object.assign(mockApiConfig, patch);
}

/** Restore the shipped defaults (400–900ms latency, ~10% failures). */
export function resetMockApiConfig(): void {
  Object.assign(mockApiConfig, { latencyMinMs: 400, latencyMaxMs: 900, failureRate: 0.1 });
}
