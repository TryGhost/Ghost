import PatternsPage from './patterns-page';
import { Outlet } from '@tryghost/admin-x-framework';
import { usePatternsView } from '@/shaping/patterns-view';

// SHAPING PROTOTYPE ONLY — never merge (see src/shaping/README.md).
//
// The one swap point: under /analytics, show the patterns page instead of the
// screen while "View patterns" is on in the prototype menu.
export const PatternsSwap = () => {
  const patternsView = usePatternsView();
  return patternsView ? <PatternsPage /> : <Outlet />;
};
