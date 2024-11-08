describe("F012 - Login feature", () => {
    it("E01201 - Inicio de sesión exitoso", () => {
        // Given
        cy.log("Given I am on the login page");
        cy.loginPage.visit();

        // When
        cy.log('When I enter email "<ADMIN_USERNAME>"');
        cy.loginPage.enterEmail(Cypress.env("ADMIN_USERNAME"));

        cy.log('And I enter password "<ADMIN_PASSWORD>"');
        cy.loginPage.enterPassword(Cypress.env("ADMIN_PASSWORD"));

        cy.log("And I click next Sign In");
        cy.loginPage.clickSignIn();

        // Then
        cy.log('Then I should be on the "dashboard" section');
        cy.url().should("include", "/dashboard");
    });

    it("E01201 - Inicio de sesión con contraseña incorrecta", () => {
        // Given
        cy.log("Given I am on the login page");
        cy.loginPage.visit();

        // When
        cy.log('When I enter email "<ADMIN_USERNAME>"');
        cy.loginPage.enterEmail(Cypress.env("ADMIN_USERNAME"));

        cy.log("And I enter a wrong password");
        cy.loginPage.enterPassword("wrong-pass");

        cy.log("And I click next Sign In");
        cy.loginPage.clickSignIn();

        // Then
        cy.log("Then an error message is shown");
        cy.contains("Your password is incorrect.").should("be.visible");

        cy.log("And a retry button is shown");
        cy.contains("Retry").should("be.visible");
    });
});
