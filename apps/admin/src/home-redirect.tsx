import {useEffect} from "react";
import {useNavigate, useSearchParams} from "@tryghost/admin-x-framework";
import {useCurrentUser} from "@tryghost/admin-x-framework/api/current-user";
import {hasAdminAccess, isContributorUser, isOwnerUser} from "@tryghost/admin-x-framework/api/users";
import {useOnboarding} from "@/onboarding/hooks/use-onboarding";

/**
 * Pure role-based redirect for "/", ported from Ember's home route
 * (ghost/admin/app/routes/home.js):
 *
 * - `?firstStart=true` (appended by Ghost (Pro) after site creation): start
 *   the onboarding checklist for owners, then land on the onboarding screen.
 * - Owners/administrators land on Analytics, contributors on Posts and
 *   everyone else on Site.
 *
 * While signed out this renders nothing: the hidden Ember app's
 * authenticated route rewrites the shared URL to the signin screen.
 */
export function HomeRedirect() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isFirstStart = searchParams.get("firstStart") === "true";
    const {data: currentUser} = useCurrentUser();
    const {startChecklist} = useOnboarding();

    useEffect(() => {
        if (!isFirstStart || !currentUser) {
            return;
        }

        let cancelled = false;

        const redirectToOnboarding = async () => {
            if (isOwnerUser(currentUser)) {
                // Mirrors Ember's home route: the checklist start must
                // complete before navigating, so the onboarding screen
                // doesn't load a stale "pending" state.
                await startChecklist().catch(console.error);
            }

            if (!cancelled) {
                navigate("/setup/onboarding?returnTo=/analytics", {replace: true});
            }
        };

        void redirectToOnboarding();

        return () => {
            cancelled = true;
        };
    }, [currentUser, isFirstStart, navigate, startChecklist]);

    const roleTarget = currentUser
        ? (hasAdminAccess(currentUser) ? "/analytics" : isContributorUser(currentUser) ? "/posts" : "/site")
        : null;
    const target = isFirstStart ? null : roleTarget;

    // Effect-based navigation guarded by the LIVE hash, not <Navigate>:
    // Ember's home redirect ran synchronously inside the route transition,
    // but a mounted <Navigate> fires after commit — if the URL has already
    // moved on (e.g. a test or user navigates right after landing on "/"),
    // the late replace would clobber the newer navigation.
    useEffect(() => {
        if (!target) {
            return;
        }
        const hashPath = window.location.hash.replace(/^#/, "").split("?")[0];
        if (hashPath !== "/" && hashPath !== "") {
            return;
        }
        navigate(target, {replace: true});
    }, [target, navigate]);

    return null;
}
