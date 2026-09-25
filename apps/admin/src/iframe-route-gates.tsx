import { FlagGatedRoute } from './flag-gated-route';
import { lazy } from 'react';
import { lazyMigrateScreen } from './migrate/api';
import { lazyViewSiteScreen } from './view-site/api';

/**
 * Serves `/site` and `/migrate/*` from React when the `iframeRoutesReact`
 * Labs flag is on, and from Ember otherwise. The gating semantics (loading,
 * error, and flag branching) live in FlagGatedRoute.
 */
const ViewSiteReact = lazy(lazyViewSiteScreen);
const MigrateReact = lazy(lazyMigrateScreen);

export function ViewSiteGate() {
  return <FlagGatedRoute component={ViewSiteReact} flag="iframeRoutesReact" />;
}

export function MigrateGate() {
  return <FlagGatedRoute component={MigrateReact} flag="iframeRoutesReact" />;
}
