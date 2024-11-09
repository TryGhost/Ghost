// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import { LoginPage  } from "../e2e/pages/login.page";
import { ChangeLanguage  } from "../e2e/pages/change-language.page";
import { ProfileStaff  } from "../e2e/pages/profile-staff.page";
import "./commands";

// Alternatively you can use CommonJS syntax:
// require('./commands')

before(() => {
    cy.log("Global setup: Setting pages instances");
    cy.loginPage = new LoginPage();
    cy.changeLanguage= new ChangeLanguage();
    cy.profileStaff= new ProfileStaff();
});
