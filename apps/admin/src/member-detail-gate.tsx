import { FlagGatedRoute } from "./flag-gated-route";
import { lazy } from "react";

/**
 * Serves `/members/:member_id` — covering both edit (`:member_id`) and create
 * (the `new` sentinel) — from the React member detail screen when the
 * `memberDetailsReact` Labs flag is on, and from Ember otherwise. The gating
 * semantics (loading, error, and flag branching) live in FlagGatedRoute.
 */
const MemberDetailReact = lazy(() => import("./members/detail/member-detail"));

export function MemberDetailGate() {
    return <FlagGatedRoute component={MemberDetailReact} flag="memberDetailsReact" />;
}

export default MemberDetailGate;
