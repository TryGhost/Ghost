export class SitePage {
    navigateToSitePage() {
        cy.visit("/");
    }

    getSiteTitle() {
        return cy.title();
    }
}
