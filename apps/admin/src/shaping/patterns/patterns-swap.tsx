import PatternsPage from './patterns-page';
import { EXPLORATIONS } from '@/shaping/explorations';
import { Outlet, useLocation } from '@tryghost/admin-x-framework';
import { Suspense } from 'react';
import { useView } from '@/shaping/view';

// SHAPING PROTOTYPE ONLY — never merge (see src/shaping/README.md).
//
// The one swap point under /analytics: the patterns page in the Patterns
// view; an exploration's version of this screen, if it has one; otherwise the
// real screen.
export const PatternsSwap = () => {
  const view = useView();
  const { pathname } = useLocation();
  if (view === 'patterns') {
    return <PatternsPage />;
  }
  const path = pathname.replace(/\/+$/, '');
  const Screen = EXPLORATIONS.find((exploration) => exploration.id === view)?.screens[path];
  return Screen ? (
    <Suspense fallback={null}>
      <Screen />
    </Suspense>
  ) : (
    <Outlet />
  );
};
