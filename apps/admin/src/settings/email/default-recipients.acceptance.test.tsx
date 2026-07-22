import {describe, expect, it} from "vitest";
import {page} from "vitest/browser";

import {
    fakeEditSettings,
    fakeAdminEndpoint,
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
    it.each([
        {choice: "All members", filter: "status:free,status:-free"},
        {choice: "Usually nobody", filter: null},
        {choice: "Paid-members only", filter: "status:-free"},
    ])("saves the standard recipient choice: $choice", async ({choice, filter}) => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings/newsletters");

        const section = settingsScreen.defaultRecipients();
        await expect.element(section.getByText("Whoever has access to the post", {exact: true})).toBeVisible();

        await selectDefaultRecipients(choice);
        await expect.element(settingsScreen.defaultRecipientsSelect()).toHaveTextContent(choice);
        await section.getByRole("button", {name: "Save"}).click();

        await expect(settingsApi).toHaveEditedSettings([
            {key: "editor_default_email_recipients", value: "filter"},
            {key: "editor_default_email_recipients_filter", value: filter},
        ]);
        expect(settingsApi.requests).toHaveLength(1);
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
        await expect.element(page.getByText("Labels", {exact: true})).toBeVisible();
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

    it("restores the saved segment when cancelling changes", async () => {
        const savedTier = tier({id: "645453f4d254799990dd0e22", name: "Basic Supporter"});
        const addedTier = tier({id: "645453f4d254799990dd0e23", name: "Premium Supporter"});
        fakeSettingsScreens();
        fakeTiers([savedTier, addedTier]);
        fakeLabels([]);
        fakeOffers([]);
        const settings = settingsResponse({settings: {
            editor_default_email_recipients: "filter",
            editor_default_email_recipients_filter: savedTier.id,
        }});
        await renderAdminApp("/settings/newsletters", {boot: {browseSettings: {response: settings}}});

        const section = settingsScreen.defaultRecipients();
        const filter = section.getByLabelText("Filter");
        await expect.element(filter).toHaveTextContent(savedTier.name);
        await filter.click();
        await settingsScreen.selectOption(addedTier.name).click();
        await expect.element(filter).toHaveTextContent(addedTier.name);
        await section.getByRole("button", {name: "Cancel"}).click();

        await expect.element(filter).toHaveTextContent(savedTier.name);
        await expect.element(filter).not.toHaveTextContent(addedTier.name);
    });

    it("retries failed segment hydration without dropping the saved filter", async () => {
        const savedTier = tier({id: "645453f4d254799990dd0e22", name: "Basic Supporter"});
        const addedTier = tier({id: "645453f4d254799990dd0e23", name: "Premium Supporter"});
        fakeSettingsScreens();
        fakeLabels([]);
        fakeOffers([]);
        fakeAdminEndpoint(
            "GET",
            "/tiers/?filter=&limit=20",
            {errors: [{message: "temporary failure"}]},
            {status: 400},
        );
        const settingsApi = fakeEditSettings();
        const settings = settingsResponse({settings: {
            editor_default_email_recipients: "filter",
            editor_default_email_recipients_filter: savedTier.id,
        }});
        await renderAdminApp("/settings/newsletters", {boot: {browseSettings: {response: settings}}});

        const section = settingsScreen.defaultRecipients();
        const filter = section.getByLabelText("Filter");
        await expect.element(filter).toHaveTextContent("Retry loading saved filter");

        fakeTiers([savedTier, addedTier]);
        await filter.click();
        await expect.element(filter).toHaveTextContent(savedTier.name);
        await filter.click();
        await settingsScreen.selectOption(addedTier.name).click();
        await section.getByRole("button", {name: "Save"}).click();

        await expect(settingsApi).toHaveEditedSettings([
            {key: "editor_default_email_recipients_filter", value: `${savedTier.id},${addedTier.id}`},
        ]);
    });
});
