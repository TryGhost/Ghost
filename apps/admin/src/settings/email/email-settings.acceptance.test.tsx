import {describe, expect, it} from "vitest";

import {fakeAdminEndpoint, fakeSettingsScreens, newsletter, renderAdminApp, settingsResponse} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";

describe("Email settings", () => {
    it("renders newsletter sections in their expected order", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings/newsletters");

        const sections = [
            settingsScreen.enableNewsletters(),
            settingsScreen.defaultRecipients(),
            settingsScreen.newsletters(),
            settingsScreen.mailgun(),
        ];
        for (const section of sections) {
            await expect.element(section).toBeVisible();
        }
        const elements = sections.map(section => section.element());
        expect(elements.every((element, index) => index === 0 || Boolean(elements[index - 1]?.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    });

    it("keeps welcome emails visible when newsletter sending is disabled", async () => {
        fakeSettingsScreens();
        const settings = settingsResponse({settings: {
            editor_default_email_recipients: "disabled",
            editor_default_email_recipients_filter: null,
        }});
        await renderAdminApp("/settings/newsletters", {boot: {browseSettings: {response: settings}}});

        await expect.element(settingsScreen.enableNewsletters()).toBeVisible();
        await expect(settingsScreen.mailgun()).toHaveCount(0);
        await expect(settingsScreen.defaultRecipients()).toHaveCount(0);
        await expect(settingsScreen.newsletters()).toHaveCount(0);
        await expect.element(settingsScreen.memberEmails()).toBeVisible();
    });

    it("redeems a newsletter verification token", async () => {
        fakeSettingsScreens();
        const verifiedNewsletter = newsletter({name: "Verified newsletter", sender_email: "verified@example.com"});
        const verifyApi = fakeAdminEndpoint("PUT", /^\/newsletters\/verifications\/\?include=/, {
            newsletters: [verifiedNewsletter],
            meta: {email_verified: "sender_email"},
        });
        await renderAdminApp("/settings/newsletters/?verifyEmail=fake-token", {labs: {automations: true}});

        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent("Newsletter email verified");
        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(verifiedNewsletter.sender_email!);
        expect(verifyApi.lastRequest?.body).toEqual({token: "fake-token"});
    });

    it("redeems an automation-email verification token", async () => {
        fakeSettingsScreens();
        const verifyApi = fakeAdminEndpoint("PUT", "/automated_emails/verifications/", {
            automated_emails: [],
            meta: {email_verified: "sender_reply_to"},
        });
        await renderAdminApp("/settings/memberemails?verifyEmail=fake-token", {labs: {automations: true}});

        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent("Reply-to address verified");
        expect(verifyApi.lastRequest?.body).toEqual({token: "fake-token"});
    });

    it("finds transactional email settings in search", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings", {labs: {automations: true}});
        await settingsScreen.search().fill("transactional");

        await expect.element(settingsScreen.navItem("Email")).toBeVisible();
        await expect(settingsScreen.noSearchResults()).toHaveCount(0);
    });

    it("keeps automation emails reachable when newsletters are disabled", async () => {
        fakeSettingsScreens();
        const settings = settingsResponse({settings: {
            editor_default_email_recipients: "disabled",
            editor_default_email_recipients_filter: null,
        }});
        await renderAdminApp("/settings/emails", {
            labs: {automations: true},
            boot: {browseSettings: {response: settings}},
        });

        const emails = settingsScreen.emails();
        await expect.element(emails).toBeVisible();
        await expect.element(emails.getByRole("tab", {name: "Automation emails"})).toBeVisible();
        await expect(emails.getByRole("tab", {name: "Newsletters"})).toHaveCount(0);
        await expect(emails.getByRole("button", {name: "Add newsletter"})).toHaveCount(0);
        await expect(settingsScreen.mailgun()).toHaveCount(0);
        await expect(settingsScreen.defaultRecipients()).toHaveCount(0);
    });
});
