import {describe, expect, it} from "vitest";

import {currentRoute, fakeAdminEndpoint, renderAdminApp, settingsResponse} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";
import {fakeStaffWorld, user} from "./staff.test-helpers";

function stripeSettings() {
    return settingsResponse({settings: {
        stripe_connect_publishable_key: "pk_test_123",
        stripe_connect_secret_key: "sk_test_123",
        stripe_connect_display_name: "Test account",
        stripe_connect_account_id: "acct_123",
    }});
}

describe("Staff profiles", () => {
    it("validates required and bounded profile fields without saving", async () => {
        const owner = user("Owner");
        const administrator = user("Administrator");
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, administrator]});
        const editApi = fakeAdminEndpoint("PUT", `/users/${administrator.id}/?include=roles`, ({body}) => body);
        await renderAdminApp(`/settings/staff/${administrator.slug}`, {boot});

        const modal = settingsScreen.userDetailModal();
        await modal.getByLabelText("Full name").fill("");
        await modal.getByRole("button", {name: "Save"}).click();
        await expect.element(modal.getByText("Name is required")).toBeVisible();

        await modal.getByLabelText("Email").fill("not-an-email");
        await modal.getByRole("button", {name: "Save"}).click();
        await expect.element(modal.getByText("Enter a valid email address")).toBeVisible();

        await modal.getByLabelText("Location").fill("a".repeat(151));
        await modal.getByRole("button", {name: "Save"}).click();
        await expect.element(modal.getByText("Location is too long")).toBeVisible();

        await modal.getByLabelText("Bio").fill("a".repeat(251));
        await modal.getByRole("button", {name: "Save"}).click();
        await expect.element(modal.getByText("Bio is too long")).toBeVisible();
        expect(editApi.requests).toHaveLength(0);
    });

    it("normalizes Facebook and X handles and rejects unrelated URLs", async () => {
        const owner = user("Owner");
        const administrator = user("Administrator");
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, administrator]});
        const editApi = fakeAdminEndpoint("PUT", `/users/${administrator.id}/?include=roles`, ({body}) => body);
        await renderAdminApp(`/settings/staff/${administrator.slug}/social-links`, {boot});

        const modal = settingsScreen.userDetailModal();
        await modal.getByTestId("website-input").fill("not-a-website");
        await modal.getByRole("button", {name: "Save"}).click();
        await expect.element(modal.getByText("Enter a valid URL")).toBeVisible();

        const facebook = modal.getByTestId("facebook-input");
        await facebook.fill("http://github.com/username");
        await modal.getByTitle("Social Links").click();
        await expect.element(modal.getByText("The URL must be in a format like https://www.facebook.com/yourPage")).toBeVisible();
        await facebook.fill("facebook.com/username");
        await modal.getByTitle("Social Links").click();
        await expect.element(facebook).toHaveValue("https://www.facebook.com/username");

        const x = modal.getByTestId("x-input");
        await x.fill("thisusernamehasmorethan15characters");
        await modal.getByTitle("Social Links").click();
        await expect.element(modal.getByText("Your Username is not a valid Twitter Username")).toBeVisible();
        await x.fill("ghost");
        await modal.getByTitle("Social Links").click();
        await modal.getByTestId("website-input").fill("https://example.com");
        await modal.getByRole("button", {name: "Save"}).click();
        await expect.element(modal.getByRole("button", {name: "Saved"})).toBeVisible();

        expect(editApi.lastRequest?.body).toMatchObject({users: [{facebook: "username", twitter: "@ghost"}]});
    });

    it("saves core profile fields and the server response", async () => {
        const owner = user("Owner");
        const administrator = user("Administrator");
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, administrator]});
        const saved = {...administrator, name: "New Admin", email: "newadmin@test.com", location: "Chicago", bio: "A short bio"};
        const editApi = fakeAdminEndpoint("PUT", `/users/${administrator.id}/?include=roles`, {users: [saved]});
        await renderAdminApp(`/settings/staff/${administrator.slug}`, {boot});

        const modal = settingsScreen.userDetailModal();
        await modal.getByLabelText("Full name").fill(saved.name);
        await modal.getByLabelText("Email").fill(saved.email);
        await modal.getByLabelText("Location").fill(saved.location);
        await modal.getByLabelText("Bio").fill(saved.bio);
        await modal.getByRole("button", {name: "Save"}).click();

        await expect.element(modal.getByRole("button", {name: "Saved"})).toBeVisible();
        expect(editApi.lastRequest?.body).toMatchObject({users: [{name: saved.name, email: saved.email, location: saved.location, bio: saved.bio}]});
        await modal.getByRole("button", {name: "Close"}).click();
        await expect.element(settingsScreen.users().getByText(saved.name, {exact: true})).toBeVisible();
        await expect.element(settingsScreen.users().getByText(saved.email, {exact: true})).toBeVisible();
    });

    it("saves all administrator email-notification controls, including Stripe-only options", async () => {
        const owner = user("Owner");
        const administrator = user("Administrator");
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, administrator]});
        const editApi = fakeAdminEndpoint("PUT", `/users/${administrator.id}/?include=roles`, ({body}) => body);
        await renderAdminApp(`/settings/staff/${administrator.slug}/email-notifications`, {
            boot: {...boot, browseSettings: {response: stripeSettings()}},
        });

        const modal = settingsScreen.userDetailModal();
        for (const label of ["Comments", "New signups", "New paid members", "Milestones", "Tips & donations", "Gift subscriptions"]) {
            await modal.getByLabelText(label).click();
        }
        await modal.getByLabelText("Paid member cancellations").click();
        await modal.getByRole("button", {name: "Save"}).click();
        await expect.element(modal.getByRole("button", {name: "Saved"})).toBeVisible();

        expect(editApi.lastRequest?.body).toMatchObject({users: [{
            comment_notifications: false,
            free_member_signup_notification: false,
            paid_subscription_started_notification: false,
            paid_subscription_canceled_notification: true,
            milestone_notifications: false,
            donation_notifications: false,
            gift_subscription_notifications: false,
        }]});
    });

    it("shows only engagement notifications to non-admin staff", async () => {
        const owner = user("Owner");
        const editor = user("Editor");
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, editor]});
        await renderAdminApp(`/settings/staff/${editor.slug}/email-notifications`, {boot});

        const modal = settingsScreen.userDetailModal();
        await expect.element(modal.getByLabelText("Comments")).toBeVisible();
        for (const label of ["Recommendations", "New signups", "New paid members", "Paid member cancellations", "Milestones", "Tips & donations"]) {
            await expect(modal.getByLabelText(label)).toHaveCount(0);
        }
    });

    it("hides Stripe-only notification options when Stripe is disconnected", async () => {
        const owner = user("Owner");
        const administrator = user("Administrator");
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, administrator]});
        await renderAdminApp(`/settings/staff/${administrator.slug}/email-notifications`, {boot});

        const modal = settingsScreen.userDetailModal();
        for (const label of ["New paid members", "Paid member cancellations", "Tips & donations", "Gift subscriptions"]) {
            await expect(modal.getByLabelText(label)).toHaveCount(0);
        }
        await expect.element(modal.getByLabelText("Milestones")).toBeVisible();
    });

    it("warns before discarding unsaved profile changes", async () => {
        const owner = user("Owner");
        const administrator = user("Administrator");
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, administrator]});
        const editApi = fakeAdminEndpoint("PUT", `/users/${administrator.id}/?include=roles`, ({body}) => body);
        await renderAdminApp(`/settings/staff/${administrator.slug}`, {boot});

        const modal = settingsScreen.userDetailModal();
        await modal.getByLabelText("Full name").fill("Unsaved name");
        await modal.getByRole("button", {name: "Close"}).click();
        await expect.element(settingsScreen.confirmationModal()).toHaveTextContent("leave");
        await settingsScreen.confirmationModal().getByRole("button", {name: "Leave"}).click();

        await expect(settingsScreen.userDetailModal()).toHaveCount(0);
        expect(editApi.requests).toHaveLength(0);
    });

    it("shows and regenerates a staff token only on your own profile", async () => {
        const owner = user("Owner");
        const {boot} = fakeStaffWorld({currentUser: owner});
        const apiKey = {
            id: "token-id",
            created_at: "2023-01-01",
            integration_id: "integration-id",
            last_seen_at: null,
            last_seen_version: null,
            role_id: "role-id",
            secret: "secret",
            type: "",
            updated_at: "2023-01-01",
            user_id: owner.id,
        };
        fakeAdminEndpoint("GET", "/users/me/token/", {apiKey});
        const regenerateApi = fakeAdminEndpoint("PUT", "/users/me/token/", {apiKey: {...apiKey, secret: "new-secret"}});
        await renderAdminApp(`/settings/staff/${owner.slug}`, {boot});

        const keys = settingsScreen.userDetailModal().getByTestId("api-keys");
        await expect.element(keys).toHaveTextContent("token-id:secret");
        await keys.hover();
        await keys.getByRole("button", {name: "Regenerate"}).click({force: true});
        await settingsScreen.confirmationModal().getByRole("button", {name: "Regenerate your Staff Access Token"}).click();

        await expect.element(keys).toHaveTextContent("token-id:new-secret");
        expect(regenerateApi.requests).toHaveLength(1);
    });

    it("does not expose the staff token on another user's profile", async () => {
        const owner = user("Owner");
        const administrator = user("Administrator");
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, administrator]});
        await renderAdminApp(`/settings/staff/${administrator.slug}`, {boot});

        await expect.element(settingsScreen.userDetailModal().getByLabelText("Email")).toBeVisible();
        await expect(settingsScreen.userDetailModal().getByTestId("api-keys")).toHaveCount(0);
    });

    it("keeps the modal and route aligned with a server-sanitized slug", async () => {
        const owner = user("Owner");
        const administrator = user("Administrator");
        const saved = {...administrator, slug: "new-admin"};
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, administrator]});
        fakeAdminEndpoint("GET", "/users/slug/new-admin/?include=roles", {users: [saved]});
        fakeAdminEndpoint("PUT", `/users/${administrator.id}/?include=roles`, {users: [saved]});
        await renderAdminApp(`/settings/staff/${administrator.slug}`, {boot});

        const modal = settingsScreen.userDetailModal();
        await modal.getByLabelText("Slug").fill("New Admin");
        await modal.getByRole("button", {name: "Save"}).click();
        await expect.element(modal.getByRole("button", {name: "Saved"})).toBeVisible();

        expect(currentRoute()).toBe("/settings/staff/new-admin");
        await expect.element(modal.getByLabelText("Slug")).toHaveValue("new-admin");
        await expect.element(modal).toBeVisible();
    });

    it("reports a missing user and returns to the staff list", async () => {
        const {boot} = fakeStaffWorld();
        fakeAdminEndpoint("GET", "/users/slug/unknown-user/?include=roles", {
            errors: [{type: "NotFoundError", message: "Resource not found error, cannot read user."}],
        }, {status: 404});
        await renderAdminApp("/settings/staff/unknown-user", {boot});

        await expect.element(settingsScreen.errorToast()).toHaveTextContent("User not found");
        await expect(settingsScreen.userDetailModal()).toHaveCount(0);
        expect(currentRoute()).toBe("/settings/staff");
    });
});

