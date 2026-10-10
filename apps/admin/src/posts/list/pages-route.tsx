import { PostsListScreen } from './posts-list-screen';

/**
 * Route entry for `/pages`. See `posts-route.tsx` — same screen, other resource.
 */
export default function PagesRoute() {
  return <PostsListScreen resource="pages" />;
}
