import { StrictMode } from "react";
import { FrameworkProvider, RouterProvider, type TopLevelFrameworkProps } from "@tryghost/admin-x-framework";
import { ShadeApp } from "@tryghost/shade/app";

import App from "./app.tsx";
import { routes } from "./routes.tsx";
import { AppProvider } from "./providers/app-provider";

/**
 * The full admin provider pyramid, shared verbatim by the production entry
 * point (src/main.tsx) and the acceptance harness's renderAdminApp — so "the
 * harness renders the same provider stack as main.tsx" is true by
 * construction. Only the `framework` props (navigation/bridge callbacks,
 * query client) differ between the two.
 */
export function AdminAppRoot({ framework }: { framework: TopLevelFrameworkProps }) {
    return (
        <StrictMode>
            <FrameworkProvider {...framework}>
                <RouterProvider prefix={"/"} routes={routes}>
                    <AppProvider>
                        <ShadeApp
                            className="shade-admin"
                            darkMode={false}
                            fetchKoenigLexical={null}
                        >
                            <App />
                        </ShadeApp>
                    </AppProvider>
                </RouterProvider>
            </FrameworkProvider>
        </StrictMode>
    );
}
