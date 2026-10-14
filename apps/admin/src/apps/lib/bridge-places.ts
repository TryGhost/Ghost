import type { Place } from '@tryghost/app-contracts/bridge';

/**
 * Where each place an app can name lives in Admin. Admin decides, so a place can move
 * without any app changing. Every place is named here: one added to the bridge's places
 * doesn't compile until it has a route.
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
