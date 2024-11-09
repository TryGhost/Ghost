export class SettingsPage {
    navigateToSettingsPage() {
        cy.visit("/ghost/#/settings");
    }

    clickEditTitleAndDescription() {
        cy.get('div[data-testid="title-and-description"] button').click();
        cy.wait(1000);
    }

    setSiteTitle(title) {
        cy.get(
            'div[data-testid="title-and-description"] input[placeholder="Site title"]'
        )
            .clear()
            .type(title);
        cy.wait(1000);
    }

    clickSaveTitleButton() {
        cy.get('div[data-testid="title-and-description"] button')
            .contains("Save")
            .click();
        cy.wait(1000);
    }

    clickExitSettingsButton() {
        cy.get('button[data-testid="exit-settings"]').click();
        cy.wait(1000);
    }

    getUnsavedChangesModal() {
        return cy.get('section[data-testid="confirmation-modal"]');
    }
}
