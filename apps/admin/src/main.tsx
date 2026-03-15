import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./app.tsx";
import { FrameworkProvider, RouterProvider } from "@tryghost/admin-x-framework";
import { ShadeApp } from "@tryghost/shade";

import { routes } from "./routes.tsx";
import { navigateTo } from "./utils/navigation";
import { AppProvider } from "./providers/app-provider";

const framework = {
    ghostVersion: "",
    externalNavigate: (link: { route: string; isExternal: boolean }) => {
        navigateTo(link.route);
    },
    unsplashConfig: {
        Authorization: "Client-ID 8672af113b0a8573edae3aa3713886265d9bb741d707f6c01a486cde8c278980",
        "Accept-Version": "v1",
        "Content-Type": "application/json",
        "App-Pragma": "no-cache",
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
