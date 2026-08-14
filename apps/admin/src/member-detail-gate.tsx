import { EmberFallback } from "./ember-bridge";
import { Suspense, lazy } from "react";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";

/**
 * Chooses which implementation serves `/members/:member_id`, based on the
 * `memberDetailsReact` Labs flag. Read at render time so toggling the flag in
 * Developer Experiments swaps implementations without a rebuild — the routes
 * table is static and evaluated once at module load.
 *
 * Ember owns this URL unless the flag says otherwise, which makes it the safe
 * default in every uncertain case: config failed, config came back empty, flag
 * absent. Only an explicit `true` renders React.
 *
 * The one case that is NOT safe to default to Ember is config still loading.
 * Falling back there would un-hide the Ember shell and flash the Ember screen
 * on every cold load for admins who have the flag on, so hold for a paint
 * instead — the config query is normally warm from the admin shell boot.
 *
 * Errors are deliberately not reported here: `useBrowseConfig` already routes
 * them through the framework's default error handler, and the shell calls the
 * same query, so anything logged here would be a duplicate.
 */
const MemberDetailReact = lazy(() => import("./members/detail/member-detail"));

export function MemberDetailGate() {
    const { data: config, isError, isLoading } = useBrowseConfig();

    if (isLoading) {
        return null;
    }

    if (isError || !config) {
        return <EmberFallback />;
    }

    if (config.config.labs?.memberDetailsReact !== true) {
        return <EmberFallback />;
    }

    return (
        <Suspense fallback={null}>
            <MemberDetailReact />
        </Suspense>
    );
}

export default MemberDetailGate;
