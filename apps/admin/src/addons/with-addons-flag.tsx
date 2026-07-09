import {NotFound} from "@/not-found";
import {useFeatureFlag} from "@tryghost/admin-x-framework/hooks";

/**
 * All add-on routes exist only behind the `addons` labs flag; with the flag
 * off the namespace 404s like any other unknown route.
 */
export function withAddonsFlag(Component: React.ComponentType) {
    return function AddonsFlagGate() {
        const addonsEnabled = useFeatureFlag("addons");

        if (!addonsEnabled) {
            return <NotFound />;
        }

        return <Component />;
    };
}
