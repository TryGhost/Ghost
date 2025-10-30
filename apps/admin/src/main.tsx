import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import {
    FrameworkProvider,
    RouterProvider,
    AppProvider,
} from "@tryghost/admin-x-framework";
import { ShadeApp } from "@tryghost/shade";

import { routes } from "./routes.tsx";

const framework = {
    ghostVersion: "",
    externalNavigate: () => {},
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
        <AppProvider>
            <FrameworkProvider {...framework}>
                <RouterProvider prefix={"/"} routes={routes}>
                    <ShadeApp
                        className="shade-admin"
                        darkMode={false}
                        fetchKoenigLexical={null}
                    >
                        <App />
                    </ShadeApp>
                </RouterProvider>
            </FrameworkProvider>
        </AppProvider>
    </StrictMode>
);
