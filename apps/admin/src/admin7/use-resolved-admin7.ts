import { useFeatureFlags } from '@tryghost/admin-x-framework/hooks';
import type { Admin7Features } from '@tryghost/shade/app';
import { admin7Features, type Admin7Route } from './features';
import { resolveAdmin7 } from './resolve-admin7';

const flagNames = Object.values(admin7Features).map((feature) => feature.flag);

/** Only the Admin root reads Labs; consumers read the resolved Shade context. */
export function useResolvedAdmin7(route: Admin7Route): Admin7Features {
  const flags = useFeatureFlags(flagNames);
  return resolveAdmin7(admin7Features, flags, route);
}
