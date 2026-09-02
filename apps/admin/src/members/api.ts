/**
 * Public surface of the members domain, consumed by the admin shell
 * (apps/admin/src/routes.tsx), the layout, and other domains. Everything
 * else in this domain is internal.
 */
export { membersRouteChildren } from './routes';
export { buildMembersUrl } from './member-route';
export { formatMemberName, getMemberInitials, memberAvatarProps } from './member-format';
export {
  type SharedView,
  findMatchingSharedViewIndexes,
  hasSharedViewNameConflict,
  normalizeSharedViewName,
  parseAllSharedViewsJSON,
} from './shared-views';
