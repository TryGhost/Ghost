/**
 * Public surface of the automations domain, consumed by the admin shell
 * (apps/admin/src/routes.tsx). Everything else in this domain is internal.
 */

// Lazy entries, not component re-exports: the shell mounts these behind
// `lazy:`, so static re-exports would pull the chunks into the shell bundle.
export const lazyAutomationsScreen = () => import('./automations');
export const lazyAutomationEditorScreen = () => import('./editor');
// PROTOTYPE ONLY (NY-1750): every lead magnet state on one page. Don't merge.
export const lazyLeadMagnetStatesScreen = () => import('./prototype/lead-magnet-states');
// PROTOTYPE ONLY (NY-1750): the bottom-right beaker menu, mounted from main.tsx. Don't merge.
export const lazyPrototypeMenu = () => import('./prototype/mount-menu');
// PROTOTYPE ONLY (NY-1750): the label trigger's fake backend, for the member page's Labels hint
// or Save dialog, and the label picker's delete. Don't merge.
export {
  type LeadMagnetLabelChanges,
  hasLeadMagnetChanges,
  recordLeadMagnetLabelDeleted,
  recordLeadMagnetLabelRenamed,
  useLeadMagnetDeleteBlocker,
  useLeadMagnetLabelChanges,
} from './prototype/lead-magnets';
export { LeadMagnetDeleteBlockedDialog } from './prototype/lead-magnets-delete-dialog';
export { LeadMagnetBulkNote } from './prototype/lead-magnets-bulk-note';
export { LeadMagnetLabelsHint } from './prototype/lead-magnets-hint';
export { LeadMagnetSaveDialog } from './prototype/lead-magnets-dialog';
export { useConfirmLabelChangesOnSave } from './prototype/settings';
