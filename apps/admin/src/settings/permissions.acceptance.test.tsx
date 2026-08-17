import { describe, expect, it } from "vitest";

import { currentUserResponse, fakeAdminEndpoint, fakeSettingsScreens, renderAdminApp, type CurrentUserResponse } from "@test-utils/acceptance";
import { settingsScreen } from "./settings.screen";

function currentUserWithRole(name: string): CurrentUserResponse {
    const response = currentUserResponse();
    const user = response.users[0];
    user.roles = [{ ...(user.roles as Array<Record<string, unknown>>)[0], name }];
    return response;
}

describe("Settings permissions", () => {
    for (const role of ["Editor", "Super Editor"]) {
        it(`shows ${role.toLowerCase()}s only the staff section`, async () => {
            fakeSettingsScreens();
            await renderAdminApp("/settings", {
                boot: { browseMe: { response: currentUserWithRole(role) } },
            });

            await expect.element(settingsScreen.users()).toBeVisible();
            await expect(settingsScreen.sidebar()).toHaveCount(0);
            await expect(settingsScreen.titleAndDescription()).toHaveCount(0);
        });
    }

    for (const role of ["Author", "Contributor"]) {
        it(`shows ${role.toLowerCase()}s only their own profile`, async () => {
            fakeSettingsScreens();
            fakeAdminEndpoint("GET", "/users/me/token/", { apiKey: null });
            await renderAdminApp("/settings/staff/owner", {
                boot: { browseMe: { response: currentUserWithRole(role) } },
            });

            await expect.element(settingsScreen.userDetailModal()).toBeVisible();
            await expect(settingsScreen.sidebar()).toHaveCount(0);
            await expect(settingsScreen.users()).toHaveCount(0);
            await expect(settingsScreen.titleAndDescription()).toHaveCount(0);
        });
    }
});
