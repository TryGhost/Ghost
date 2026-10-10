import { type RouteObject, lazyComponent } from '@tryghost/admin-x-framework';

// The child routes under `/members`. The shell (apps/admin/src/routes.tsx)
// mounts these under the `/members` route node, which carries the access
// handle. `lazy:` is preserved for per-view code-splitting.
export const membersRouteChildren: RouteObject[] = [
  {
    index: true,
    lazy: lazyComponent(() => import('./members')),
  },
  {
    path: 'import',
    lazy: lazyComponent(() => import('./members')),
  },
  {
    // Covers both edit (`:member_id`) and create (the sentinel `new`)
    // — real member ids are 24-char hex ObjectIds, so they can't
    // collide with the literal "new".
    path: ':member_id',
    lazy: lazyComponent(() => import('./detail/member-detail')),
  },
];
