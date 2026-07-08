import { EmberFallback } from "./ember-bridge";
import { Suspense, lazy } from "react";
import { useFeatureFlag } from "./hooks/use-feature-flag";

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
 * The choice is the SAME URL and SAME React Router mount; only the child
 * changes. The parity Playwright suite uses this to run the same assertions
 * against both implementations.
 */
const MemberDetailReact = lazy(() => import("@tryghost/posts/member-detail"));

export function MemberDetailGate() {
    const enabled = useFeatureFlag("memberDetailsReact");

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
