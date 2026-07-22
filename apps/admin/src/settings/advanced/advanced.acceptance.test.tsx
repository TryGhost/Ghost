import {describe, expect, it} from "vitest";
import {page} from "vitest/browser";

import {
    fakeActions,
    fakeAdminEndpoint,
    fakeEditSettings,
    fakeSettingsScreens,
    fakeUsers,
    renderAdminApp,
    settingsResponse,
    currentUserResponse,
    currentRoute,
    type StaffUser,
} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";

function advancedSettings(overrides: Record<string, string | boolean | null>) {
    return settingsResponse({settings: overrides});
}

describe("Advanced settings", () => {
    it("saves header and footer code injection", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings/code-injection");

        const section = settingsScreen.section("code-injection");
        await section.getByRole("button", {name: "Open"}).click();
        const modal = settingsScreen.section("modal-code-injection");
        await modal.getByTestId("header-code").getByRole("textbox").fill("<script>header()</script>");
        await modal.getByRole("tab", {name: "Site footer"}).click();
        await modal.getByTestId("footer-code").getByRole("textbox").fill("<script>footer()</script>");
        await modal.getByRole("button", {name: "Save"}).click();

        await expect(settingsApi).toHaveEditedSettings([
            {key: "codeinjection_head", value: "<script>header()</script>"},
            {key: "codeinjection_foot", value: "<script>footer()</script>"},
        ]);
    });

    it("deletes all content after confirmation", async () => {
        fakeSettingsScreens();
        const api = fakeAdminEndpoint("DELETE", "/db/", {});
        await renderAdminApp("/settings/advanced");

        await settingsScreen.section("dangerzone").getByRole("button", {name: "Delete all content"}).click();
        await settingsScreen.confirmationModal().getByRole("button", {name: "Delete", exact: true}).click();

        await expect.element(settingsScreen.successToast()).toHaveTextContent("All content deleted from database.");
        await expect(settingsScreen.confirmationModal()).toHaveCount(0);
        await expect.poll(() => api.requests.length).toBe(1);
    });

    it("resets authentication when the feature is enabled", async () => {
        fakeSettingsScreens();
        // Success intentionally navigates to /ghost/ after locking users;
        // the isolated E2E danger-zone test covers that successful mutation.
        const api = fakeAdminEndpoint("POST", "/authentication/reset/", {errors: [{message: "stop after request"}]}, {status: 400});
        await renderAdminApp("/settings/advanced", {labs: {dangerZoneResetAuth: true}});

        await settingsScreen.section("dangerzone").getByRole("button", {name: "Reset all authentication"}).click();
        await settingsScreen.confirmationModal().getByRole("button", {name: "Reset all authentication"}).click();

        await expect.poll(() => api.requests.length).toBe(1);
    });

    it("resets all gift links and reports the affected count", async () => {
        fakeSettingsScreens();
        const api = fakeAdminEndpoint("PUT", "/gift_links/remove_all/", {meta: {count: 3}});
        await renderAdminApp("/settings/advanced");

        await settingsScreen.section("dangerzone").getByTestId("reset-all-gift-links").getByRole("button", {name: "Reset"}).click();
        await settingsScreen.confirmationModal().getByRole("button", {name: "Reset all gift links"}).click();

        await expect.element(settingsScreen.successToast()).toHaveTextContent(/Reset 3 gift links/);
        await expect.poll(() => api.requests.length).toBe(1);
    });

    it.each([
        {input: "spam.xyz\njunk.com", saved: '["spam.xyz","junk.com"]'},
        {input: "hello@Spam.xyz\n@junk.com", saved: '["spam.xyz","junk.com"]'},
    ])("normalises and saves blocked email domains", async ({input, saved}) => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings/spam-filters");

        const section = settingsScreen.section("spam-filters");
        await section.getByLabelText("Blocked email domains").fill(input);
        await section.getByRole("button", {name: "Save"}).click();

        await expect(settingsApi).toHaveEditedSettings([{key: "blocked_email_domains", value: saved}]);
    });

    it.each([
        {input: "", saved: "[]"},
        {input: "spam.xyz\njunk.com", saved: '["spam.xyz","junk.com"]'},
    ])("reads and updates existing blocked email domains", async ({input, saved}) => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings/spam-filters", {
            boot: {browseSettings: {response: advancedSettings({blocked_email_domains: '["initial.xyz","junk.com"]'})}},
        });

        const section = settingsScreen.section("spam-filters");
        await expect.element(section.getByLabelText("Blocked email domains")).toHaveValue("initial.xyz\njunk.com");
        await section.getByLabelText("Blocked email domains").fill(input);
        await section.getByRole("button", {name: "Save"}).click();

        await expect(settingsApi).toHaveEditedSettings([{key: "blocked_email_domains", value: saved}]);
    });

    it("opens every built-in migrator in its external Admin route", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings/migration");

        const section = settingsScreen.section("migrationtools");
        for (const [name, route] of [
            ["Substack", "/migrate/substack"],
            ["beehiiv", "/migrate/beehiiv"],
            ["WordPress", "/migrate/wordpress"],
            ["Squarespace", "/migrate/squarespace"],
            ["Medium", "/migrate/medium"],
            ["Mailchimp", "/migrate/mailchimp"],
        ]) {
            await section.getByRole("button", {name}).click();
            expect(JSON.parse(document.body.dataset.externalNavigate ?? "null")).toMatchObject({route, isExternal: true});
        }
    });

    it("downloads the content and settings export", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings/migration");

        const section = settingsScreen.section("migrationtools");
        await section.getByRole("tab", {name: "Export"}).click();
        await section.getByRole("button", {name: "Content & settings"}).click();

        await expect.poll(() => document.querySelector<HTMLIFrameElement>("iframe#iframeDownload")?.src).toMatch(/\/api\/admin\/db\/$/);
    });

    it.each([
        {kind: "redirects", uploadPath: "/redirects/upload/", downloadPath: "/redirects/download/", filename: "redirects.yml"},
        {kind: "routes", uploadPath: "/settings/routes/yaml/", downloadPath: "/settings/routes/yaml/", filename: "routes.yml"},
    ])("uploads and downloads $kind from Labs", async ({kind, uploadPath, downloadPath, filename}) => {
        fakeSettingsScreens();
        const uploadApi = fakeAdminEndpoint("POST", uploadPath, {});
        fakeAdminEndpoint("GET", downloadPath, {});
        await renderAdminApp("/settings/labs");

        const section = settingsScreen.section("labs");
        await section.getByRole("button", {name: "Open"}).click();
        await section.getByRole("tab", {name: "Beta features"}).click();
        const input = section.element().querySelector<HTMLInputElement>(`#upload-${kind}`);
        if (!input) {
            throw new Error(`${kind} upload input was not rendered`);
        }
        await page.elementLocator(input).upload(new File([`${kind}: test`], filename, {type: "text/yaml"}));
        await expect.element(settingsScreen.successToast()).toHaveTextContent(new RegExp(`${kind} uploaded`, "i"));
        expect(uploadApi.requests).toHaveLength(1);

        await section.getByRole("button", {name: `Download current ${kind}`}).click();
        await expect.poll(() => document.querySelector<HTMLIFrameElement>("iframe#iframeDownload")?.src).toContain(downloadPath);
    });

    it.each([
        {kind: "redirects", modalTestId: "modal-redirects-editor", heading: "Redirects", uploadPath: "/redirects/upload/", downloadPath: "/redirects/download/", yaml: "301:\n  /old/: /new/\n", successText: /redirects updated/i},
        {kind: "routes", modalTestId: "modal-routes-editor", heading: "Routes", uploadPath: "/settings/routes/yaml/", downloadPath: "/settings/routes/yaml/", yaml: "routes:\n  /about/: about\n", successText: /routes updated/i},
    ])("edits $kind inline from Labs", async ({kind, modalTestId, heading, uploadPath, downloadPath, yaml, successText}) => {
        fakeSettingsScreens();
        const uploadApi = fakeAdminEndpoint("POST", uploadPath, {});
        fakeAdminEndpoint("GET", downloadPath, new TextEncoder().encode(yaml).buffer, {contentType: "text/yaml"});
        await renderAdminApp("/settings/labs");

        const section = settingsScreen.section("labs");
        await section.getByRole("button", {name: "Open"}).click();
        await section.getByRole("tab", {name: "Beta features"}).click();
        await section.getByTestId(kind).getByRole("button", {name: "Edit"}).click();

        const modal = page.getByTestId(modalTestId);
        await expect.element(modal.getByRole("heading", {name: heading})).toBeVisible();

        const editor = modal.getByRole("textbox").first();
        await expect.element(editor).toBeVisible();
        await editor.fill(`${yaml}# edited\n`);
        await modal.getByRole("button", {name: "Save"}).click();

        await expect.element(settingsScreen.successToast()).toHaveTextContent(successText);
        await expect.poll(() => uploadApi.requests.length).toBe(1);
        await expect(modal).toHaveCount(0);
    });

    it("shows a validation error and keeps the editor open when saving invalid redirects", async () => {
        const errorMessage = "Could not parse YAML: end of the stream or a document separator is expected.";
        fakeSettingsScreens();
        fakeAdminEndpoint("GET", "/redirects/download/", new TextEncoder().encode("301:\n  /old/: /new/\n").buffer, {contentType: "text/yaml"});
        fakeAdminEndpoint("POST", "/redirects/upload/", {errors: [{type: "BadRequestError", message: errorMessage}]}, {status: 400});
        await renderAdminApp("/settings/labs");

        const section = settingsScreen.section("labs");
        await section.getByRole("button", {name: "Open"}).click();
        await section.getByRole("tab", {name: "Beta features"}).click();
        await section.getByTestId("redirects").getByRole("button", {name: "Edit"}).click();

        const modal = page.getByTestId("modal-redirects-editor");
        const editor = modal.getByRole("textbox").first();
        await expect.element(editor).toBeVisible();
        await modal.getByRole("button", {name: "Save"}).click();

        await expect.element(modal.getByTestId("yaml-editor-error")).toHaveTextContent(errorMessage);
        await expect.element(modal).toBeVisible();
        await expect(settingsScreen.successToast()).toHaveCount(0);
    });

    it("browses and filters history using the expected NQL", async () => {
        fakeSettingsScreens();
        const usersApi = fakeUsers(currentUserResponse().users as unknown as StaffUser[]);
        const actor = {id: "1", name: "Jamie Larson", slug: "main", image: null};
        const actions = [
            {id: "security", resource_id: null, resource_type: "security_action", actor_id: "1", actor_type: "user", event: "edited", context: '{"action_name":"reset_authentication","api_keys_rotated":4,"users_locked":3}', created_at: "2023-08-11T12:37:02.000Z", actor},
            ...["setting-1", "setting-2"].map((id, index) => ({id, resource_id: "setting", resource_type: "setting", actor_id: "1", actor_type: "user", event: "edited", context: '{"key":"navigation","group":"site"}', created_at: `2023-08-11T12:3${index}:02.000Z`, actor, resource: {id: "setting", slug: "navigation"}})),
            ...["post-1", "post-2"].map((id, index) => ({id, resource_id: "post", resource_type: "post", actor_id: "1", actor_type: "user", event: "edited", context: '{"type":"page","primary_name":"The Clunkers Hall of Shame"}', created_at: `2023-08-11T12:2${index}:02.000Z`, actor, resource: {id: "post", slug: "clunkers", title: "The Clunkers Hall of Shame"}})),
        ];
        const actionsApi = fakeActions(({filter}) => filter?.includes("post") ? actions.filter(action => action.resource_type !== "post") : actions);
        await renderAdminApp("/settings/history");

        await settingsScreen.section("history").getByRole("button", {name: "View history"}).click();
        const modal = settingsScreen.section("history-modal");
        await expect.element(modal).toHaveTextContent(/Settings edited: Site \(navigation\) 2 times/);
        await expect.element(modal).toHaveTextContent(/Page edited: The Clunkers Hall of Shame 2 times/);
        await expect.element(modal).toHaveTextContent(/Security action reset authentication: 4 API keys rotated, 3 users locked/);
        await expect.poll(() => actionsApi.requests.length).toBeGreaterThan(0);
        const initialQuery = new URL(actionsApi.requests[0].url).searchParams;
        expect(initialQuery.get("include")).toBe("actor,resource");
        expect(initialQuery.get("limit")).toBe("200");
        expect(initialQuery.get("filter")).toBe("resource_type:-[label]");

        await modal.getByRole("button", {name: "Filter"}).click();
        const filters = page.getByTestId("history-filters");
        await filters.getByLabelText("Posts").click();
        await expect(actionsApi).toHaveSentFilter("resource_type:-[label,post]");
        await expect(modal.getByText(/Page edited/)).toHaveCount(0);

        await filters.getByLabelText("Deleted").click();
        await expect(actionsApi).toHaveSentFilter("event:-[deleted]+resource_type:-[label,post]");
        await expect.poll(() => usersApi.requests.some(request => request.limit === 20)).toBe(true);

        const staffFilter = modal.getByTestId("history-staff-filter");
        await staffFilter.click();
        await page.getByRole("option", {name: "Owner User"}).click();
        await expect.poll(() => new URL(actionsApi.requests.at(-1)!.url).searchParams.get("filter")).toContain("actor_id:");

        const clearButton = modal.getByRole("button", {name: "Clear selection"});
        const clearIndicator = clearButton.element();
        const dropdownIndicator = staffFilter.element().querySelector("svg");
        expect(dropdownIndicator).not.toBeNull();
        const indicatorGap = dropdownIndicator!.getBoundingClientRect().left - clearIndicator.getBoundingClientRect().right;
        expect(indicatorGap).toBeGreaterThanOrEqual(8);
        await clearButton.click();
        await expect.element(staffFilter).toHaveTextContent("Search staff");
        await expect.poll(currentRoute).toBe("/settings/history/view");

        await modal.getByRole("button", {name: "Close"}).click();
        await expect(modal).toHaveCount(0);
    });

    it("hydrates the staff filter from a history route", async () => {
        const user = currentUserResponse().users[0] as unknown as StaffUser;
        fakeSettingsScreens();
        fakeUsers([user]);
        fakeActions([]);

        await renderAdminApp(`/settings/history/view/${user.id}`);

        const modal = settingsScreen.section("history-modal");
        const staffFilter = modal.getByTestId("history-staff-filter");
        await expect.element(staffFilter).toHaveTextContent(user.name);
        await expect.element(modal.getByRole("button", {name: "Clear selection"})).toBeVisible();
    });
});
