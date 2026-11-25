/**
 * Public surface of the members domain, consumed by the admin shell
 * (apps/admin/src/routes.tsx), the layout, and other domains. Everything
 * else in this domain is internal.
 */
export { membersRouteChildren } from './routes';
export const lazyMemberActivityScreen = () => import('./activity/member-activity');
export const lazySegmentsScreen = () => import('./segments/segments-list');
export { buildMembersUrl } from './member-route';
export { formatMemberName, getMemberInitials, memberAvatarProps } from './member-format';
export {
  type SharedView,
  findMatchingSharedViewIndexes,
  hasSharedViewNameConflict,
  normalizeSharedViewName,
  parseAllSharedViewsJSON,
} from './shared-views';
export { useMemberViews } from './hooks/use-member-views';
export { useSegmentPins } from './segments/poc-store';
export { SEGMENT_PARAM } from './segments/segment-route';
export { LabelPicker } from './label-picker';
