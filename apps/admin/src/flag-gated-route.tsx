import { EmberFallback, useEmberFeatureFlag } from "./ember-bridge";
import { Suspense, type ComponentType, type LazyExoticComponent } from "react";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";

/**
 * Chooses which implementation serves a route while a screen migrates from
 * Ember to React, based on a Labs flag. Read at render time so toggling the
 * flag in Developer Experiments swaps implementations without a rebuild — the
 * routes table is static and evaluated once at module load.
 *
 * In the integrated admin, Ember's synchronously exposed feature state is the
 * ownership authority for both routers. This prevents brief split-brain states
 * while a Labs setting propagates between the Ember service and React cache.
 * While Ember is present but its Labs settings are still loading, React does
 * not claim the route. Standalone React/test environments (where there is no
 * Ember feature reader) fall back to the config query.
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
export function FlagGatedRoute({ flag, component: Component }: {
    flag: string;
    component: LazyExoticComponent<ComponentType>;
}) {
    const { data: config, isError, isLoading } = useBrowseConfig();
    const emberFlag = useEmberFeatureFlag(flag);

    const renderReact = () => (
        <Suspense fallback={null}>
            <Component />
        </Suspense>
    );

    if (typeof emberFlag === 'boolean') {
        return emberFlag ? renderReact() : <EmberFallback />;
    }

    if (emberFlag === null) {
        return null;
    }

    if (isLoading) {
        return null;
    }

    if (isError || !config) {
        return <EmberFallback />;
    }

    if (config.config.labs?.[flag] !== true) {
        return <EmberFallback />;
    }

    return renderReact();
}
