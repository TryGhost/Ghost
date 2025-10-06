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
    onUpdate: () => {},
    onInvalidate: () => {},
    onDelete: () => {},
};

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AppProvider>
            <FrameworkProvider {...framework}>
                <RouterProvider prefix={"/"} routes={routes}>
                    <ShadeApp
                        className="shade-admin"
                        darkMode={true}
                        fetchKoenigLexical={null}
                    >
                        <App />
                    </ShadeApp>
                </RouterProvider>
            </FrameworkProvider>
        </AppProvider>
    </StrictMode>
);
