import { Suspense, lazy } from 'react';

const AppActivate = lazy(() => import('@/apps/activate/app-activate'));

/** The activation flow, pinned to the Podcasts app. */
export function PodcastsActivate() {
  return (
    <Suspense fallback={null}>
      <AppActivate appId="podcasts" />
    </Suspense>
  );
}

export default PodcastsActivate;
