import { lazy } from "react";
import { FlagGatedRoute } from "./flag-gated-route";

const PostsList = lazy(() => import("@tryghost/posts/posts-list"));
const PagesList = lazy(() => import("@tryghost/posts/pages-list"));

// Render the React posts/pages list screens (from the posts app) when the
// postsListX labs flag is enabled, and the Ember screens otherwise.
export function PostsListRoute() {
    return <FlagGatedRoute component={PostsList} flag="postsListX" />;
}

export function PagesListRoute() {
    return <FlagGatedRoute component={PagesList} flag="postsListX" />;
}
