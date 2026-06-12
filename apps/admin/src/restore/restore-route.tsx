import { lazy } from "react";
import { FlagGatedRoute } from "@/flag-gated-route";

const RestoreScreen = lazy(() => import("./restore-screen"));

// Renders the React restore (crash recovery) screen when the restoreX labs
// flag is enabled, and the Ember screen otherwise.
export function RestoreRoute() {
    return <FlagGatedRoute component={RestoreScreen} flag="restoreX" />;
}
