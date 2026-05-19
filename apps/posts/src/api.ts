/**
 * Public API for cross-package imports.
 * Admin uses these exports instead of reaching into src/ directly.
 */
export {default as PostsAppContextProvider} from './providers/posts-app-context';
export {routes} from './routes';
export {parseAllSharedViewsJSON} from './views/members/shared-views';
export type {SharedView, AllSharedViewsParseResult} from './views/members/shared-views';
