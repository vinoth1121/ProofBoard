import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ROUTER_FUTURE } from './lib/router';
import './styles/global.css';

/**
 * MSW is started in every environment — dev, preview and the deployed
 * production build — before React mounts. That is what lets the live demo run
 * with no backend at all: the "API" is a service worker intercepting fetches.
 */
async function enableMockApi(): Promise<void> {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
      quiet: false,
      serviceWorker: { url: '/mockServiceWorker.js' },
    });
    return;
  }

  try {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
      quiet: true,
      serviceWorker: { url: '/mockServiceWorker.js' },
    });
  } catch (error) {
    // A blocked service worker (strict privacy mode) must not blank the app:
    // the shell still renders and every request fails with a retry affordance.
    console.warn('[proofboard] mock API unavailable — requests will fail visibly.', error);
  }
}

async function bootstrap(): Promise<void> {
  await enableMockApi();

  const container = document.getElementById('root');
  if (container === null) throw new Error('Root container #root is missing from index.html');

  createRoot(container).render(
    <StrictMode>
      <BrowserRouter future={ROUTER_FUTURE}>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}

void bootstrap();
