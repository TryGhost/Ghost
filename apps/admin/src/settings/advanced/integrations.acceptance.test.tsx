import {describe, expect, it, vi} from "vitest";
import {page} from "vitest/browser";

import {
    configResponse,
    fakeAdminEndpoint,
    fakeEditSettings,
    fakeIntegrations,
    fakeSettingsScreens,
    renderAdminApp,
} from "@test-utils/acceptance";
import type {Integration} from "@tryghost/admin-x-framework/api/integrations";
import {settingsScreen} from "@/settings/settings.screen";

const created = "2023-01-01T00:00:00.000Z";

function integration(overrides: Partial<Integration> = {}): Integration {
    return {
        id: "integration-id",
        type: "builtin",
        slug: "zapier",
        name: "Zapier",
        icon_image: null,
        description: null,
        created_at: created,
        updated_at: created,
        api_keys: [],
        webhooks: [],
        ...overrides,
    };
}

function apiKey(secret: string) {
    return {
        id: "admin-key-id",
        type: "admin" as const,
        secret,
        role_id: "role-id",
        integration_id: "integration-id",
        user_id: "user-id",
        last_seen_at: null,
        last_seen_version: null,
        created_at: created,
        updated_at: created,
    };
}

function limitedConfig() {
    const response = configResponse();
    response.config.labs = {...response.config.labs, transistor: true};
    response.config.hostSettings = {limits: {customIntegrations: {disabled: true, error: "Your plan does not support custom integrations"}}};
    return response;
}

async function openIntegration(name: string, testId: string) {
    const section = settingsScreen.section("integrations");
    const item = section.getByTestId(testId);
    await item.getByText(name, {exact: true}).hover();
    await item.getByRole("button", {name: "Configure"}).click();
}

function customIntegration() {
    return integration({
        id: "custom-id",
        type: "custom",
        slug: "my-integration",
        name: "My integration",
        api_keys: [apiKey("admin-api-secret"), {...apiKey("content-api-secret"), id: "content-key-id", type: "content"}],
    });
}

function customWebhook() {
    return {
        id: "webhook-id",
        event: "post.created",
        target_url: "https://example.com",
        name: "My webhook",
        secret: null,
        api_version: "v3",
        integration_id: "custom-id",
        last_triggered_at: null,
        last_triggered_status: null,
        last_triggered_error: null,
        created_at: created,
        updated_at: created,
    };
}

async function openCustomIntegration() {
    const section = settingsScreen.section("integrations");
    await section.getByRole("tab", {name: "Custom"}).click();
    await section.getByText("My integration", {exact: true}).click();
    return settingsScreen.section("custom-integration-modal");
}

