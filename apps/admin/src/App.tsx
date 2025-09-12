import {
    FrameworkProvider,
    Outlet,
    RouterProvider,
    AppProvider,
} from "@tryghost/admin-x-framework";
import { ShadeApp } from "@tryghost/shade";
import { routes } from "./routes.tsx";
import { EmberProvider } from "./ember-bridge/EmberProvider.tsx";
import EmberRoot from "./ember-bridge/EmberRoot.tsx";

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

function App() {
    return (
        <AppProvider>
            <EmberProvider>
                <FrameworkProvider {...framework}>
                    <RouterProvider prefix={"/"} routes={routes}>
                        <ShadeApp
                            className="shade-admin"
                            darkMode={false}
                            fetchKoenigLexical={null}
                        >
                            <Outlet />
                            <EmberRoot />
                        </ShadeApp>
                    </RouterProvider>
                </FrameworkProvider>
            </EmberProvider>
        </AppProvider>
    );
}

export default App;
