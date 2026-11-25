import { useSyncExternalStore } from 'react';
import { useShade } from '@/providers/shade-context';

const query = '(width < 1024px)';
const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};
const getSnapshot = () => window.matchMedia(query).matches;

const subscribeDisabled = () => () => {};
const getDisabledSnapshot = () => false;

export function useMobileFilters() {
  const { admin7Mobile: enabled } = useShade();
  return useSyncExternalStore(
    enabled ? subscribe : subscribeDisabled,
    enabled ? getSnapshot : getDisabledSnapshot,
    getDisabledSnapshot,
  );
}
