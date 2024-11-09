import { faker } from "@faker-js/faker";

describe("F002 - Crear post", () => {
    const adminUsername = Cypress.env("ADMIN_USERNAME");
    const adminPassword = Cypress.env("ADMIN_PASSWORD");

    it("E00201 - Crear un post y publicarlo", () => {
        const postTitle = faker.word.words(2);
        const postUrl = faker.word.words(1);

        // Given
        cy.log(
            `Given I am an admin logged in with email "${adminUsername}" and password "${adminPassword}"`
        );
        cy.loginPage.loginAs(adminUsername, adminPassword);

        cy.log("And I am on the post editor page");
        cy.postEditorPage.visit();

        // When
        cy.log(
            `When I create and publish a post with title "${postTitle}" and url "${postUrl}"`
        );
        cy.postEditorPage.createAndPublishPost(postTitle, postUrl);

        cy.log(`And I navigate to the post url "${postUrl}"`);
        cy.postViewerPage.navigateToPost(postUrl);

        // Then
        cy.log(`Then I should see a page with the post title "${postTitle}"`);
        cy.postViewerPage.getPostTitle().should("have.text", postTitle);

        cy.log("And I wait for 2 seconds");
        cy.wait(2000);
    });

    it("E00202 - Crear un borrador de un post", () => {
        const postTitle = faker.word.words(2);

        // Given
        cy.log(
            `Given I am an admin logged in with email "${adminUsername}" and password "${adminPassword}"`
        );
        cy.loginPage.loginAs(adminUsername, adminPassword);

        cy.log("And I am on the post editor page");
        cy.postEditorPage.visit();

        // When
        cy.log(`When I type a post title "${postTitle}"`);
        cy.postEditorPage.setTitle(postTitle);

        cy.log("And I click on the return arrow");
        cy.postEditorPage.clickReturnArrow();

        cy.log("And I wait for 3 seconds");
        cy.wait(3000);

        // Then
        cy.log(
            `Then I should see a post "${postTitle}" in the post list flagged as draft`
        );
        cy.postListPage.visit();
        const post = cy.postListPage.getPostFromList(postTitle);
        cy.postListPage.getPostStatus(post).should("contain.text", "Draft");

        cy.log("And I wait for 2 seconds");
        cy.wait(2000);
    });
});
