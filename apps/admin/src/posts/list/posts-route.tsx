import {PostsListScreen} from './posts-list-screen';

/**
 * Route entry for `/posts`. Exists as its own module so the gate can lazy-load
 * the posts and pages variants independently of each other.
 */
export default function PostsRoute() {
    return <PostsListScreen resource='posts' />;
}
