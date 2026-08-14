import {describe, expect, it} from "vitest";

import {browseResponse, fakeAdminEndpoint, fakeSettingsScreens, renderAdminApp} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";

const firstRecommendation = {
    id: "652d788df9278a47d6963d1f",
    title: "Recommendation 1 title",
    description: "Recommendation 1 description",
    excerpt: "Recommendation 1 excerpt",
    featured_image: "https://recommendation1.com/image.jpg",
    favicon: "https://recommendation1.com/favicon.ico",
    url: "https://recommendation1.com/",
    one_click_subscribe: true,
    created_at: "2023-10-28T20:00:00.000Z",
    updated_at: "2023-10-30T20:00:00.000Z",
    count: {clicks: 0, subscribers: 3},
};

const secondRecommendation = {
    ...firstRecommendation,
    id: "652d782ef9278a47d6963d1e",
    title: "Recommendation 2 title",
    url: "https://recommendation2.com/",
    one_click_subscribe: false,
    count: {clicks: 10, subscribers: 0},
};

const incomingRecommendations = [
    {
        id: "64f6ed7d63be05eff0045d88",
        title: "Incoming recommendation 1 title",
        excerpt: "Incoming recommendation 1 excerpt",
        featured_image: "https://incoming1.com/image.jpg",
        favicon: "https://incoming1.com/favicon.ico",
        url: "https://incoming1.com/",
        recommending_back: false,
    },
    {
        id: "f52d782ef9278a47d6965d1e",
        title: "Incoming recommendation 2 title",
        excerpt: "Incoming recommendation 2 excerpt",
        featured_image: "https://incoming2.com/image.jpg",
        favicon: "https://incoming2.com/favicon.ico",
        url: "https://incoming2.com/",
        recommending_back: true,
    },
];

function fakeRecommendations(recommendations = [firstRecommendation, secondRecommendation]) {
    return fakeAdminEndpoint("GET", /^\/recommendations\/\?/, browseResponse("recommendations", recommendations, {limit: 5}));
}

async function renderRecommendations() {
    fakeSettingsScreens();
    fakeRecommendations();
    await renderAdminApp("/settings/recommendations");
    return settingsScreen.section("recommendations");
}

