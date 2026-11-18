/**
 * Public surface of the automations domain, consumed by the admin shell
 * (clients/admin/src/routes.tsx). Other consumers use only the exports below.
 */

// Lazy entries, not component re-exports: the shell mounts these behind
// `lazy:`, so static re-exports would pull the chunks into the shell bundle.
export const lazyAutomationsScreen = () => import('./automations');
export const lazyAutomationEditorScreen = () => import('./editor');

export { useLabelAutomations } from './hooks/use-label-automations';
export { LabelAutomationNames, LabelAutomationRows } from './components/label-automation-rows';
export { LARGE_LABEL_AUTOMATION_BATCH_SIZE } from './constants';
