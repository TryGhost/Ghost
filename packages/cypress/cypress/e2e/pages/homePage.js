export class HomePage {
    visit() {
        cy.visit("/");
    }

    clickFirstUniversity() {
        cy.contains("Uniandes").click();
    }
}
