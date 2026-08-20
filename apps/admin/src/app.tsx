import { Outlet } from "@tryghost/admin-x-framework";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { EmberProvider, EmberFallback, EmberRoot } from "./ember-bridge";
import { AdminLayout } from "./layout/admin-layout";
import { useEmberAuthSync, useEmberDataSync } from "./ember-bridge";
import { DunningModal } from "./dunning-modal";

function App() {
    const { data: currentUser } = useCurrentUser();
    useEmberAuthSync();
    useEmberDataSync();

    return (
        <EmberProvider>
            {currentUser ?
                <>
                    <AdminLayout>
                        <Outlet />
                        <EmberRoot />
                    </AdminLayout>
                    <DunningModal currentUser={currentUser} />
                </>
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
