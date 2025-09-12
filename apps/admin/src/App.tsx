import {
    FrameworkProvider,
    Outlet,
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

function App() {
    return (
        <AppProvider>
            <FrameworkProvider {...framework}>
                <RouterProvider prefix={"/"} routes={routes}>
                    <ShadeApp
                        className="shade-admin"
                        darkMode={false}
                        fetchKoenigLexical={null}
                    >
                        <Outlet />
                    </ShadeApp>
                </RouterProvider>
            </FrameworkProvider>
        </AppProvider>
    );
}

export default App;