describe("Advanced integrations", () => {
    it("creates, edits, and deletes a custom integration with dirty-state protection", async () => {
        fakeSettingsScreens();
        fakeIntegrations([]);
        const custom = customIntegration();
        const createApi = fakeAdminEndpoint("POST", /^\/integrations\/\?include=/, {integrations: [custom]});
        const editApi = fakeAdminEndpoint("PUT", /^\/integrations\/custom-id\/\?include=/, {integrations: [{...custom, description: "Test description"}]});
        const deleteApi = fakeAdminEndpoint("DELETE", "/integrations/custom-id/", null);
        await renderAdminApp("/settings/integrations");

        const section = settingsScreen.section("integrations");
        await section.getByRole("button", {name: "Add custom integration"}).click();
        const createModal = settingsScreen.section("add-integration-modal");
        await createModal.getByRole("button", {name: "Add"}).click();
        await expect.element(createModal).toHaveTextContent(/Name is required/);
        await createModal.getByLabelText("Name").fill("My integration");
        await createModal.getByRole("button", {name: "Add"}).click();
        await expect.poll(() => createApi.requests.length).toBe(1);

        const modal = settingsScreen.section("custom-integration-modal");
        await modal.getByLabelText("Description").fill("Test description");
        await modal.getByRole("button", {name: "Close"}).click();
        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
        await settingsScreen.confirmationAction("Stay").click();

        await modal.getByLabelText("Description").fill("Test description");
        await modal.getByRole("button", {name: "Save"}).click();
        await expect.element(section).toHaveTextContent(/Test description/);
        expect(editApi.requests).toHaveLength(1);
        await modal.getByRole("button", {name: "Close"}).click();

        await section.getByText("My integration").hover();
        await section.getByRole("button", {name: "Delete"}).click();
        await settingsScreen.confirmationModal().getByRole("button", {name: "Delete integration"}).click();
        await expect.poll(() => deleteApi.requests.length).toBe(1);
        await expect(section.getByText("My integration")).toHaveCount(0);
    });

    it("regenerates a custom integration Admin API key", async () => {
        fakeSettingsScreens();
        const custom = customIntegration();
        fakeIntegrations([custom]);
        const refreshApi = fakeAdminEndpoint("POST", /^\/integrations\/.+\/api_key\/.+\/refresh\/$/, {integrations: [{...custom, api_keys: [apiKey("new-api-key")]}]});
        await renderAdminApp("/settings/integrations");

        const modal = await openCustomIntegration();
        await expect.element(modal).toHaveTextContent(/admin-api-secret/);
        await modal.getByText("admin-api-secret").hover();
        await modal.getByRole("button", {name: "Regenerate"}).click();
        await settingsScreen.confirmationModal().getByRole("button", {name: "Regenerate Admin API Key"}).click();
        await expect.element(modal).toHaveTextContent(/Admin API Key was successfully regenerated/);
        await expect.element(modal).toHaveTextContent(/new-api-key/);
        expect(refreshApi.requests).toHaveLength(1);
    });

    it("creates, edits, and deletes custom integration webhooks", async () => {
        fakeSettingsScreens();
        const custom = customIntegration();
        const webhook = customWebhook();
        fakeIntegrations([custom]);
        const createWebhookApi = fakeAdminEndpoint("POST", "/webhooks/", {webhooks: [webhook]});
        const editWebhookApi = fakeAdminEndpoint("PUT", "/webhooks/webhook-id/", {webhooks: [{...webhook, name: "Updated webhook"}]});
        const deleteWebhookApi = fakeAdminEndpoint("DELETE", "/webhooks/webhook-id/", null);
        await renderAdminApp("/settings/integrations");

        const modal = await openCustomIntegration();
        await modal.getByRole("button", {name: "Add webhook"}).click();
        const webhookModal = settingsScreen.section("webhook-modal");
        await webhookModal.getByLabelText("Name").fill("My webhook");
        await webhookModal.getByLabelText("Target URL").fill("https://example.com");
        await webhookModal.getByTestId("event-select").click();
        await settingsScreen.selectOption("Post created").click();
        await webhookModal.getByRole("button", {name: "Add"}).click();
        await expect.element(modal).toHaveTextContent(/My webhook/);
        expect(createWebhookApi.requests).toHaveLength(1);

        await modal.getByText("My webhook").click();
        await webhookModal.getByLabelText("Name").fill("Updated webhook");
        await webhookModal.getByRole("button", {name: "Update"}).click();
        await modal.getByText("Updated webhook").hover();
        await modal.getByRole("button", {name: "Delete"}).click();
        await settingsScreen.confirmationModal().getByRole("button", {name: "Delete webhook"}).click();
        expect(editWebhookApi.requests).toHaveLength(1);
        await expect.poll(() => deleteWebhookApi.requests.length).toBe(1);
        await expect(modal.getByText("Updated webhook")).toHaveCount(0);
    });

    it("blocks custom integration creation when the host limit is active", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings/integrations", {boot: {browseConfig: {response: limitedConfig()}}});

        await settingsScreen.section("integrations").getByRole("button", {name: "Add custom integration"}).click();
        await expect.element(settingsScreen.limitModal()).toHaveTextContent(/Your plan does not support custom integrations/);
    });

    it("shows only Unsplash as active in the initial integration list", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings/integrations");

        const section = settingsScreen.section("integrations");
        for (const id of ["zapier-integration", "slack-integration", "firstpromoter-integration", "pintura-integration"]) {
            await expect(section.getByTestId(id).getByText("Active", {exact: true})).toHaveCount(0);
        }
        await expect.element(section.getByTestId("unsplash-integration").getByText("Active", {exact: true})).toBeVisible();
    });

    it("saves FirstPromoter configuration and warns before discarding later changes", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings/integrations");

        await openIntegration("FirstPromoter", "firstpromoter-integration");
        const modal = settingsScreen.section("firstpromoter-modal");
        await modal.getByRole("switch").click();
        await modal.getByRole("textbox").fill("123456789");
        await modal.getByRole("button", {name: "Save"}).click();
        await expect(settingsApi).toHaveEditedSettings([
            {key: "firstpromoter", value: true},
            {key: "firstpromoter_id", value: "123456789"},
        ]);

        await modal.getByRole("switch").click();
        await modal.getByRole("button", {name: "Close"}).click();
        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
        await settingsScreen.confirmationAction("Leave").click();
        await expect(modal).toHaveCount(0);
        expect(settingsApi.requests).toHaveLength(1);
    });

    it("validates and saves Slack configuration through the modal action", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings/integrations");

        await openIntegration("Slack", "slack-integration");
        const modal = settingsScreen.section("slack-modal");
        await modal.getByLabelText("Webhook URL").fill("badurl");
        await modal.getByRole("button", {name: "Save"}).click();
        await expect.element(modal).toHaveTextContent(/The URL must be in a format like/);
        expect(settingsApi.requests).toHaveLength(0);

        const url = "https://hooks.slack.com/services/123456789/123456789/123456789";
        await modal.getByLabelText("Webhook URL").fill(url);
        await modal.getByLabelText("Username").fill("My site");
        await modal.getByRole("button", {name: "Save"}).click();
        await expect(settingsApi).toHaveEditedSettings([
            {key: "slack_url", value: url},
            {key: "slack_username", value: "My site"},
        ]);
        await modal.getByRole("button", {name: "Close"}).click();
        await expect(modal).toHaveCount(0);
    });

    it("saves valid Slack settings before sending a test notification", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        const testApi = fakeAdminEndpoint("POST", "/slack/test/", {});
        await renderAdminApp("/settings/integrations");

        await openIntegration("Slack", "slack-integration");
        const modal = settingsScreen.section("slack-modal");
        const url = "https://hooks.slack.com/services/123456789/123456789/123456789";
        await modal.getByLabelText("Webhook URL").fill(url);
        await modal.getByLabelText("Username").fill("My site");
        await modal.getByRole("button", {name: "Send test notification"}).click();
        await expect.element(settingsScreen.infoToast()).toHaveTextContent(/Check your Slack channel/);
        expect(testApi.requests).toHaveLength(1);
        await expect(settingsApi).toHaveEditedSettings([
            {key: "slack_url", value: url},
            {key: "slack_username", value: "My site"},
        ]);
    });

    it("warns before discarding unsaved Slack changes", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings/integrations");

        await openIntegration("Slack", "slack-integration");
        const modal = settingsScreen.section("slack-modal");
        await modal.getByLabelText("Webhook URL").fill("https://hooks.slack.com/services/1/2/3");
        await modal.getByRole("button", {name: "Close"}).click();
        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
        await settingsScreen.confirmationAction("Leave").click();
        await expect(modal).toHaveCount(0);
        expect(settingsApi.requests).toHaveLength(0);
    });

    it("uploads both Pintura assets and stores their returned URLs", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        let uploadCount = 0;
        const uploadApi = fakeAdminEndpoint("POST", "/files/upload/", () => {
            const url = uploadCount === 0 ? "http://example.com/pintura-umd.js" : "http://example.com/pintura.css";
            uploadCount += 1;
            return {files: [{url, ref: null}]};
        });
        await renderAdminApp("/settings/integrations");

        await openIntegration("Pintura", "pintura-integration");
        const modal = settingsScreen.section("pintura-modal");
        await modal.getByRole("switch").click();
        await expect.element(modal).toHaveTextContent(/Upload Pintura script/);
        await expect.element(modal).toHaveTextContent(/Upload Pintura styles/);
        const inputs = modal.element().querySelectorAll<HTMLInputElement>('input[type="file"]');
        const uploadButtons = modal.getByRole("button", {name: "Upload"});

        const jsInputClick = vi.spyOn(inputs[0], "click").mockImplementation(() => undefined);
        await uploadButtons.nth(0).click();
        expect(jsInputClick).toHaveBeenCalledOnce();
        jsInputClick.mockRestore();
        await page.elementLocator(inputs[0]).upload(new File(["script"], "pintura-umd.js", {type: "text/javascript"}));
        await expect(settingsApi).toHaveEditedSettings([{key: "pintura_js_url", value: "http://example.com/pintura-umd.js"}]);

        const cssInputClick = vi.spyOn(inputs[1], "click").mockImplementation(() => undefined);
        await uploadButtons.nth(1).click();
        expect(cssInputClick).toHaveBeenCalledOnce();
        cssInputClick.mockRestore();
        await page.elementLocator(inputs[1]).upload(new File(["styles"], "pintura.css", {type: "text/css"}));
        await expect(settingsApi).toHaveEditedSettings([{key: "pintura_css_url", value: "http://example.com/pintura.css"}]);
        expect(uploadApi.requests).toHaveLength(2);
    });

    it("shows and regenerates the Zapier Admin API key", async () => {
        fakeSettingsScreens();
        const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
        const zapier = integration({id: "zapier-id", api_keys: [apiKey("zapier-api-secret")]});
        fakeIntegrations([zapier]);
        const refreshApi = fakeAdminEndpoint("POST", /^\/integrations\/.+\/api_key\/.+\/refresh\/$/, {integrations: [{...zapier, api_keys: [apiKey("new-api-key")]}]});
        await renderAdminApp("/settings/integrations");

        await openIntegration("Zapier", "zapier-integration");
        const modal = settingsScreen.section("zapier-modal");
        await expect.element(modal).toHaveTextContent(/zapier-api-secret/);
        await modal.getByText("zapier-api-secret").hover();
        await modal.getByRole("button", {name: "Copy"}).click();
        await expect(modal.getByRole("button", {name: "Copied"})).toHaveCount(1);
        expect(writeText).toHaveBeenCalledWith("zapier-api-secret");
        await modal.getByRole("button", {name: "Regenerate"}).click();
        await settingsScreen.confirmationModal().getByRole("button", {name: "Regenerate Admin API Key"}).click();
        await expect.element(modal).toHaveTextContent(/Admin API Key was successfully regenerated/);
        await expect.element(modal).toHaveTextContent(/new-api-key/);
        expect(refreshApi.requests).toHaveLength(1);
        writeText.mockRestore();
    });

    it("moves host-limited integrations to the bottom without disturbing relative order", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings/integrations", {labs: {transistor: true}, boot: {browseConfig: {response: limitedConfig()}}});

        const section = settingsScreen.section("integrations");
        await expect.element(section).toBeVisible();
        const ids = Array.from(section.element().querySelectorAll([
            '[data-testid="zapier-integration"]',
            '[data-testid="slack-integration"]',
            '[data-testid="unsplash-integration"]',
            '[data-testid="firstpromoter-integration"]',
            '[data-testid="pintura-integration"]',
            '[data-testid="transistor-integration"]',
            '[data-testid="content-api-integration"]',
        ].join(","))).map(element => element.getAttribute("data-testid"));

        expect(ids).toEqual([
            "slack-integration",
            "unsplash-integration",
            "firstpromoter-integration",
            "pintura-integration",
            "content-api-integration",
            "zapier-integration",
            "transistor-integration",
        ]);
    });
});
