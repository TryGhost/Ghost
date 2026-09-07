import { FlagGatedRoute } from './flag-gated-route';
import { lazy } from 'react';
import { lazyTagDetailScreen } from './tags/api';

/**
 * Serves `/tags/:tagSlug` — covering both edit (`:tagSlug`) and create (the
 * `new` sentinel) — from the React tag detail screen when the
 * `tagDetailsReact` Labs flag is on, and from Ember otherwise. The gating
 * semantics (loading, error, and flag branching) live in FlagGatedRoute.
 */
const TagDetailReact = lazy(lazyTagDetailScreen);

export function TagDetailGate() {
  return <FlagGatedRoute component={TagDetailReact} flag="tagDetailsReact" />;
}

export default TagDetailGate;
