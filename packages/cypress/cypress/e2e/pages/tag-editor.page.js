export class TagEditorPage {
    navigateToTagEditorPage() {
        cy.visit("/ghost/#/tags/new");
        cy.wait(1000);
    }

    createTag(name) {
        this.setName(name);
        this.saveChanges();
    }

    setName(name) {
        cy.get('input[data-test-input="tag-name"]').type(name);
        cy.wait(1000);
    }

    saveChanges() {
        cy.get('button[data-test-button="save"]').click();
        cy.wait(1000);
    }

    exitEditor() {
        cy.get('a[data-test-link="tags-back"]').click();
    }
}
