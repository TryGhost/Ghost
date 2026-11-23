import { useSyncExternalStore } from 'react';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

const query = '(width < 1024px)';
const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};
const getSnapshot = () => window.matchMedia(query).matches;

export function useMobileMemberFilters() {
  const enabled = useFeatureFlag('admin7Mobile');
  const smallScreen = useSyncExternalStore(subscribe, getSnapshot, () => false);
  return enabled && smallScreen;
}
