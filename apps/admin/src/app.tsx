import { Outlet } from "@tryghost/admin-x-framework";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { UnauthenticatedApp } from "./auth/unauthenticated-app";
import { EmberProvider, EmberRoot } from "./ember-bridge";
import { AdminLayout } from "./layout/admin-layout";
import { useEmberAuthSync, useEmberDataSync } from "./ember-bridge";

function App() {
    const { data: currentUser, isLoading: isCurrentUserLoading } = useCurrentUser();
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
                    <UnauthenticatedApp isCurrentUserLoading={isCurrentUserLoading} />
                    <EmberRoot />
                </>
            }
        </EmberProvider>
    );
}

export default App;
