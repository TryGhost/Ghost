import {describe, expect, it} from "vitest";
import {userEvent} from "vitest/browser";

import {configResponse, fakeAdminEndpoint, fakeSettingsScreens, renderAdminApp, settingsResponse} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";

const companyField = {
    key: "company",
    name: "Company",
    type: "short_text",
    created_at: "2026-07-13T00:00:00.000Z",
    updated_at: null,
};

function customFieldsBoot() {
    const labs = {membersCustomFields: true};
    return {
        browseConfig: {response: configResponse({labs})},
        browseSettings: {response: settingsResponse({labs})},
    };
}

function fakeCustomFields(fields = [companyField]) {
    return fakeAdminEndpoint("GET", "/members/custom_fields/", {members_custom_fields: fields});
}

async function renderCustomFields() {
    fakeSettingsScreens();
    fakeCustomFields();
    await renderAdminApp("/settings", {boot: customFieldsBoot()});
}

describe("Custom fields", () => {
    it("stays hidden and does not query the closed endpoint while the flag is off", async () => {
        fakeSettingsScreens();
        const customFieldsApi = fakeCustomFields();
        await renderAdminApp("/settings");

        await expect(settingsScreen.customFields()).toHaveCount(0);
        expect(customFieldsApi.requests).toHaveLength(0);
    });

    it("lists each field with its user-facing type", async () => {
        await renderCustomFields();

        const row = settingsScreen.customFields().getByTestId("custom-field-list-item");
        await expect(row).toHaveCount(1);
        await expect.element(row).toHaveTextContent("Company");
        await expect.element(row).toHaveTextContent("Short text");
        await expect.element(row).toHaveTextContent("Aa");
    });

    it("validates and creates a short-text field without sending a key", async () => {
        fakeSettingsScreens();
        fakeCustomFields();
        const createApi = fakeAdminEndpoint("POST", "/members/custom_fields/", {
            members_custom_fields: [{...companyField, key: "job-title", name: "Job Title"}],
        });
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        await settingsScreen.customFields().getByRole("button", {name: "Add custom field"}).click();
        const modal = settingsScreen.customFieldModal();
        await modal.getByRole("button", {name: "Save"}).click();
        await expect.element(modal.getByText("Enter a name for the field")).toBeVisible();

        await modal.getByLabelText("Name").fill("Job Title");
        await modal.getByRole("button", {name: "Save"}).click();

        await expect(modal).toHaveCount(0);
        expect(createApi.lastRequest?.body).toEqual({members_custom_fields: [{name: "Job Title", type: "short_text"}]});
    });

    it("creates the selected long-text field type", async () => {
        fakeSettingsScreens();
        fakeCustomFields();
        const createApi = fakeAdminEndpoint("POST", "/members/custom_fields/", {
            members_custom_fields: [{...companyField, key: "bio", name: "Bio", type: "long_text"}],
        });
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        await settingsScreen.customFields().getByRole("button", {name: "Add custom field"}).click();
        const modal = settingsScreen.customFieldModal();
        await modal.getByLabelText("Name").fill("Bio");
        modal.getByLabelText("Type").element().focus();
        await userEvent.keyboard("[ArrowDown][ArrowDown][Enter]");
        await modal.getByRole("button", {name: "Save"}).click();

        await expect(modal).toHaveCount(0);
        expect(createApi.lastRequest?.body).toEqual({members_custom_fields: [{name: "Bio", type: "long_text"}]});
    });

    it("shows an API duplicate-name error on the name field without leaking the envelope message", async () => {
        fakeSettingsScreens();
        fakeCustomFields();
        const createApi = fakeAdminEndpoint("POST", "/members/custom_fields/", {
            errors: [{
                type: "ValidationError",
                message: "Validation error, cannot save members_custom_field.",
                context: "A custom field with this name already exists.",
                property: "name",
            }],
        }, {status: 422});
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        await settingsScreen.customFields().getByRole("button", {name: "Add custom field"}).click();
        const modal = settingsScreen.customFieldModal();
        await modal.getByLabelText("Name").fill("Company");
        await modal.getByRole("button", {name: "Save"}).click();

        await expect.element(modal.getByText("A custom field with this name already exists.")).toBeVisible();
        await expect(modal.getByText(/cannot save/)).toHaveCount(0);
        expect(createApi.requests).toHaveLength(1);
    });

    it("renames a field without allowing its type to change", async () => {
        fakeSettingsScreens();
        fakeCustomFields();
        const editApi = fakeAdminEndpoint("PUT", "/members/custom_fields/company/", {
            members_custom_fields: [{...companyField, name: "Employer"}],
        });
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        await settingsScreen.customFields().getByTestId("custom-field-list-item").click();
        const modal = settingsScreen.customFieldModal();
        await expect.element(modal.getByText("Type can’t be changed after creation")).toBeVisible();
        await expect.element(modal.getByTestId("custom-field-type").getByRole("combobox")).toBeDisabled();
        await modal.getByLabelText("Name").fill("Employer");
        await modal.getByRole("button", {name: "Save"}).click();

        await expect(modal).toHaveCount(0);
        expect(editApi.lastRequest?.body).toEqual({members_custom_fields: [{name: "Employer"}]});
    });

    it("archives a field only after destructive confirmation", async () => {
        fakeSettingsScreens();
        fakeCustomFields();
        const deleteApi = fakeAdminEndpoint("DELETE", "/members/custom_fields/company/", {});
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        await settingsScreen.customFields().getByTestId("custom-field-list-item").click();
        await settingsScreen.customFieldModal().getByRole("button", {name: "Archive"}).click();
        const confirmation = settingsScreen.confirmationModal();
        await expect.element(confirmation).toHaveTextContent("Its key stays reserved so it can’t be reused");
        await confirmation.getByRole("button", {name: "Archive"}).click();

        await expect.element(settingsScreen.successToast()).toHaveTextContent("Custom field archived");
        expect(deleteApi.requests).toHaveLength(1);
    });
});
