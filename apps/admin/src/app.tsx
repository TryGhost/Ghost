import { lazy, Suspense } from "react";
import { Outlet } from "@tryghost/admin-x-framework";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { EmberProvider, EmberFallback, EmberRoot } from "./ember-bridge";
import { AdminLayout } from "./layout/admin-layout";
import { useEmberAuthSync, useEmberDataSync } from "./ember-bridge";

/**
 * Floating Labs flag switcher, opt in with `"labs": {"devLabsPanel": true}` in
 * ghost/core/config.local.json.
 *
 * `import.meta.env.DEV` is a compile-time constant, so a production build folds
 * this to `null` and Rollup drops the chunk — the panel is absent from dist/,
 * not merely guarded inside it. The opt-in flag is read inside the lazy module
 * rather than here on purpose: a hook call cannot be conditional, so reading it
 * in this component would ship a config subscription to production and make the
 * root re-render on config changes it otherwise ignores.
 *
 * The catch caps the blast radius. Nothing above App is an error boundary, so an
 * import that fails to resolve — flags.ts throwing because labs.js moved, say —
 * would otherwise blank the entire admin over a dev tool.
 */
const LabsPanel = import.meta.env.DEV
    ? lazy(() => import("./dev-tools/labs-panel").catch((error) => {
        // eslint-disable-next-line no-console
        console.error("Labs panel failed to load. The admin is unaffected.", error);
        return { default: () => null };
    }))
    : null;

function App() {
    const { data: currentUser } = useCurrentUser();
    useEmberAuthSync();
    useEmberDataSync();

    return (
        <EmberProvider>
            {currentUser ?
                <AdminLayout>
                    <Outlet />
                    <EmberRoot />
                </AdminLayout>
                :
                <>
                    <EmberFallback />
                    <EmberRoot />
                </>
            }
            {LabsPanel && <Suspense fallback={null}><LabsPanel /></Suspense>}
        </EmberProvider>
    );
}

export default App;
