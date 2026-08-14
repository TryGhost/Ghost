import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { fakeEditSettings, fakeSettingsScreens, renderAdminApp } from "@test-utils/acceptance";
import * as sel from "@tryghost/test-data/selectors/settings";
import { settingsScreen } from "@/settings/settings.screen";

function primaryNavigation() {
    return settingsScreen.navigationModal().getByRole("tabpanel").first();
}

function existingItem(index = 0) {
    return primaryNavigation().getByTestId(sel.navigationItemEditor).nth(index);
}

function newItem() {
    return primaryNavigation().getByTestId(sel.newNavigationItem);
}

describe("Navigation settings", () => {
    it("edits primary and secondary navigation", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings/navigation/edit");

        await existingItem().getByLabelText("Label").fill("existing item label");
        await existingItem().getByLabelText("URL").fill("/existing");
        await newItem().getByLabelText("Label").fill("new item label");
        await newItem().getByLabelText("URL").fill("/new");

        const modal = settingsScreen.navigationModal();
        await modal.getByRole("tab", { name: "Secondary" }).click();
        const secondary = modal.getByRole("tabpanel").last();
        const secondaryItem = secondary.getByTestId(sel.navigationItemEditor).first();
        await secondaryItem.getByLabelText("Label").fill("existing item 2");
        await secondaryItem.getByLabelText("URL").fill("/existing2");
        const newSecondary = secondary.getByTestId(sel.newNavigationItem);
        await newSecondary.getByLabelText("Label").fill("new item 2");
        await newSecondary.getByLabelText("URL").click();
        await userEvent.keyboard("{Backspace}");
        await newSecondary.getByLabelText("URL").fill("https://google.com");
        await newSecondary.getByLabelText("Label").click();
        await modal.getByRole("button", { name: "Save" }).click();

        await expect(modal).toHaveCount(0);
        await expect(settingsApi).toHaveEditedSettings([
            { key: "navigation", value: '[{"url":"/existing/","label":"existing item label"},{"url":"/about/","label":"About"},{"url":"/new/","label":"new item label"}]' },
            { key: "secondary_navigation", value: '[{"url":"/existing2/","label":"existing item 2"},{"url":"https://google.com","label":"new item 2"}]' },
        ]);
    });

    it("validates existing items and clears errors while editing", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings/navigation/edit");

        const item = existingItem();
        await item.getByLabelText("Label").fill("");
        await item.getByLabelText("URL").click();
        await userEvent.keyboard("{Backspace}google.com");
        await userEvent.tab();
        await settingsScreen.navigationModal().getByRole("button", { name: "Save" }).click();
        await expect.element(item).toHaveTextContent(/You must specify a label/);
        await expect.element(item).toHaveTextContent(/You must specify a valid URL or relative path/);

        await item.getByLabelText("Label").click();
        await userEvent.keyboard("A");
        await expect(item.getByText("You must specify a label")).toHaveCount(0);
        await item.getByLabelText("URL").click();
        await userEvent.keyboard("A");
        await expect(item.getByText("You must specify a valid URL or relative path")).toHaveCount(0);
    });

    it("validates and adds a new item", async () => {
        fakeSettingsScreens();
        await renderAdminApp("/settings/navigation/edit");

        await expect(primaryNavigation().getByTestId(sel.navigationItemEditor)).toHaveCount(2);
        const item = newItem();
        await item.getByLabelText("Label").fill("");
        await item.getByLabelText("URL").click();
        await userEvent.keyboard("{Backspace}google.com");
        await userEvent.tab();
        await item.getByTestId(sel.addButton).click();
        await expect.element(item).toHaveTextContent(/You must specify a label/);
        await expect.element(item).toHaveTextContent(/You must specify a valid URL or relative path/);

        await item.getByLabelText("Label").fill("Label");
        await item.getByLabelText("URL").click();
        await userEvent.keyboard("{Backspace}");
        await item.getByLabelText("URL").fill("https://google.com");
        await userEvent.tab();
        await item.getByTestId(sel.addButton).click();

        await expect(primaryNavigation().getByTestId(sel.navigationItemEditor)).toHaveCount(3);
        const added = existingItem(2);
        await expect.element(added.getByLabelText("Label")).toHaveValue("Label");
        await expect.element(added.getByLabelText("URL")).toHaveValue("https://google.com/");
        await expect.element(item.getByLabelText("Label")).toHaveValue("");
        await expect.element(item.getByLabelText("URL")).toHaveValue("http://test.com/");
    });

    it("confirms before discarding unsaved changes", async () => {
        fakeSettingsScreens();
        const settingsApi = fakeEditSettings();
        await renderAdminApp("/settings/navigation/edit");

        await newItem().getByLabelText("Label").fill("Label");
        await newItem().getByLabelText("URL").fill("https://google.com");
        await newItem().getByTestId(sel.addButton).click();
        await settingsScreen.navigationModal().getByRole("button", { name: "Close" }).click();

        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
        await settingsScreen.confirmationAction("Leave").click();
        await expect(settingsScreen.navigationModal()).toHaveCount(0);
        expect(settingsApi.requests).toHaveLength(0);
    });
});
