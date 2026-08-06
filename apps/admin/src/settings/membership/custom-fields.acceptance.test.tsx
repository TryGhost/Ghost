import {describe, expect, it} from "vitest";
import {page, userEvent} from "vitest/browser";

import {configResponse, fakeAdminEndpoint, fakeSettingsScreens, renderAdminApp, settingsResponse} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";

const companyField = {
    key: "company",
    name: "Company",
    type: "short_text",
    status: "active",
    created_at: "2026-07-13T00:00:00.000Z",
    updated_at: null as string | null,
};

const archivedField = {
    key: "old-hobby",
    name: "Old hobby",
    type: "short_text",
    status: "archived",
    created_at: "2026-07-12T00:00:00.000Z",
    updated_at: "2026-07-13T00:00:00.000Z",
};

function customFieldsBoot() {
    const labs = {membersCustomFields: true};
    return {
        browseConfig: {response: configResponse({labs})},
        browseSettings: {response: settingsResponse({labs})},
    };
}

function fakeCustomFields(fields = [companyField]) {
    // Settings opts into archived fields (`?filter=status:[active,archived]`),
    // so the fake matches the path with any query.
    return fakeAdminEndpoint("GET", new RegExp("^/members/custom_fields/\\?"), {members_custom_fields: fields});
}

