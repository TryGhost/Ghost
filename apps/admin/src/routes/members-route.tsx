import { Suspense, lazy } from "react";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { EmberFallback } from "@/ember-bridge";

// Lazy load the React members component
const MembersView = lazy(() => import("@tryghost/posts/src/views/members/members"));

/**
 * Conditional members route that respects the membersForward feature flag.
 * - Flag disabled: delegates to Ember via EmberFallback
 * - Flag enabled: renders React members list
 */
export function MembersRoute() {
    const membersForward = useFeatureFlag("membersForward");

    if (!membersForward) {
        return <EmberFallback />;
    }

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MembersView />
        </Suspense>
    );
}
