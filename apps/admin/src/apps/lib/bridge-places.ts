import type { Place } from '@tryghost/app-contracts/bridge';

/**
 * Where each place an app can name lives in Admin. Admin decides, so a place can move
 * without any app changing.
 */
export function placeRoute(place: Place): string {
  if ('post' in place) {
    return `/editor/post/${place.post.id}`;
  }
  if ('member' in place) {
    return `/members/${place.member.id}`;
  }
  return '/apps';
}