describe("Custom fields", () => {
    it("stays hidden and does not query the closed endpoint while the flag is off", async () => {
        fakeSettingsScreens();
        const customFieldsApi = fakeCustomFields();
        await renderAdminApp("/settings");

        await expect(settingsScreen.customFields()).toHaveCount(0);
        expect(customFieldsApi.requests).toHaveLength(0);
    });

    it("lists each field with its user-facing type, opting into archived fields", async () => {
        fakeSettingsScreens();
        const customFieldsApi = fakeCustomFields();
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        // Browse hides archived by default; Settings asks for both statuses.
        await expect.poll(() => customFieldsApi.lastRequest?.url).toContain("filter=status%3A%5Bactive%2Carchived%5D");

        const row = settingsScreen.customFields().getByTestId("custom-field-list-item");
        await expect(row).toHaveCount(1);
        await expect.element(row).toHaveTextContent("Company");
        await expect.element(row).toHaveTextContent("Short text");
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
        await modal.getByLabelText("Type").click();
        await page.getByRole("option", {name: /Long text/}).click();
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
        await expect.element(modal.getByTestId("custom-field-type")).toBeDisabled();
        await modal.getByLabelText("Name").fill("Employer");
        await modal.getByRole("button", {name: "Save"}).click();

        await expect(modal).toHaveCount(0);
        expect(editApi.lastRequest?.body).toEqual({members_custom_fields: [{name: "Employer"}]});
    });

    it("archives a field only after destructive confirmation", async () => {
        fakeSettingsScreens();
        fakeCustomFields();
        const editApi = fakeAdminEndpoint("PUT", "/members/custom_fields/company/", {
            members_custom_fields: [{...companyField, status: "archived"}],
        });
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        await settingsScreen.customFields().getByTestId("custom-field-list-item").click();
        await settingsScreen.customFieldModal().getByRole("button", {name: "Archive"}).click();
        const confirmation = settingsScreen.confirmationModal();
        await expect.element(confirmation).toHaveTextContent("will no longer show up on your members, collect new information, or appear in filters");
        await expect.element(confirmation).toHaveTextContent("Values already collected for this field will remain unchanged");
        await confirmation.getByRole("button", {name: "Archive"}).click();

        await expect.element(settingsScreen.successToast()).toHaveTextContent("Custom field archived");
        // Archiving is a status edit, not a DELETE — DELETE is permanent removal.
        expect(editApi.lastRequest?.body).toEqual({members_custom_fields: [{status: "archived"}]});
    });

    it("splits fields into Active and Archived tabs", async () => {
        fakeSettingsScreens();
        fakeCustomFields([companyField, archivedField]);
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        // Active tab is the default and shows only active fields.
        const rows = settingsScreen.customFields().getByTestId("custom-field-list-item");
        await expect(rows).toHaveCount(1);
        await expect.element(rows).toHaveTextContent("Company");

        await settingsScreen.customFields().getByRole("tab", {name: "Archived"}).click();
        await expect(rows).toHaveCount(1);
        await expect.element(rows).toHaveTextContent("Old hobby");
    });

    it("collapses long lists behind Show all, five at a time like recommendations", async () => {
        fakeSettingsScreens();
        const manyFields = Array.from({length: 7}, (_, index) => ({
            ...companyField,
            key: `field-${index}`,
            name: `Field ${index}`,
        }));
        fakeCustomFields(manyFields);
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        const rows = settingsScreen.customFields().getByTestId("custom-field-list-item");
        await expect(rows).toHaveCount(5);

        await settingsScreen.customFields().getByRole("button", {name: "Show all"}).click();
        await expect(rows).toHaveCount(7);
        await expect(settingsScreen.customFields().getByRole("button", {name: "Show all"})).toHaveCount(0);

        // The reveal survives tab switches — Tabs unmount hidden panels, so
        // this pins the state living above them.
        await settingsScreen.customFields().getByRole("tab", {name: "Archived"}).click();
        await settingsScreen.customFields().getByRole("tab", {name: "Active"}).click();
        await expect(rows).toHaveCount(7);
    });

    it("reveals a just-created field even when the list is collapsed", async () => {
        fakeSettingsScreens();
        let currentFields = Array.from({length: 6}, (_, index) => ({
            ...companyField,
            key: `field-${index}`,
            name: `Field ${index}`,
        }));
        fakeAdminEndpoint("GET", new RegExp("^/members/custom_fields/\\?"), () => ({members_custom_fields: currentFields}));
        fakeAdminEndpoint("POST", "/members/custom_fields/", () => {
            const created = {...companyField, key: "newest", name: "Newest"};
            currentFields = [...currentFields, created];
            return {members_custom_fields: [created]};
        });
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        const rows = settingsScreen.customFields().getByTestId("custom-field-list-item");
        await expect(rows).toHaveCount(5);

        // New fields append at the END of the list — exactly the collapsed
        // slot — so creating one must expand the list rather than swallow it.
        await settingsScreen.customFields().getByRole("button", {name: "Add custom field"}).click();
        const modal = settingsScreen.customFieldModal();
        await modal.getByLabelText("Name").fill("Newest");
        await modal.getByRole("button", {name: "Save"}).click();

        await expect(rows).toHaveCount(7);
        await expect.element(rows.last()).toHaveTextContent("Newest");

        // Wait for the modal to finish closing (Save holds it open ~500ms for
        // its saving state). Ending the test earlier leaves that removal
        // pending, and it would fire into the NEXT test's freshly-opened
        // modal — NiceModal keys modals by component and dispatches globally.
        await expect(modal).toHaveCount(0);
    });

    it("reorders a field by dragging it, sending the whole list in its new order", async () => {
        fakeSettingsScreens();
        const shirtField = {...companyField, key: "shirt-size", name: "Shirt size"};
        const nicknameField = {...companyField, key: "nickname", name: "Nickname"};
        let currentFields = [companyField, shirtField, nicknameField];
        fakeAdminEndpoint("GET", new RegExp("^/members/custom_fields/\\?"), () => ({members_custom_fields: currentFields}));
        const reorderApi = fakeAdminEndpoint("PUT", "/members/custom_fields/", (request) => {
            const order = (request.body as {members_custom_fields: {key: string}[]}).members_custom_fields;
            currentFields = order.map(({key}) => currentFields.find(field => field.key === key)!);
            return {members_custom_fields: currentFields};
        });
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        const rows = settingsScreen.customFields().getByTestId("custom-field-list-item");
        await expect(rows).toHaveCount(3);

        // A real pointer drag of the handle onto the first row, which is what dnd-kit
        // listens for. Note this cannot be driven from the keyboard: the sortable list
        // does not wire dnd-kit's sortable coordinate getter, so arrow keys move a
        // lifted item by a flat 25px and it never reaches the next row.
        const handle = settingsScreen.customFields().getByLabelText("Reorder Nickname");
        await expect.element(handle).toBeVisible();
        await userEvent.dragAndDrop(handle, rows.first());

        // The whole list goes up, in the order the drag left it, keys only — order is a
        // property of the list, so a field never carries a rank. Nickname was dropped on
        // the first row, so it takes that place and the rest shuffle down.
        await expect.poll(() => reorderApi.lastRequest?.body).toEqual({
            members_custom_fields: [{key: "nickname"}, {key: "company"}, {key: "shirt-size"}],
        });

        // The row stays where it was dropped rather than snapping back and jumping when
        // the response lands.
        await expect.element(rows.first()).toHaveTextContent("Nickname");
    });

    it("shows only one copy of a field while it is being dragged", async () => {
        fakeSettingsScreens();
        const nicknameField = {...companyField, key: "nickname", name: "Nickname"};
        fakeCustomFields([companyField, nicknameField]);
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        const rows = settingsScreen.customFields().getByTestId("custom-field-list-item");
        await expect(rows).toHaveCount(2);

        // Held open with raw pointer events, because dragAndDrop completes in one step and
        // the ghost is only visible mid-drag. The row the overlay was copied from stays in
        // the list carrying the drag's transform, so if it isn't hidden the publisher sees
        // two of it tracking the cursor.
        const handle = settingsScreen.customFields().getByLabelText("Reorder Nickname").element();
        const doc = handle.ownerDocument;
        const box = handle.getBoundingClientRect();
        const at = (y: number) => ({bubbles: true, clientX: box.x + 2, clientY: y, isPrimary: true, pointerId: 1, button: 0});

        handle.dispatchEvent(new PointerEvent("pointerdown", at(box.y + 2)));
        doc.dispatchEvent(new PointerEvent("pointermove", at(box.y - 40)));

        // Exactly one row is marked as the one being dragged, and it is the row the
        // overlay was copied from — hidden, so the overlay is the only Nickname moving.
        const hidden = () => [...doc.querySelectorAll("[data-dragging]")];
        await expect.poll(() => hidden().length).toBe(1);
        expect(hidden()[0].textContent).toContain("Nickname");
        expect(getComputedStyle(hidden()[0]).opacity).toBe("0");

        doc.dispatchEvent(new PointerEvent("pointerup", at(box.y - 40)));
    });

    it("leaves the dragged field where it was dropped while the request is in flight", async () => {
        fakeSettingsScreens();
        const nicknameField = {...companyField, key: "nickname", name: "Nickname"};
        let currentFields = [companyField, nicknameField];
        fakeAdminEndpoint("GET", new RegExp("^/members/custom_fields/\\?"), () => ({members_custom_fields: currentFields}));

        // The PUT is held open so the assertion below lands while the request is still
        // outstanding. Without the local move, the list would revert to the server's
        // order the moment the drag ends and the row would snap back under the cursor.
        let releasePut: () => void = () => {};
        const putHeld = new Promise<void>((resolve) => {
            releasePut = resolve;
        });
        fakeAdminEndpoint("PUT", "/members/custom_fields/", async (request) => {
            await putHeld;
            const order = (request.body as {members_custom_fields: {key: string}[]}).members_custom_fields;
            currentFields = order.map(({key}) => currentFields.find(field => field.key === key)!);
            return {members_custom_fields: currentFields};
        });
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        const rows = settingsScreen.customFields().getByTestId("custom-field-list-item");
        await expect(rows).toHaveCount(2);

        await userEvent.dragAndDrop(
            settingsScreen.customFields().getByLabelText("Reorder Nickname"),
            rows.first()
        );

        await expect.element(rows.first()).toHaveTextContent("Nickname");

        releasePut();
        await expect.element(rows.first()).toHaveTextContent("Nickname");
    });

    it("sends the archived fields too, keeping their places in the order", async () => {
        fakeSettingsScreens();
        const shirtField = {...companyField, key: "shirt-size", name: "Shirt size"};
        // Archived between the two active fields, which is the arrangement that catches a
        // move applied to the visible tab instead of the whole list.
        let currentFields = [companyField, archivedField, shirtField];
        fakeAdminEndpoint("GET", new RegExp("^/members/custom_fields/\\?"), () => ({members_custom_fields: currentFields}));
        const reorderApi = fakeAdminEndpoint("PUT", "/members/custom_fields/", (request) => {
            const order = (request.body as {members_custom_fields: {key: string}[]}).members_custom_fields;
            currentFields = order.map(({key}) => currentFields.find(field => field.key === key)!);
            return {members_custom_fields: currentFields};
        });
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        const rows = settingsScreen.customFields().getByTestId("custom-field-list-item");
        await expect(rows).toHaveCount(2);

        await userEvent.dragAndDrop(
            settingsScreen.customFields().getByLabelText("Reorder Shirt size"),
            rows.first()
        );

        // The archived field is named even though it was never on screen: an order states
        // the whole list, and the API refuses one that leaves a field out.
        await expect.poll(() => reorderApi.lastRequest?.body).toEqual({
            members_custom_fields: [{key: "shirt-size"}, {key: "company"}, {key: "old-hobby"}],
        });
    });

    it("offers dragging only once the whole list is on screen", async () => {
        fakeSettingsScreens();
        const manyFields = Array.from({length: 7}, (_, index) => ({
            ...companyField,
            key: `field-${index}`,
            name: `Field ${index}`,
        }));
        fakeCustomFields(manyFields);
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        // Half a list is a bad thing to reorder: the places a field can be dropped are
        // the rows you can see, so a collapsed list offers no handles at all.
        await expect(settingsScreen.customFields().getByLabelText(/^Reorder /)).toHaveCount(0);

        await settingsScreen.customFields().getByRole("button", {name: "Show all"}).click();

        await expect(settingsScreen.customFields().getByLabelText(/^Reorder /)).toHaveCount(7);
    });

    it("does not offer dragging on the archived tab", async () => {
        fakeSettingsScreens();
        fakeCustomFields([companyField, archivedField]);
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        // An archived field holds its place in the order, but there is nowhere to see
        // it, so there is nothing to drag it through.
        await settingsScreen.customFields().getByRole("tab", {name: "Archived"}).click();

        await expect(settingsScreen.customFields().getByTestId("custom-field-list-item")).toHaveCount(1);
        await expect(settingsScreen.customFields().getByLabelText(/^Reorder /)).toHaveCount(0);
    });

    it("permanently deletes an archived field from the header menu, after a heavy warning", async () => {
        fakeSettingsScreens();
        fakeCustomFields([companyField, archivedField]);
        const deleteApi = fakeAdminEndpoint("DELETE", "/members/custom_fields/old-hobby/", {});
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        await settingsScreen.customFields().getByRole("tab", {name: "Archived"}).click();
        await settingsScreen.customFields().getByTestId("custom-field-list-item").click();

        // Deletion hides behind the modal's header menu — never a visible button.
        const modal = settingsScreen.customFieldModal();
        await modal.getByRole("button", {name: "Menu"}).click();
        await page.getByRole("menuitem", {name: "Delete custom field"}).click();

        const confirmation = settingsScreen.confirmationModal();
        await expect.element(confirmation).toHaveTextContent("Old hobby and every value collected from your members will be permanently deleted from the database. This can’t be undone.");
        await confirmation.getByRole("button", {name: "Delete"}).click();

        await expect.element(settingsScreen.successToast()).toHaveTextContent("Custom field deleted");
        expect(deleteApi.requests).toHaveLength(1);
    });

    it("does not expose permanent deletion for an active field", async () => {
        fakeSettingsScreens();
        fakeCustomFields([companyField]);
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        // Deletion lives behind the header menu, and an active field has none —
        // the UI can't reach delete, matching the API's archived-only rule.
        await settingsScreen.customFields().getByTestId("custom-field-list-item").click();
        const modal = settingsScreen.customFieldModal();
        await expect(modal.getByRole("button", {name: "Menu"})).toHaveCount(0);
    });

    it("shows no tabs at all while no fields exist", async () => {
        fakeSettingsScreens();
        fakeCustomFields([]);
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        await expect.element(settingsScreen.customFields()).toBeVisible();
        await expect(settingsScreen.customFields().getByRole("tab")).toHaveCount(0);
    });

    it("reactivates an archived field after confirmation, as a status edit", async () => {
        fakeSettingsScreens();
        fakeCustomFields([companyField, archivedField]);
        const editApi = fakeAdminEndpoint("PUT", "/members/custom_fields/old-hobby/", {
            members_custom_fields: [{...archivedField, status: "active"}],
        });
        await renderAdminApp("/settings", {boot: customFieldsBoot()});

        await settingsScreen.customFields().getByRole("tab", {name: "Archived"}).click();
        await settingsScreen.customFields().getByTestId("custom-field-list-item").click();
        await settingsScreen.customFieldModal().getByRole("button", {name: "Reactivate"}).click();
        const confirmation = settingsScreen.confirmationModal();
        await expect.element(confirmation).toHaveTextContent("Values already collected for this field will remain unchanged");
        await confirmation.getByRole("button", {name: "Reactivate"}).click();

        await expect.element(settingsScreen.successToast()).toHaveTextContent("Custom field reactivated");
        expect(editApi.lastRequest?.body).toEqual({members_custom_fields: [{status: "active"}]});
    });
});
