import {describe, expect, it} from "vitest";

import {
    fakeEditSettings,
    fakeLabels,
    fakeOffers,
    fakeSettingsScreens,
    fakeTiers,
    label,
    offer,
    renderAdminApp,
    settingsResponse,
    tier,
} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";

async function selectDefaultRecipients(name: string) {
    await settingsScreen.defaultRecipientsSelect().click();
    await settingsScreen.selectOption(name).click();
}

describe("Default recipient settings", () => {
    it("saves the standard recipient choices", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings/newsletters");

        const section = settingsScreen.defaultRecipients();
        await expect.element(section.getByText("Whoever has access to the post", {exact: true})).toBeVisible();

        await selectDefaultRecipients("All members");
        await section.getByRole("button", {name: "Save"}).click();
        await expect.element(section.getByRole("button", {name: "Saved"})).toBeVisible();
        await expect(settingsApi).toHaveEditedSettings([
            {key: "editor_default_email_recipients", value: "filter"},
            {key: "editor_default_email_recipients_filter", value: "status:free,status:-free"},
        ]);

        await selectDefaultRecipients("Usually nobody");
        await section.getByRole("button", {name: "Save"}).click();
        await expect.element(section.getByRole("button", {name: "Saved"})).toBeVisible();
        await expect(settingsApi).toHaveEditedSettings([
            {key: "editor_default_email_recipients", value: "filter"},
            {key: "editor_default_email_recipients_filter", value: null},
        ]);

        await selectDefaultRecipients("Paid-members only");
        await section.getByRole("button", {name: "Save"}).click();
        await expect.element(section.getByRole("button", {name: "Saved"})).toBeVisible();
        await expect.element(settingsScreen.defaultRecipientsSelect()).toHaveTextContent("Paid-members only");
        await expect(settingsApi).toHaveEditedSettings([
            {key: "editor_default_email_recipients", value: "filter"},
            {key: "editor_default_email_recipients_filter", value: "status:-free"},
        ]);
    });

    it("selects tiers, labels, and offers as a specific segment", async () => {
        const supporter = tier({id: "645453f4d254799990dd0e22", name: "Basic Supporter"});
        const firstLabel = label({name: "first-label", slug: "first-label"});
        const firstOffer = offer({id: "6487ea6464fca78ec2fff5fe", name: "First offer"});
        fakeSettingsScreens();
        fakeTiers([supporter]);
        fakeLabels([firstLabel]);
        fakeOffers([firstOffer]);
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings/newsletters");

        const section = settingsScreen.defaultRecipients();
        await selectDefaultRecipients("Specific people");
        await section.getByLabelText("Filter").click();
        await settingsScreen.selectOption(supporter.name).click();
        await settingsScreen.selectOption(firstLabel.name).click();
        await settingsScreen.selectOption(firstOffer.name).click();
        await section.getByRole("button", {name: "Save"}).click();

        await expect.element(section.getByRole("button", {name: "Saved"})).toBeVisible();
        await expect.element(settingsScreen.defaultRecipientsSelect()).toHaveTextContent("Specific people");
        await expect(settingsApi).toHaveEditedSettings([
            {key: "editor_default_email_recipients", value: "filter"},
            {key: "editor_default_email_recipients_filter", value: `${supporter.id},label:${firstLabel.slug},offer_redemptions:${firstOffer.id}`},
        ]);
    });

    it("hydrates an existing specific segment", async () => {
        const supporter = tier({id: "645453f4d254799990dd0e22", name: "Basic Supporter"});
        const firstLabel = label({name: "first-label", slug: "first-label"});
        const firstOffer = offer({id: "6487ea6464fca78ec2fff5fe", name: "First offer"});
        fakeSettingsScreens();
        fakeTiers([supporter]);
        fakeLabels([firstLabel]);
        fakeOffers([firstOffer]);
        const settings = settingsResponse({settings: {
            editor_default_email_recipients: "filter",
            editor_default_email_recipients_filter: `${supporter.id},label:${firstLabel.slug},offer_redemptions:${firstOffer.id}`,
        }});
        await renderAdminApp("/settings/newsletters", {boot: {browseSettings: {response: settings}}});

        const section = settingsScreen.defaultRecipients();
        await expect.element(section.getByText("Specific people", {exact: true})).toBeVisible();
        await expect.element(section.getByText(supporter.name, {exact: true})).toBeVisible();
        await expect.element(section.getByText(firstLabel.name, {exact: true})).toBeVisible();
        await expect.element(section.getByText(firstOffer.name, {exact: true})).toBeVisible();
    });
});
