export class MembersPage {
    openNewMemberForm() {
        cy.get('a[href="#/members/new/"]').click();
        cy.url().should("include", "/#/members/new");
    }

    fillMemberDetailsComplete(name, email) {
        cy.get('input[name="name"]').type(name);
        cy.get('input[name="email"]').type(email);
    }

    fillMemberDetails(name) {
        cy.get('input[name="name"]').type(name);
    }

    saveMember() {
        cy.get("button.gh-btn-primary").click();
    }

    verifyMemberCreation() {
        // Validate the URL using a regular expression pattern
        cy.url().should(
            "match",
            /http:\/\/localhost:2368\/ghost\/#\/members\/[a-z0-9]{24}/
        );
    }

    verifyEmailError() {
        cy.get('input[name="email"]').parent().should("have.class", "error");
    }

    openMember(memberName) {
        cy.log("When I open the member to edit");
        cy.contains(".gh-list-data", memberName).click();
    }

    editMemberDetails(newName, newEmail) {
        cy.log("When I edit the member details");
        cy.get('input[name="name"]').clear().type(newName);
        cy.get('input[name="email"]').clear().type(newEmail);
        cy.get("button.gh-btn-primary").click();
    }

    verifyEditSuccess() {
        cy.log("Then the changes should be saved successfully");
        cy.get("button.gh-btn-primary")
            .should("have.class", "gh-btn-green")
            .and("contain", "Saved");
    }

    verifyUpdatedMemberInList(newName) {
        cy.log("Then I should see the updated member in the list");
        cy.get('a[href="#/members/"]').first().click();
        cy.contains(".gh-list-data", newName).should("exist");
    }

    clearEmail() {
        cy.log("When I clear the email field");
        cy.get('input[name="email"]').clear();
    }
}
