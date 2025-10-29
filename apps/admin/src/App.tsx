import { Outlet } from "@tryghost/admin-x-framework";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { EmberProvider, EmberFallback, EmberRoot, useEmberAuthSync, useEmberDataSync } from "./ember-bridge";
import { AdminLayout } from "./layout/AdminLayout";

function App() {
    const { data: currentUser } = useCurrentUser();
    useEmberAuthSync();
    useEmberDataSync();

    return (
        <EmberProvider>
            {currentUser ?
                <AdminLayout>
                    <Outlet />
                </AdminLayout>
                :
                <EmberFallback />
            }
            <EmberRoot />
        </EmberProvider>
    );
}

export default App;
