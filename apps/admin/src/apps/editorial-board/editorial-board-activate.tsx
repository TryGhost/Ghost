import { Suspense, lazy } from 'react';

const AppActivate = lazy(() => import('@/apps/activate/app-activate'));

/** The activation flow, pinned to the Editorial board app. */
export function EditorialBoardActivate() {
  return (
    <Suspense fallback={null}>
      <AppActivate appId="editorial-board" />
    </Suspense>
  );
}

export default EditorialBoardActivate;
