import {describe, expect, it} from "vitest";

import {
    browseResponse,
    configResponse,
    fakeAdminEndpoint,
    fakeNewsletters,
    fakeSettingsScreens,
    newsletter,
    renderAdminApp,
    type Newsletter,
} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";

const activeNewsletter = newsletter({
    id: "645453f4d254799990dd0e21",
    name: "Awesome newsletter",
    sort_order: 0,
});
const archivedNewsletter = newsletter({
    id: "645453f4d254799990dd0e22",
    name: "Average newsletter",
    sort_order: 1,
    status: "archived",
});

function fakeNewsletterWorld(newsletters: Newsletter[] = [activeNewsletter, archivedNewsletter]) {
    fakeSettingsScreens();
    fakeNewsletters(newsletters);
}

function configWithManagedEmail(sendingDomain?: string) {
    const config = configResponse();
    config.config.hostSettings = {
        managedEmail: {
            enabled: true,
            ...(sendingDomain ? {sendingDomain} : {}),
        },
    };
    return config;
}

function fakeNewsletterEdit(responseNewsletter: Newsletter, sentEmailVerification: string[] = []) {
    return fakeAdminEndpoint(
        "PUT",
        new RegExp(`^/newsletters/${responseNewsletter.id}/\\?include=`),
        {
            newsletters: [responseNewsletter],
            meta: {sent_email_verification: sentEmailVerification},
        }
    );
}

async function openNewsletter(name: string) {
    await settingsScreen.newsletters().getByText(name, {exact: true}).click();
    await expect.element(settingsScreen.newsletterModal()).toBeVisible();
    return settingsScreen.newsletterModal();
}

