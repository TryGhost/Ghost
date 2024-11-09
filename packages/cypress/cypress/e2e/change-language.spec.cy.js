describe("F004 - Change language", () => {
    it("E00401 - Change language", () => {
        cy.log(
            'Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"'
        );
        cy.loginPage.loginAs(
            Cypress.env("ADMIN_USERNAME"),
            Cypress.env("ADMIN_PASSWORD")
        );

        cy.log("And I click in admin setting");
        cy.changeLanguage.clickAdminSetting();

        cy.log("And I click in edit language");
        cy.changeLanguage.clickEditLanguage();

        cy.log('And I edit language "es"');
        cy.changeLanguage.editLanguage("es");

        cy.log("When I click in save language");
        cy.changeLanguage.saveLanguage();

        cy.log("And I navegate to home page");
        cy.changeLanguage.navigateToHomePage();

        // Then
        cy.log('I verify the language "es"');
        cy.changeLanguage.verifyLanguage("es");
    });

    it("E00402 - Change language with space", () => {
        cy.log(
            'Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"'
        );
        cy.loginPage.loginAs(
            Cypress.env("ADMIN_USERNAME"),
            Cypress.env("ADMIN_PASSWORD")
        );

        cy.log("And I click in admin setting");
        cy.changeLanguage.clickAdminSetting();

        cy.log("And I click in edit language");
        cy.changeLanguage.clickEditLanguage();

        cy.log('And I edit language "es   "');
        cy.changeLanguage.editLanguage("es   ");

        cy.log("When I click in save language");
        cy.changeLanguage.saveLanguage();

        cy.log("And I navegate to home page");
        cy.changeLanguage.navigateToHomePage();

        // Then
        cy.log('I verify the language "es   "');
        cy.changeLanguage.verifyLanguage("es   ");
    });
});
