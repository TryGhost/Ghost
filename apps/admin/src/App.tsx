import { Outlet } from "@tryghost/admin-x-framework";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { EmberProvider, EmberFallback, EmberRoot, useEmberAuthSync } from "./ember-bridge";

function App() {
    const { data: currentUser } = useCurrentUser();
    useEmberAuthSync();

    return (
        <EmberProvider>
            {currentUser ? <Outlet /> : <EmberFallback />}
            <EmberRoot />
        </EmberProvider>
    );
}

export default App;
