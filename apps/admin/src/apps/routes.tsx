import { type RouteObject, lazyComponent, redirect } from '@tryghost/admin-x-framework';
import { EditorialBoardActivate } from './editorial-board/editorial-board-activate';
import { EditorialBoardGuard } from './editorial-board/editorial-board-guard';
import { PodcastsActivate } from './podcasts/podcasts-activate';
import { PodcastsAppGuard } from './podcasts/podcasts-app-guard';

// The child routes under `/apps`. The shell (apps/admin/src/routes.tsx)
// mounts these under the `/apps` route node, which carries the Labs flag
// guard and the access handle.
export const appsRouteChildren: RouteObject[] = [
  {
    index: true,
    lazy: lazyComponent(() => import('./apps')),
  },
  {
    path: ':appId/activate',
    lazy: lazyComponent(() => import('./activate/app-activate')),
  },
  {
    // Each app's activation flow lives outside its activation gate (which
    // prompts activation) on a fully static path, so it never competes with
    // the app's own `:id` routes.
    path: 'podcasts/activate',
    Component: PodcastsActivate,
  },
  {
    // The Podcasts app: podcasts and their episodes, each with a metadata
    // ("manage") page. PodcastsAppGuard prompts activation when inactive.
    path: 'podcasts',
    Component: PodcastsAppGuard,
    children: [
      { index: true, lazy: lazyComponent(() => import('./podcasts/podcasts-list')) },
      { path: 'new', lazy: lazyComponent(() => import('./podcasts/podcast-form')) },
      { path: ':podcastId', lazy: lazyComponent(() => import('./podcasts/episodes-list')) },
      { path: ':podcastId/manage', lazy: lazyComponent(() => import('./podcasts/podcast-form')) },
      {
        path: ':podcastId/episodes/new',
        lazy: lazyComponent(() => import('./podcasts/episode-form')),
      },
      {
        path: ':podcastId/episodes/:episodeId',
        lazy: lazyComponent(() => import('./podcasts/episode-form')),
      },
    ],
  },
  {
    path: 'editorial-board/activate',
    Component: EditorialBoardActivate,
  },
  {
    // The Editorial board has no settings page; its home is the board itself.
    path: 'editorial-board',
    loader: () => redirect('/editorial-board'),
  },
];

// The Editorial board screen, mounted by the shell at `/editorial-board`
// under the Labs flag guard; the activation gate prompts when inactive.
export const editorialBoardRouteChildren: RouteObject[] = [
  {
    Component: EditorialBoardGuard,
    children: [
      { index: true, lazy: lazyComponent(() => import('./editorial-board/editorial-board')) },
    ],
  },
];
