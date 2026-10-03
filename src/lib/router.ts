import type { BrowserRouterProps } from 'react-router-dom';

/**
 * Opt in to React Router v7 behaviours now: state updates wrapped in
 * `startTransition`, and v7 splat-path resolution. Silences the upgrade
 * warnings and means the eventual v7 upgrade is not a behavioural change.
 */
export const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} satisfies BrowserRouterProps['future'];
