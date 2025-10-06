import { Outlet } from "@tryghost/admin-x-framework";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { EmberProvider, EmberFallback, EmberRoot, EmberAuthSync } from "./ember-bridge";

function App() {
    const { data: currentUser } = useCurrentUser();

    return (
        <EmberProvider>
            {currentUser ? <Outlet /> : <EmberFallback />}
            <EmberRoot />
            <EmberAuthSync />
        </EmberProvider>
    );
}

export default App;
