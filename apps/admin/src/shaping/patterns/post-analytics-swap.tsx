import { EXPLORATIONS } from '@/shaping/explorations';
import { Suspense, lazy } from 'react';
import { useView } from '@/shaping/view';

// SHAPING PROTOTYPE ONLY — never merge (see src/shaping/README.md).
//
// The swap point for a post's analytics Overview (/posts/analytics/:id): an
// exploration's version of the screen, if it has one; otherwise the real
// screen. The /analytics screens swap in patterns-swap.tsx instead.

const RealOverview = lazy(() => import('@/posts/analytics/overview/overview'));

const PostAnalyticsSwap = () => {
  const view = useView();
  const Screen =
    EXPLORATIONS.find((exploration) => exploration.id === view)?.postAnalyticsOverview ??
    RealOverview;
  return (
    <Suspense fallback={null}>
      <Screen />
    </Suspense>
  );
};

export default PostAnalyticsSwap;
