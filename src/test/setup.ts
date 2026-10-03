import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from '../mocks/server';
import { configureMockApi, resetMockApiConfig } from '../mocks/config';

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
