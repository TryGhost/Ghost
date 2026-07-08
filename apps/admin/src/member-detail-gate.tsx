import { EmberFallback } from "./ember-bridge";
import { Suspense, lazy } from "react";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";

/**
 * Runtime gate that decides which member-detail implementation to render:
 *
 *   - Labs flag `memberDetailsReact` ON  → renders the React screen from
 *     `@tryghost/posts/member-detail`.
 *   - Labs flag OFF                       → renders `EmberFallback`, which
 *     signals the Ember bridge to un-hide `#ember-app`. Ember's own router
 *     matches `/members/:member_id` (see `ghost/admin/app/router.js`) and
 *     serves the legacy screen.
 *
 * Read at render time so a toggle in Developer Experiments flips
 * implementations without needing to rebuild the routes table (which is
 * static and evaluated once at module load — see `routes.tsx`).
 *
 * IMPORTANT — while `useBrowseConfig()` is still loading we render `null`
 * instead of defaulting to `<EmberFallback />`. Defaulting would cause a
 * brief Ember-chrome flash on every cold hit of `/members/xxx` for admins
 * with the flag ON: EmberFallback would un-hide `#ember-app`, Ember's
 * `member` route would kick off an aborted transition, and then the gate
 * would flip to React once config resolved. Holding for one paint is
 * cheaper — the config query is normally warm from the admin shell boot.
 */
const MemberDetailReact = lazy(() => import("@tryghost/posts/member-detail"));

export function MemberDetailGate() {
    const { data: config, isLoading } = useBrowseConfig();

    if (isLoading || !config) {
        return null;
    }

    const enabled = config.config.labs?.memberDetailsReact === true;

    if (!enabled) {
        return <EmberFallback />;
    }

    return (
        <Suspense fallback={null}>
            <MemberDetailReact />
        </Suspense>
    );
}

export default MemberDetailGate;