describe("Newsletter settings", () => {
    it("creates a newsletter and inserts it into the visible list", async () => {
        const created = newsletter({id: "new-newsletter", name: "New newsletter"});
        fakeNewsletterWorld();
        fakeAdminEndpoint("GET", /^\/members\/\?.*filter=newsletters/, browseResponse("members", [], {limit: 1}));
        const createApi = fakeAdminEndpoint(
            "POST",
            "/newsletters/?opt_in_existing=true&include=count.active_members%2Ccount.posts",
            {newsletters: [created]}
        );
        await renderAdminApp("/settings/newsletters");

        await settingsScreen.newsletters().getByRole("button", {name: "Add newsletter"}).click();
        const modal = settingsScreen.addNewsletterModal();
        await modal.getByRole("button", {name: "Create"}).click();
        await expect.element(modal.getByText("A name is required for your newsletter")).toBeVisible();

        await modal.getByLabelText("Name").fill(created.name);
        await modal.getByRole("button", {name: "Create"}).click();

        await expect.element(settingsScreen.newsletterModal()).toBeVisible();
        await expect.element(settingsScreen.newsletterModal().getByPlaceholder("Weekly Roundup")).toHaveValue(created.name);
        expect(createApi.requests).toHaveLength(1);
        expect(createApi.lastRequest?.body).toMatchObject({
            newsletters: [{name: created.name, feedback_enabled: true}],
        });
        await settingsScreen.newsletterModal().getByRole("button", {name: "Close"}).click();
        await expect.element(settingsScreen.newsletters().getByText(created.name, {exact: true})).toBeVisible();
    });

    it("validates and updates a newsletter in the visible list", async () => {
        const updated = {...activeNewsletter, name: "Updated newsletter", body_font_category: "sans_serif" as const};
        fakeNewsletterWorld();
        const editApi = fakeNewsletterEdit(updated);
        await renderAdminApp("/settings/newsletters");

        const modal = await openNewsletter(activeNewsletter.name);
        await modal.getByPlaceholder("Weekly Roundup").fill("");
        await modal.getByRole("button", {name: "Save"}).click();
        await expect.element(modal.getByText("A name is required for your newsletter")).toBeVisible();

        await modal.getByPlaceholder("Weekly Roundup").fill(updated.name);
        await modal.getByRole("tab", {name: "Design"}).click();
        await modal.getByTestId("body-font-select").click();
        await settingsScreen.selectOption("Clean sans-serif").click();
        await modal.getByRole("button", {name: "Save"}).click();

        await expect.element(modal.getByRole("button", {name: "Saved"})).toBeVisible();
        await expect.element(settingsScreen.newsletters().getByText(updated.name, {exact: true})).toBeVisible();
        expect(editApi.lastRequest?.body).toMatchObject({
            newsletters: [{id: activeNewsletter.id, name: updated.name, body_font_category: "sans_serif"}],
        });
    });

    describe("email addresses", () => {
        it("validates and requests verification for a self-hosted sender address", async () => {
            const updated = {...activeNewsletter, sender_email: "test@test.com"};
            fakeNewsletterWorld();
            const editApi = fakeNewsletterEdit(updated, ["sender_email"]);
            await renderAdminApp("/settings/newsletters");

            const modal = await openNewsletter(activeNewsletter.name);
            const senderEmail = modal.getByLabelText("Sender email address");
            await senderEmail.fill("not-an-email");
            await modal.getByRole("button", {name: "Save"}).click();
            await expect.element(modal.getByText("Enter a valid email address")).toBeVisible();

            await senderEmail.fill(updated.sender_email);
            await modal.getByRole("button", {name: "Save"}).click();

            await expect.element(settingsScreen.infoToast()).toHaveTextContent("sent a confirmation email to the new address");
            expect(editApi.lastRequest?.body).toMatchObject({newsletters: [{sender_email: updated.sender_email}]});
        });

        it("keeps the sender address read-only for managed email without a custom domain", async () => {
            fakeNewsletterWorld();
            await renderAdminApp("/settings/newsletters", {
                boot: {browseConfig: {response: configWithManagedEmail()}},
            });

            const modal = await openNewsletter(activeNewsletter.name);
            await expect(modal.getByLabelText("Sender email address")).toHaveCount(0);
            await expect.element(modal.getByText("default@example.com", {exact: false})).toBeVisible();
        });

        it("validates and requests verification for managed email reply-to changes", async () => {
            const updated = {...activeNewsletter, sender_reply_to: "test@test.com"};
            fakeNewsletterWorld();
            const editApi = fakeNewsletterEdit(updated, ["sender_reply_to"]);
            await renderAdminApp("/settings/newsletters", {
                boot: {browseConfig: {response: configWithManagedEmail()}},
            });

            const modal = await openNewsletter(activeNewsletter.name);
            const replyTo = modal.getByLabelText("Reply-to email");
            await replyTo.fill("not-an-email");
            await modal.getByRole("button", {name: "Save"}).click();
            await expect.element(modal.getByText("Enter a valid email address")).toBeVisible();

            await replyTo.fill(updated.sender_reply_to);
            await modal.getByRole("button", {name: "Save"}).click();

            await expect.element(settingsScreen.infoToast()).toHaveTextContent("sent a confirmation email to the new address");
            expect(editApi.lastRequest?.body).toMatchObject({newsletters: [{sender_reply_to: updated.sender_reply_to}]});
        });

        it("restricts a managed sender address to the configured sending domain", async () => {
            const updated = {...activeNewsletter, sender_email: "harry@customdomain.com"};
            fakeNewsletterWorld();
            const editApi = fakeNewsletterEdit(updated);
            await renderAdminApp("/settings/newsletters", {
                boot: {browseConfig: {response: configWithManagedEmail("customdomain.com")}},
            });

            const modal = await openNewsletter(activeNewsletter.name);
            const senderEmail = modal.getByLabelText("Sender email address");
            await senderEmail.fill("Harry Potter");
            await modal.getByRole("button", {name: "Save"}).click();
            await expect.element(modal.getByText("Enter a valid email address")).toBeVisible();

            await senderEmail.fill("harry@potter.com");
            await modal.getByRole("button", {name: "Save"}).click();
            await expect.element(modal.getByText("Email address must end with @customdomain.com")).toBeVisible();

            await senderEmail.fill(updated.sender_email);
            await modal.getByRole("button", {name: "Save"}).click();
            await expect.element(modal.getByRole("button", {name: "Saved"})).toBeVisible();
            await expect(settingsScreen.infoToast()).toHaveCount(0);
            expect(editApi.lastRequest?.body).toMatchObject({newsletters: [{sender_email: updated.sender_email}]});
        });

        it("allows a custom-domain newsletter to use an external reply-to address with verification", async () => {
            const updated = {...activeNewsletter, sender_reply_to: "hermione@granger.com"};
            fakeNewsletterWorld();
            const editApi = fakeNewsletterEdit(updated, ["sender_reply_to"]);
            await renderAdminApp("/settings/newsletters", {
                boot: {browseConfig: {response: configWithManagedEmail("customdomain.com")}},
            });

            const modal = await openNewsletter(activeNewsletter.name);
            const replyTo = modal.getByLabelText("Reply-to email");
            await replyTo.fill(updated.sender_reply_to);
            await expect.element(replyTo).toHaveValue(updated.sender_reply_to);
            await modal.getByRole("button", {name: "Save"}).click();

            await expect.element(settingsScreen.infoToast()).toHaveTextContent("sent a confirmation email to the new address");
            expect(editApi.lastRequest?.body).toMatchObject({newsletters: [{sender_reply_to: updated.sender_reply_to}]});
        });
    });

    it("moves newsletters between archived and active lists after status changes", async () => {
        fakeNewsletterWorld();
        const reactivateApi = fakeNewsletterEdit({...archivedNewsletter, status: "active"});
        await renderAdminApp("/settings/newsletters");
        const section = settingsScreen.newsletters();

        await section.getByRole("tab", {name: "Archived"}).click();
        let modal = await openNewsletter(archivedNewsletter.name);
        await modal.getByRole("button", {name: "Reactivate newsletter"}).click();
        await settingsScreen.confirmationModal().getByRole("button", {name: "Reactivate"}).click();
        await expect.element(settingsScreen.successToast()).toHaveTextContent("Newsletter reactivated");
        await modal.getByRole("button", {name: "Close"}).click();
        await section.getByRole("tab", {name: "Active"}).click();
        await expect.element(section.getByText(archivedNewsletter.name, {exact: true})).toBeVisible();
        expect(reactivateApi.lastRequest?.body).toMatchObject({newsletters: [{id: archivedNewsletter.id, status: "active"}]});

        const archiveApi = fakeNewsletterEdit({...activeNewsletter, status: "archived"});
        modal = await openNewsletter(activeNewsletter.name);
        await modal.getByRole("button", {name: "Archive newsletter"}).click();
        await settingsScreen.confirmationModal().getByRole("button", {name: "Archive"}).click();
        await expect.element(settingsScreen.successToast()).toHaveTextContent("Newsletter archived");
        await modal.getByRole("button", {name: "Close"}).click();
        await section.getByRole("tab", {name: "Archived"}).click();
        await expect.element(section.getByText(activeNewsletter.name, {exact: true})).toBeVisible();
        expect(archiveApi.lastRequest?.body).toMatchObject({newsletters: [{id: activeNewsletter.id, status: "archived"}]});
    });

    it("enforces the newsletter limit when adding and reactivating", async () => {
        const config = configResponse();
        config.config.hostSettings = {
            limits: {
                newsletters: {
                    max: 1,
                    error: "Your plan supports up to {{max}} newsletters. Please upgrade to add more.",
                },
            },
        };
        fakeSettingsScreens();
        const newslettersApi = fakeNewsletters(({filter}) => (
            filter === "status:active" ? [activeNewsletter] : [activeNewsletter, archivedNewsletter]
        ));
        fakeAdminEndpoint("GET", /^\/members\/\?.*filter=newsletters/, browseResponse("members", [], {limit: 1}));
        await renderAdminApp("/settings/newsletters", {boot: {browseConfig: {response: config}}});
        const section = settingsScreen.newsletters();

        await section.getByRole("button", {name: "Add newsletter"}).click();
        await expect.element(settingsScreen.limitModal()).toHaveTextContent("Your plan supports up to 1 newsletters");
        expect(newslettersApi.requests).toContainEqual(expect.objectContaining({filter: "status:active", limit: 1}));
        await settingsScreen.limitModal().getByRole("button", {name: "Cancel"}).click();

        await section.getByRole("tab", {name: "Archived"}).click();
        const modal = await openNewsletter(archivedNewsletter.name);
        await modal.getByRole("button", {name: "Reactivate newsletter"}).click();
        await expect.element(settingsScreen.limitModal()).toHaveTextContent("Your plan supports up to 1 newsletters");
    });

    it("warns before discarding unsaved changes without sending an update", async () => {
        fakeNewsletterWorld();
        const editApi = fakeNewsletterEdit(activeNewsletter);
        await renderAdminApp("/settings/newsletters");

        const modal = await openNewsletter(activeNewsletter.name);
        await modal.getByPlaceholder("Weekly Roundup").fill("New title");
        await modal.getByRole("button", {name: "Close"}).click();
        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent("leave");
        await settingsScreen.confirmationAction("Leave").click();

        await expect.element(modal).not.toBeInTheDocument();
        expect(editApi.requests).toHaveLength(0);
    });
});