describe("Recommendations settings", () => {
    it("lists outgoing recommendations with their signup or click counts", async () => {
        const section = await renderRecommendations();

        const rows = section.getByTestId("recommendation-list-item");
        await expect(rows).toHaveCount(2);
        await expect.element(rows.first()).toHaveTextContent("Recommendation 1 title");
        await expect.element(rows.first()).toHaveTextContent(/3\s*signups/);
        await expect.element(rows.last()).toHaveTextContent("Recommendation 2 title");
        await expect.element(rows.last()).toHaveTextContent(/10\s*clicks/);
    });

    it("validates and adds a recommendation with the checked site metadata", async () => {
        fakeSettingsScreens();
        fakeRecommendations([]);
        const checkApi = fakeAdminEndpoint("POST", "/recommendations/check/", {
            recommendations: [{
                title: "",
                excerpt: null,
                featured_image: null,
                favicon: null,
                url: "https://example.com/a-cool-website",
                one_click_subscribe: true,
            }],
        });
        const addApi = fakeAdminEndpoint("POST", "/recommendations/", {recommendations: []});
        await renderAdminApp("/settings/recommendations");

        const section = settingsScreen.section("recommendations");
        await section.getByRole("button", {name: "Add recommendation"}).click();
        let modal = settingsScreen.section("add-recommendation-modal");
        await modal.getByLabelText("URL").fill("not a real url");
        await modal.getByRole("button", {name: "Next"}).click();
        await expect.element(modal.getByText("Enter a valid URL")).toBeVisible();

        await modal.getByLabelText("URL").fill("https://example.com/a-cool-website");
        await modal.getByRole("button", {name: "Next"}).click();
        modal = settingsScreen.section("add-recommendation-modal");
        const longDescription = "x".repeat(201);
        await modal.getByLabelText("Short description").fill(longDescription);
        await expect.element(modal.getByText("Max: 200 characters. You’ve used 201")).toBeVisible();
        await modal.getByLabelText("Title").fill("This is a title");
        await modal.getByLabelText("Short description").fill("This is a description");
        await modal.getByRole("button", {name: "Add"}).click();

        await expect.element(settingsScreen.successToast()).toHaveTextContent("Recommendation added");
        expect(checkApi.lastRequest?.body).toEqual({recommendations: [{url: "https://example.com/a-cool-website"}]});
        expect(addApi.lastRequest?.body).toEqual({recommendations: [{
            title: "This is a title",
            url: "https://example.com/a-cool-website",
            description: "This is a description",
            excerpt: null,
            featured_image: null,
            favicon: null,
            one_click_subscribe: true,
        }]});
    });

    it("rejects a URL that is already recommended", async () => {
        fakeSettingsScreens();
        fakeRecommendations();
        fakeAdminEndpoint("POST", "/recommendations/check/", {recommendations: [firstRecommendation]});
        await renderAdminApp("/settings/recommendations");

        const section = settingsScreen.section("recommendations");
        await section.getByRole("button", {name: "Add recommendation"}).click();
        const modal = settingsScreen.section("add-recommendation-modal");
        await modal.getByLabelText("URL").fill(firstRecommendation.url);
        await modal.getByRole("button", {name: "Next"}).click();

        await expect.element(settingsScreen.errorToast()).toHaveTextContent("A recommendation with this URL already exists");
    });

    it("validates and edits a recommendation", async () => {
        const section = await renderRecommendations();
        const updated = {...firstRecommendation, title: "Updated title", description: "Updated description"};
        const editApi = fakeAdminEndpoint("PUT", `/recommendations/${firstRecommendation.id}/`, {recommendations: [updated]});

        await section.getByTestId("recommendation-list-item").first().click();
        const modal = settingsScreen.section("edit-recommendation-modal");
        await modal.getByLabelText("Title").fill("");
        await modal.getByLabelText("Short description").fill("x".repeat(201));
        await expect.element(modal.getByText("Max: 200 characters. You’ve used 201")).toBeVisible();
        await modal.getByRole("button", {name: "Save"}).click();
        await expect.element(modal.getByText("Title is required")).toBeVisible();

        await modal.getByLabelText("Title").fill(updated.title);
        await modal.getByLabelText("Short description").fill(updated.description);
        await modal.getByRole("button", {name: "Save"}).click();

        await expect.element(modal.getByRole("button", {name: "Saved"})).toBeVisible();
        expect(editApi.lastRequest?.body).toEqual({recommendations: [updated]});
    });

    it("deletes a recommendation only after confirmation", async () => {
        const section = await renderRecommendations();
        const deleteApi = fakeAdminEndpoint("DELETE", `/recommendations/${firstRecommendation.id}/`, {});

        await section.getByTestId("recommendation-list-item").first().click();
        await settingsScreen.section("edit-recommendation-modal").getByRole("button", {name: "Delete"}).click();
        const confirmation = settingsScreen.confirmationModal();
        await expect.element(confirmation).toHaveTextContent("Your recommendation Recommendation 1 title will no longer be visible to your audience.");
        await confirmation.getByRole("button", {name: "Delete"}).click();

        await expect(confirmation).toHaveCount(0);
        expect(deleteApi.requests).toHaveLength(1);
    });

    it("shows incoming recommendations and whether they can be recommended back", async () => {
        fakeSettingsScreens();
        fakeRecommendations();
        fakeAdminEndpoint("GET", /^\/incoming_recommendations\/\?/, browseResponse("recommendations", incomingRecommendations, {limit: 5}));
        await renderAdminApp("/settings/recommendations");

        const section = settingsScreen.section("recommendations");
        await section.getByRole("tab", {name: "Recommending you"}).click();
        const rows = section.getByTestId("incoming-recommendation-list-item");
        await expect(rows).toHaveCount(2);
        await expect.element(rows.first()).toHaveTextContent("Incoming recommendation 1 title");
        await expect.element(rows.first()).toHaveTextContent("Recommend back");
        await expect.element(rows.last()).toHaveTextContent("Incoming recommendation 2 title");
        await expect.element(rows.last()).toHaveTextContent("Recommending");
    });
});
