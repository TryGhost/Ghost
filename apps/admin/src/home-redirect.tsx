import {useEffect, useRef} from "react";
import {Navigate, useNavigate, useSearchParams} from "@tryghost/admin-x-framework";
import {useCurrentUser} from "@tryghost/admin-x-framework/api/current-user";
import {hasAdminAccess, isContributorUser, isOwnerUser} from "@tryghost/admin-x-framework/api/users";
import {useOnboarding} from "@/onboarding/hooks/use-onboarding";

// Hosted signup lands on `/?firstStart=true`; the checklist only starts for
// owners but every firstStart visit continues to the onboarding route.
const FIRST_START_REDIRECT = "/setup/onboarding?returnTo=/analytics";

const HomeRedirect = () => {
    const {data: currentUser} = useCurrentUser();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const {startChecklist} = useOnboarding();
    const isFirstStart = searchParams.get("firstStart") === "true";
    const hasHandledFirstStartRef = useRef(false);

    useEffect(() => {
        if (!isFirstStart || !currentUser || hasHandledFirstStartRef.current) {
            return;
        }

        hasHandledFirstStartRef.current = true;
        void (async () => {
            try {
                if (isOwnerUser(currentUser)) {
                    await startChecklist();
                }
                navigate(FIRST_START_REDIRECT, {replace: true});
            } catch (error) {
                hasHandledFirstStartRef.current = false;
                // eslint-disable-next-line no-console
                console.error(error);
            }
        })();
    }, [currentUser, isFirstStart, navigate, startChecklist]);

    if (!currentUser || isFirstStart) {
        return null;
    }

    if (hasAdminAccess(currentUser)) {
        return <Navigate to="/analytics" replace />;
    }

    if (isContributorUser(currentUser)) {
        return <Navigate to="/posts" crossApp replace />;
    }

    return <Navigate to="/site" crossApp replace />;
};

export default HomeRedirect;
