import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
import { server } from '../mocks/server';
import { configureMockApi, resetMockApiConfig } from '../mocks/config';

// RTL's default 1s async window is too tight for assertions that wait on an
// MSW round-trip through a fully mounted app.
configure({ asyncUtilTimeout: 10_000 });

configureMockApi({ latencyMinMs: 0, latencyMaxMs: 0, failureRate: 0 });

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

beforeEach(() => {
  configureMockApi({ latencyMinMs: 0, latencyMaxMs: 0, failureRate: 0 });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockApiConfig();
  configureMockApi({ latencyMinMs: 0, latencyMaxMs: 0, failureRate: 0 });
});

afterAll(() => {
  server.close();
});
