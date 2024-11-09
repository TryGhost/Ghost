import { faker } from "@faker-js/faker";

describe("F006 - Crear página estática", () => {
    it("E00601 - Crear página estática", () => {
        const pageTitle = faker.word.words(2);
        const pageUrl = faker.word.words(1);

        // Given
        cy.log(
            'Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"'
        );
        cy.loginPage.visit();
        cy.loginPage.loginAs(
            Cypress.env("ADMIN_USERNAME"),
            Cypress.env("ADMIN_PASSWORD")
        );

        cy.log("And I am on the post editor page");
        cy.createPage.visit();

        // When
        cy.log(
            `When I create and publish a page with title "${pageTitle}" and url "${pageUrl}"`
        );
        cy.createPage.createAndPublishPage(pageTitle, pageUrl);

        cy.log(`And I navigate to the page url "${pageUrl}"`);
        cy.createPage.navigateToPage(pageUrl);

        // Then
        cy.log(`Then I should see a page with the post title "${pageTitle}"`);
        cy.createPage.getPageTitle().should("have.text", pageTitle);

        cy.log("And I wait for 2 seconds");
        cy.wait(2000);
    });


    it("E00602 - Crear pagina estatica y no se visualiza en HomePage", () => {
        const pageTitle = faker.word.words(2);
        const pageUrl = faker.word.words(1);

        // Given
        cy.log(
            'Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"'
        );
        cy.loginPage.visit();
        cy.loginPage.loginAs(
            Cypress.env("ADMIN_USERNAME"),
            Cypress.env("ADMIN_PASSWORD")
        );

        cy.log("And I am on the post editor page");
        cy.createPage.visit();

        // When
        cy.log(
            `When I create and publish a page with title "${pageTitle}" and url "${pageUrl}"`
        );
        cy.createPage.createAndPublishPage(pageTitle, pageUrl);

        cy.log(`And I navigate to the homepage`);
        cy.createPage.navigateToHomePage(pageUrl);

        // Then
        cy.log(`Then I shouldn't see a page in home page with title "${pageTitle}"`);
        cy.createPage.verifyPageInHomePage(pageTitle).then((result) => {
            expect(false).to.equal(result);
        });

        cy.log("And I wait for 2 seconds");
        cy.wait(2000);
    });
});
