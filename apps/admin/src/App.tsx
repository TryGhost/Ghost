import { Outlet } from "@tryghost/admin-x-framework";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { EmberProvider, EmberFallback, EmberRoot, useEmberAuthSync } from "./ember-bridge";
import { AdminLayout } from "./layout/AdminLayout";
import { useEmberDataSync } from "./ember-bridge";

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
        </EmberProvider>
    );
}

export default App;
