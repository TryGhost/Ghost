import {Suspense, type ComponentType, type LazyExoticComponent} from "react";
import {useBrowseConfig} from "@tryghost/admin-x-framework/api/config";
import {EmberFallback} from "./ember-bridge";

/**
 * Renders a React screen when the given labs flag is enabled, and falls back
 * to the Ember admin when it is not. Used to migrate screens from Ember to
 * React one labs flag at a time.
 *
 * While the config (which contains the labs flags) is loading we render
 * nothing: mounting EmberFallback eagerly would flash the Ember screen before
 * the React implementation takes over.
 */
export function FlagGatedRoute({flag, component: Component}: {
    flag: string;
    component: LazyExoticComponent<ComponentType>;
}) {
    const {data, isLoading} = useBrowseConfig();
    const enabled = Boolean(data?.config?.labs?.[flag]);

    if (!data && isLoading) {
        return null;
    }

    if (!enabled) {
        return <EmberFallback />;
    }

    return (
        <Suspense fallback={null}>
            <Component />
        </Suspense>
    );
}
