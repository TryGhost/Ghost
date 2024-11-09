// cypress/integration/loginAndCreateMember.spec.js
import DashboardPage from './pages/dashboard.page';
import MembersPage from './pages/members.page';

describe('Ghost Admin Login and Member Creation', () => {

  it('E00901 - should log in to Ghost admin and create a new member, then edit member successfully', () => {
    
    // When the user enters valid login credentials and submits
    cy.log('Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"');
    cy.loginPage.loginAs(Cypress.env("ADMIN_USERNAME"),Cypress.env("ADMIN_PASSWORD"));

    cy.log('Then the user should be redirected to the dashboard');
    cy.wait(5000);
    DashboardPage.verifyDashboard();

    cy.log('Given the user navigates to the Members section');
    DashboardPage.navigateToMembers();

    cy.log('When the user opens the new member form');
    MembersPage.openNewMemberForm();
    cy.log('Then the new member form should be displayed');
    
    const memberName = 'New Member Cypress';
    const memberEmail = `newmember${Date.now()}@example.com`;
    const updatedMemberName = 'Updated Member Name';
    const updatedMemberEmail = `updated${Date.now()}@example.com`;

    cy.log('Given the user has entered the new member details');
    MembersPage.fillMemberDetailsComplete(memberName, memberEmail);

    cy.log('When the user saves the new member');
    MembersPage.saveMember();

    cy.wait(500);
    
    MembersPage.verifyMemberCreation();

    cy.log('When: I navigate to the Members page');
    DashboardPage.navigateToMembers();

    cy.log('And: I open the member to edit');
    MembersPage.openMember(memberName);

    cy.log('When: I edit the member details');
    MembersPage.editMemberDetails(updatedMemberName, updatedMemberEmail);

    cy.log('Then: The changes should be saved successfully');
    MembersPage.verifyEditSuccess();

    cy.log('And: I should see the updated member in the list');
    MembersPage.verifyUpdatedMemberInList(updatedMemberName);

  });


  it('E00902 - should show an error message when trying to update a member without an email', () => {

    // When the user enters valid login credentials and submits
    cy.log('Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"');
    cy.loginPage.loginAs(Cypress.env("ADMIN_USERNAME"),Cypress.env("ADMIN_PASSWORD"));

    cy.log('Then the user should be redirected to the dashboard');
    cy.wait(5000);
    DashboardPage.verifyDashboard();

    const updatedMemberName = 'Updated Member Name';

    cy.log('When: I navigate to the Members page');
    DashboardPage.navigateToMembers();

    cy.log('And: I open the member to edit');
    MembersPage.openMember(updatedMemberName);

    cy.log('When: I update the invalid email field and save the member');
    MembersPage.clearEmail();
    MembersPage.editMemberDetails(updatedMemberName, 'invalid'); 

    cy.log('Then: I should see an error message for invalid email');
    MembersPage.verifyEmailError();
  });
  

});
