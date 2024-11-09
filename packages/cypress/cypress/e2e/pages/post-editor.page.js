import { faker } from "@faker-js/faker";

export class PostEditorPage {
    postEditorPage = "/ghost/#/editor/post";

    visit() {
        cy.visit(this.postEditorPage);
        cy.wait(1000);
    }

    createAndPublishPost(title, url) {
        this.setTitle(title);
        this.setContent(faker.lorem.paragraph());
        cy.wait(1000);
        this.clickSettings();
        cy.wait(1000);
        this.setUrl(url);
        cy.wait(1000);
        this.clickSettings();
        cy.wait(1000);
        this.clickEditorButton("Publish");
        cy.wait(1000);
        this.clickContinue();
        cy.wait(1000);
        this.clickConfirmPublish();
        cy.wait(1000);
    }

    setTitle(title) {
        cy.get("textarea[data-test-editor-title-input]").type(title);
    }

    setContent(content) {
        const data = cy.get(
            'div[data-secondary-instance="false"] p[data-koenig-dnd-droppable="true"]'
        );
        console.log("setContent", data);
        data.click().type(content);
    }

    clickSettings() {
        cy.get("button[title='Settings']").click();
    }

    setUrl(url) {
        const urlInput = cy.get("input#url");
        urlInput.clear({ force: true });
        urlInput.type(url, { force: true });
    }

    clickEditorButton(buttonName) {
        cy.get(`button.gh-btn-editor>span`).contains(buttonName).click();
    }

    clickContinue() {
        cy.get(`button.gh-btn-black>span`)
            .contains("Continue, final review →")
            .click();
    }

    clickConfirmPublish() {
        cy.get(`button[data-test-button="confirm-publish"]`).click();
    }

    clickBookmarkLink() {
        cy.get("a[data-test-complete-bookmark]").click();
    }

    clickReturnArrow() {
        cy.get('a[data-test-link="posts"]').click();
    }
}
