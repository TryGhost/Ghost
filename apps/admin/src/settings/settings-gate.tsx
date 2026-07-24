import { Suspense, lazy } from "react";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";

/**
 * Chooses which implementation serves `/settings/*`, based on the
 * `shadeSettings` Labs flag — the same mechanism as MemberDetailGate for
 * `memberDetailsReact`. Read at render time so toggling the flag in Developer
 * Experiments swaps implementations without a rebuild.
 *
 * The legacy admin-x-settings app owns the URL unless the flag says
 * otherwise, which makes it the safe default in every uncertain case: config
 * failed, config came back empty, flag absent. Only an explicit `true`
 * renders the native Shade shell.
 *
 * Config still loading holds for a paint instead of falling back — the
 * config query is normally warm from the admin shell boot, and falling back
 * would flash the legacy app for admins who have the flag on.
 */
const SettingsLegacy = lazy(() => import("./settings"));
const SettingsShade = lazy(() => import("./app/settings-app"));

export function SettingsGate() {
    const { data: config, isLoading } = useBrowseConfig();

    if (isLoading) {
        return null;
    }

    if (config?.config.labs?.shadeSettings === true) {
        return (
            <Suspense fallback={null}>
                <SettingsShade />
            </Suspense>
        );
    }

    return (
        <Suspense fallback={null}>
            <SettingsLegacy />
        </Suspense>
    );
}

export default SettingsGate;