const socialCases = [
    {label: "Threads", testId: "threads-input", invalid: "https://www.notthreads.com", error: "The URL must be in a format like https://www.threads.net/@yourUsername", valid: "https://www.threads.net/@username", field: "threads", stored: "@username"},
    {label: "Bluesky", testId: "bluesky-input", invalid: "https://notbluesky.com", error: "The URL must be in a format like https://bsky.app/profile/yourUsername", valid: "https://bsky.app/profile/username", field: "bluesky", stored: "username"},
    {label: "LinkedIn", testId: "linkedin-input", invalid: "https://notlinkedin.com", error: "The URL must be in a format like https://www.linkedin.com/in/yourUsername", valid: "https://www.linkedin.com/in/yourUsername", field: "linkedin", stored: "yourUsername"},
    {label: "Instagram", testId: "instagram-input", invalid: "https://twitter.com/johnsmith", error: "The URL must be in a format like https://www.instagram.com/yourUsername", valid: "https://www.instagram.com/yourUsername", field: "instagram", stored: "yourUsername"},
    {label: "YouTube", testId: "youtube-input", invalid: "https://www.youutbe/gsg", error: "The URL must be in a format like https://www.youtube.com/@yourUsername, https://www.youtube.com/user/yourUsername, or https://www.youtube.com/channel/yourChannelId", valid: "https://www.youtube.com/@yourUsername", field: "youtube", stored: "@yourUsername"},
    {label: "TikTok", testId: "tiktok-input", invalid: "https://www.tik.com/nottiktok", error: "The URL must be in a format like https://www.tiktok.com/@yourUsername", valid: "https://www.tiktok.com/@yourUsername", field: "tiktok", stored: "@yourUsername"},
    {label: "Mastodon", testId: "mastodon-input", invalid: "https://mastodon.social/johnsmith", error: "The URL must be in a format like @username@instance.tld or https://instance.tld/@username or https://website.com/@username@instance.tld", valid: "@johnsmith@mastodon.social", field: "mastodon", stored: "mastodon.social/@johnsmith"},
] as const;

describe("Staff profile social links", () => {
    it.each(socialCases)("validates and normalizes $label URLs", async ({testId, invalid, error, valid, field, stored}) => {
        const owner = user("Owner");
        const administrator = user("Administrator");
        const {boot} = fakeStaffWorld({currentUser: owner, users: [owner, administrator]});
        const editApi = fakeAdminEndpoint("PUT", `/users/${administrator.id}/?include=roles`, ({body}) => body);
        await renderAdminApp(`/settings/staff/${administrator.slug}/social-links`, {boot});

        const modal = settingsScreen.userDetailModal();
        const input = modal.getByTestId(testId);
        await input.fill(invalid);
        await modal.getByTitle("Social Links").click();
        await expect.element(modal.getByText(error)).toBeVisible();

        await input.fill(valid);
        await modal.getByTitle("Social Links").click();
        await modal.getByRole("button", {name: "Save"}).click();
        await expect.element(modal.getByRole("button", {name: "Saved"})).toBeVisible();

        expect(editApi.lastRequest?.body).toMatchObject({users: [{[field]: stored}]});
    });
});
