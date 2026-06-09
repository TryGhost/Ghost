import { lazy } from "react";
import { FlagGatedRoute } from "./flag-gated-route";

const TagDetails = lazy(() => import("@tryghost/posts/tag-details"));

// Renders the React tag detail screen (from the posts app) when the
// tagDetailsX labs flag is enabled, and the Ember screen otherwise.
export function TagDetailsRoute() {
    return <FlagGatedRoute component={TagDetails} flag="tagDetailsX" />;
}
