import { lazy } from "react";
import { FlagGatedRoute } from "./flag-gated-route";

const MemberDetails = lazy(() => import("@tryghost/posts/member-details"));
const MembersActivity = lazy(() => import("@tryghost/posts/members-activity"));

// Render the React member detail / members activity screens (from the posts
// app) when the memberDetailsX labs flag is enabled, and Ember otherwise.
export function MemberDetailsRoute() {
    return <FlagGatedRoute component={MemberDetails} flag="memberDetailsX" />;
}

export function MembersActivityRoute() {
    return <FlagGatedRoute component={MembersActivity} flag="memberDetailsX" />;
}
