// cypress/integration/loginAndCreateMember.spec.js

describe("Ghost Admin Login and Member Creation", () => {
    it("E00901 - should log in to Ghost admin and create a new member, then edit member successfully", () => {
        // When the user enters valid login credentials and submits
        cy.log(
            'Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"'
        );
        cy.loginPage.loginAs(
            Cypress.env("ADMIN_USERNAME"),
            Cypress.env("ADMIN_PASSWORD")
        );

        cy.log("Then the user should be redirected to the dashboard");
        cy.wait(5000);
        cy.dashboardPage.verifyDashboard();

        cy.log("Given the user navigates to the Members section");
        cy.dashboardPage.navigateToMembers();

        cy.log("When the user opens the new member form");
        cy.membersPage.openNewMemberForm();
        cy.log("Then the new member form should be displayed");

        const memberName = "New Member Cypress";
        const memberEmail = `newmember${Date.now()}@example.com`;
        const updatedMemberName = "Updated Member Name";
        const updatedMemberEmail = `updated${Date.now()}@example.com`;

        cy.log("Given the user has entered the new member details");
        cy.membersPage.fillMemberDetailsComplete(memberName, memberEmail);

        cy.log("When the user saves the new member");
        cy.membersPage.saveMember();

        cy.wait(500);

        cy.membersPage.verifyMemberCreation();

        cy.log("When: I navigate to the Members page");
        cy.dashboardPage.navigateToMembers();

        cy.log("And: I open the member to edit");
        cy.membersPage.openMember(memberName);

        cy.log("When: I edit the member details");
        cy.membersPage.editMemberDetails(updatedMemberName, updatedMemberEmail);

        cy.log("Then: The changes should be saved successfully");
        cy.membersPage.verifyEditSuccess();

        cy.log("And: I should see the updated member in the list");
        cy.membersPage.verifyUpdatedMemberInList(updatedMemberName);
    });

    it("E00902 - should show an error message when trying to update a member without an email", () => {
        // When the user enters valid login credentials and submits
        cy.log(
            'Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"'
        );
        cy.loginPage.loginAs(
            Cypress.env("ADMIN_USERNAME"),
            Cypress.env("ADMIN_PASSWORD")
        );

        cy.log("Then the user should be redirected to the dashboard");
        cy.wait(5000);
        cy.dashboardPage.verifyDashboard();

        const updatedMemberName = "Updated Member Name";

        cy.log("When: I navigate to the Members page");
        cy.dashboardPage.navigateToMembers();

        cy.log("And: I open the member to edit");
        cy.membersPage.openMember(updatedMemberName);

        cy.log("When: I update the invalid email field and save the member");
        cy.membersPage.clearEmail();
        cy.membersPage.editMemberDetails(updatedMemberName, "invalid");

        cy.log("Then: I should see an error message for invalid email");
        cy.membersPage.verifyEmailError();
    });
});
