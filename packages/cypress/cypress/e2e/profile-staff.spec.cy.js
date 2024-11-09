describe("F004 - View Profile Staff", () => {

    it("E00401 - View Profile Staff", () => {
 
        cy.log('Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"');
        cy.loginPage.loginAs(Cypress.env("ADMIN_USERNAME"),Cypress.env("ADMIN_PASSWORD"));


        cy.log('And I click in admin setting');
        cy.profileStaff.clickAdminSetting();

        cy.log('When I click your profile');
        cy.profileStaff.clickProfile();

        cy.log('Then I should be on the profile staff section');
        cy.profileStaff.verifyProfile();

       
    });


});
