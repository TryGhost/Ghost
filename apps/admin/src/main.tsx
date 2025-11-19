import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { FrameworkProvider, RouterProvider } from "@tryghost/admin-x-framework";
import { ShadeApp } from "@tryghost/shade";

import { routes } from "./routes.tsx";
import { navigateTo } from "./utils/navigation";
import { AppProvider } from "./providers/AppProvider";

const framework = {
    ghostVersion: "",
    externalNavigate: (link: { route: string; isExternal: boolean }) => {
        navigateTo(link.route);
    },
    unsplashConfig: {
        Authorization: "",
        "Accept-Version": "",
        "Content-Type": "",
        "App-Pragma": "",
        "X-Unsplash-Cache": true,
    },
    sentryDSN: null,
    onUpdate: (dataType: string, response: unknown) => {
        window.EmberBridge?.state.onUpdate(dataType, response);
    },
    onInvalidate: (dataType: string) => {
        window.EmberBridge?.state.onInvalidate(dataType);
    },
    onDelete: (dataType: string, id: string) => {
        window.EmberBridge?.state.onDelete(dataType, id);
    },
};

createRoot(document.getElementById("root")!).render(
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
