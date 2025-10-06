import { Outlet } from "@tryghost/admin-x-framework";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { AdminLayout } from "./layout/AdminLayout.tsx";
import EmberRoot from "./ember-bridge/EmberRoot.tsx";
import EmberFallback from "./ember-bridge/EmberFallback.tsx";
import EmberAuthSync from "./ember-bridge/EmberAuthSync.tsx";

function App() {
    const { data: currentUser } = useCurrentUser();

    return (
        <AdminLayout>
            {currentUser ? <Outlet /> : <EmberFallback />}
            <EmberRoot />
            <EmberAuthSync />
        </AdminLayout>
    );
}

export default App;
