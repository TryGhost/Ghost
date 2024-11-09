import { faker } from "@faker-js/faker";

describe("F004 - Ver perfil de staff", () => {

    it("E00401 - Ver perfil desde panel administrativo", () => {
 
        cy.log('Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"');
        cy.loginPage.loginAs(Cypress.env("ADMIN_USERNAME"),Cypress.env("ADMIN_PASSWORD"));


        cy.log('And I click in admin setting');
        cy.profileStaff.clickAdminSetting();

        cy.log('When I click your profile');
        cy.profileStaff.clickProfile();

        cy.log('Then I should be on the profile staff section');
        cy.profileStaff.verifyProfile();

       
    });

    it("E00402 - Ver perfil desde panel administrativo y modificar nombre", () => {
        const name = faker.word.words();
        cy.log('Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"');
        cy.loginPage.loginAs(Cypress.env("ADMIN_USERNAME"),Cypress.env("ADMIN_PASSWORD"));


        cy.log('And I click in admin setting');
        cy.profileStaff.clickAdminSetting();

        cy.log('When I click your profile');
        cy.profileStaff.clickProfile();

        cy.log('And I edit the name with name "$name-fullname"');
        cy.profileStaff.setName(name);

        cy.log('When I click in save');
        cy.profileStaff.clickSave();

        cy.log('I should be on the profile staff section with name "$$name-fullname"');
        cy.profileStaff.getName(name);

       
    });


});
