import { FlagGatedRoute } from './flag-gated-route';
import { lazy } from 'react';
import { lazyMigrateScreen } from './migrate/api';
import { lazyViewSiteScreen } from './view-site/api';

const ViewSiteReact = lazy(lazyViewSiteScreen);
const MigrateReact = lazy(lazyMigrateScreen);

/** Serves `/site` from React when `iframeRoutesReact` is on, Ember otherwise. */
export function ViewSiteGate() {
  return <FlagGatedRoute component={ViewSiteReact} flag="iframeRoutesReact" />;
}

/** Serves `/migrate/*` from React when `iframeRoutesReact` is on, Ember otherwise. */
export function MigrateGate() {
  return <FlagGatedRoute component={MigrateReact} flag="iframeRoutesReact" />;
}
