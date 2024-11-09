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

import {
    LoginPage,
    PostViewerPage,
    PostEditorPage,
    ChangeLanguage,
    DashboardPage,
    MembersPage,
    ProfileStaff,
    CreatePage,
    PostListPage,
    SettingsPage,
    SitePage,
    TagEditorPage,
    TagListPage,
    AdminPage,
} from "../e2e/pages";
import "./commands";

// Alternatively you can use CommonJS syntax:
// require('./commands')

before(() => {
    cy.log("Global setup: Setting pages instances");
    cy.loginPage = new LoginPage();
    cy.changeLanguage= new ChangeLanguage();
    cy.profileStaff= new ProfileStaff();
    cy.changeLanguage = new ChangeLanguage();
    cy.postViewerPage = new PostViewerPage();
    cy.postEditorPage = new PostEditorPage();
    cy.dashboardPage = new DashboardPage();
    cy.membersPage = new MembersPage();
    cy.createPage= new CreatePage();
    cy.postListPage = new PostListPage();
    cy.settingsPage = new SettingsPage();
    cy.sitePage = new SitePage();
    cy.tagEditorPage = new TagEditorPage();
    cy.tagListPage = new TagListPage();
    cy.adminPage = new AdminPage();
});
