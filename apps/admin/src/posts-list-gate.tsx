import { EmberListWithGiftLinks } from './gift-link-modal-host';
import { FlagGatedRoute } from './flag-gated-route';
import { lazy } from 'react';

/**
 * Serves `/posts` and `/pages` from the React list screens when the
 * `postsListReact` Labs flag is on, and from Ember otherwise. The gating
 * semantics (loading, error, and flag branching) live in FlagGatedRoute.
 *
 * The Ember side needs EmberListWithGiftLinks rather than a bare EmberFallback:
 * the Ember list's context menu opens the React gift-link modal over the state
 * bridge, so that host has to stay mounted. The React screens open the modal
 * directly and don't need it.
 */
const PostsListReact = lazy(() => import('./posts/list/posts-route'));
const PagesListReact = lazy(() => import('./posts/list/pages-route'));

export function PostsListGate() {
  return (
    <FlagGatedRoute
      component={PostsListReact}
      fallback={<EmberListWithGiftLinks />}
      flag="postsListReact"
    />
  );
}

export function PagesListGate() {
  return (
    <FlagGatedRoute
      component={PagesListReact}
      fallback={<EmberListWithGiftLinks />}
      flag="postsListReact"
    />
  );
}
