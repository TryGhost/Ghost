import {lazy} from "react";
import {FlagGatedRoute} from "@/flag-gated-route";

const SiteScreen = lazy(() => import("./site-screen"));
const ProScreen = lazy(() => import("./pro-screen"));
const ExploreScreen = lazy(() => import("./explore-screen"));
const MigrateScreen = lazy(() => import("./migrate-screen"));

// React ports of the iframe-wrapper screens when the embedScreensX labs flag
// is enabled, Ember fallbacks otherwise. Per-screen guards (owner-only /pro,
// admin-only /migrate) live inside the lazy screens.
export function SiteRoute() {
    return <FlagGatedRoute component={SiteScreen} flag="embedScreensX" />;
}

export function ProRoute() {
    return <FlagGatedRoute component={ProScreen} flag="embedScreensX" />;
}

export function ExploreRoute() {
    return <FlagGatedRoute component={ExploreScreen} flag="embedScreensX" />;
}

export function MigrateRoute() {
    return <FlagGatedRoute component={MigrateScreen} flag="embedScreensX" />;
}
