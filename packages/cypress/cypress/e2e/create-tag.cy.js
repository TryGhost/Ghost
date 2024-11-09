import { faker } from "@faker-js/faker";

describe("F010 - Crear tag", () => {
    const adminUsername = Cypress.env("ADMIN_USERNAME");
    const adminPassword = Cypress.env("ADMIN_PASSWORD");

    it("E01001 - Crear una nueva etiqueta", () => {
        const tagName = faker.word.words(2);

        // Given
        cy.log(
            `Given I am an admin logged in with email "${adminUsername}" and password "${adminPassword}"`
        );
        cy.loginPage.loginAs(adminUsername, adminPassword);

        cy.log("And I am in the Tag editor page");
        cy.tagEditorPage.navigateToTagEditorPage();

        // When
        cy.log(`When I create a new tag "${tagName}"`);
        cy.tagEditorPage.createTag(tagName);

        cy.log("And I navigate to the Tag list page");
        cy.tagListPage.navigateToTagListPage();

        // Then
        cy.log(`Then I should see the new tag name "${tagName}"`);
        cy.tagListPage.getTagFromList(tagName).should("exist");

        cy.log("And I wait for 2 seconds");
        cy.wait(2000);
    });

    it("E01002 - Mostrar un modal al salir del formulario sin guardar cambios", () => {
        const tagName = faker.word.words(2);

        // Given
        cy.log(
            `Given I am an admin logged in with email "${adminUsername}" and password "${adminPassword}"`
        );
        cy.loginPage.loginAs(adminUsername, adminPassword);

        cy.log("And I am in the Tag editor page");
        cy.tagEditorPage.navigateToTagEditorPage();

        // When
        cy.log(`When I type a new tag name "${tagName}"`);
        cy.tagEditorPage.setName(tagName);

        cy.log("And I exit the Tag editor page");
        cy.tagEditorPage.exitEditor();

        // Then
        cy.log("Then I should see the unsaved tag changes modal");
        cy.adminPage
            .getUnsavedChangesMessage()
            .should("equal", "Are you sure you want to leave this page?");

        cy.log("And I wait for 2 seconds");
        cy.wait(2000);
    });
});
