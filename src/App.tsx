import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { FilmStripSkeleton, PlayTableSkeleton, StatsSkeleton } from './components/Skeleton';
import { BlueprintSheet } from './components/Blueprint';
import CampaignListPage from './features/campaigns/CampaignListPage';
import { NotFoundPage } from './routes/NotFoundPage';

/**
 * The detail view is the heaviest route (film strip + play table + modal), so
 * it is split into its own chunk and fetched on demand. The list — the entry
 * point for almost every session — stays in the main bundle.
 */
const CampaignDetailPage = lazy(() => import('./features/plays/CampaignDetailPage'));

/** Shown while the detail chunk downloads. */
function DetailChunkFallback() {
  return (
    <div className="page-loading" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading campaign timeline…</span>
      <BlueprintSheet>
        <div className="page-loading-body">
          <p className="micro">Loading proof-of-play timeline…</p>
          <StatsSkeleton />
          <FilmStripSkeleton />
          <PlayTableSkeleton rows={5} />
        </div>
      </BlueprintSheet>
    </div>
  );
}

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/campaigns" replace />} />
        <Route path="/campaigns" element={<CampaignListPage />} />
        <Route
          path="/campaigns/:id"
          element={
            <Suspense fallback={<DetailChunkFallback />}>
              <CampaignDetailPage />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}
