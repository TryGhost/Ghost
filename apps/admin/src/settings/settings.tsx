import { App } from "./layout/app";

export default function Settings() {
    // Full-screen takeover inside the shell tree (automations-editor pattern);
    // the admin sidebar is already unmounted via the route's hideAdminSidebar.
    return (
        <div className="fixed inset-0 z-50">
            <App />
        </div>
    );
}
