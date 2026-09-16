/**
 * Public surface of the automations domain, consumed by the admin shell
 * (apps/admin/src/routes.tsx). Everything else in this domain is internal.
 */

// Lazy entries, not component re-exports: the shell mounts these behind
// `lazy:`, so static re-exports would pull the chunks into the shell bundle.
export const lazyAutomationsScreen = () => import('./automations');
export const lazyAutomationEditorScreen = () => import('./editor');

// The prototype lanes (see proto/shared/lanes), routed the same way — the
// shell may only reach this domain through its api, prototype included.
export const lazyProtoPhase1List = () => import('./proto/phase-1/list');
export const lazyProtoPhase1Detail = () => import('./proto/phase-1/detail');
export const lazyProtoPhase2List = () => import('./proto/phase-2/list');
export const lazyProtoPhase2Detail = () => import('./proto/phase-2/detail');
export const lazyProtoExplorationList = () => import('./proto/exploration/list');
export const lazyProtoExplorationDetail = () => import('./proto/exploration/detail');
export const lazyProtoExploration2List = () => import('./proto/exploration-2/list');
export const lazyProtoExploration2Detail = () => import('./proto/exploration-2/detail');
