import { Route, Routes } from "react-router";
import { createPortal } from "react-dom";
import { Navigate, useParams } from "@tryghost/admin-x-framework";

import { resolveSettingsArea } from "./nav";
import { SettingsSearchProvider } from "./search-provider";
import { SettingsShell } from "./settings-shell";
import { ConfirmationProvider } from "./shared/confirmation";
import { SettingsDirtyProvider } from "./shared/dirty";
import { InviteUserDialog } from "@/settings/general/invite-user-dialog";
import { UserDetailDialog } from "@/settings/general/user-detail-dialog";

/**
 * Flag-on entry for `/settings/*` (see settings-gate.tsx): the native Shade
 * settings app. Route scaffolding under the splat:
 *
 * - `/settings` — the shell, scrolled to the top
 * - `/settings/:area` — the shell, scrolled to the routed area; `:area`
 *   accepts area ids and every legacy nav segment (e.g. `design`)
 * - `/settings/staff/invite` — the staff invite dialog over the shell
 * - `/settings/staff/:slug(/:tab)` — the staff user detail dialog
 * - anything deeper or unknown (routes whose screens haven't been rebuilt,
 *   like `/settings/portal/edit`) redirects to `/settings`
 *
 * Rendered through a portal with the same wrapper as the legacy settings
 * app (src/settings/settings.tsx) so the full-screen takeover stacks
 * identically over the admin chrome.
 */

function AreaRoute() {
    const { area } = useParams();

    if (area && !resolveSettingsArea(area)) {
        return <Navigate to="/settings" replace />;
    }

    return null;
}

export default function ShadeSettingsApp() {
    return createPortal(
        <div
            className="shade shade-admin"
            data-testid="shade-settings"
            style={{
                position: "absolute",
                inset: 0,
                zIndex: 20,
            }}
        >
            <SettingsDirtyProvider>
                <ConfirmationProvider>
                    <SettingsSearchProvider>
                        <Routes>
                            <Route element={<SettingsShell />}>
                                <Route index element={null} />
                                <Route element={<InviteUserDialog />} path="staff/invite" />
                                <Route element={<UserDetailDialog />} path="staff/:slug" />
                                <Route element={<UserDetailDialog />} path="staff/:slug/:tab" />
                                <Route element={<AreaRoute />} path=":area" />
                                <Route element={<Navigate to="/settings" replace />} path="*" />
                            </Route>
                        </Routes>
                    </SettingsSearchProvider>
                </ConfirmationProvider>
            </SettingsDirtyProvider>
        </div>,
        document.body,
    );
}
