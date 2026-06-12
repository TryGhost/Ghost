import { lazy } from "react";
import { FlagGatedRoute } from "./flag-gated-route";

const PostDebug = lazy(() => import("@tryghost/posts/post-debug"));

// Renders the React post email debug screen (from the posts app) when the
// postDebugX labs flag is enabled, and the Ember screen otherwise.
export function PostDebugRoute() {
    return <FlagGatedRoute component={PostDebug} flag="postDebugX" />;
}
