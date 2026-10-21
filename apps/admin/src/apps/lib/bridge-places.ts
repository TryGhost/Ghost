import type { Place } from '@tryghost/app-contracts/bridge';

/**
 * Returns the Admin route for each place an app can open. Admin owns this mapping, so a place's
 * route can change without any app changing. Every place is listed here, so a place added to the
 * bridge doesn't compile until it has a route.
 */
export function placeRoute(place: Place): string {
  if ('post' in place) {
    return `/editor/post/${place.post.id}`;
  }
  if ('page' in place) {
    return `/editor/page/${place.page.id}`;
  }
  if ('member' in place) {
    return `/members/${place.member.id}`;
  }
  if ('apps' in place) {
    return '/apps';
  }
  const unrouted: never = place;
  throw new Error(`No route for the place ${JSON.stringify(unrouted)}`);
}
