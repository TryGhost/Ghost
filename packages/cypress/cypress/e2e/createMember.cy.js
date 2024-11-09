// cypress/integration/loginAndCreateMember.spec.js
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MembersPage from './pages/MembersPage';

describe('Ghost Admin Login and Member Creation', () => {
  const email = 'g.orozcos@uniandes.edu.co';
  const password = 'Go20192099038';

  beforeEach(() => {
    // Given the user is on the Ghost login page
    LoginPage.visit();
  });

  it('should log in to Ghost admin and create a new member successfully', () => {
    // When the user enters valid login credentials and submits
    LoginPage.fillEmail(email);
    LoginPage.fillPassword(password);
    LoginPage.submit();

    // Then the user should be redirected to the dashboard
    cy.wait(5000); // Ensure the page loads completely
    DashboardPage.verifyDashboard();

    // Given the user navigates to the Members section
    DashboardPage.navigateToMembers();

    // When the user opens the new member form
    MembersPage.openNewMemberForm();

    // Then the new member form should be displayed
    const memberName = 'New Member Cypress';
    const memberEmail = `newmember${Date.now()}@example.com`;

    // Given the user has entered the new member details
    MembersPage.fillMemberDetails(memberName, memberEmail);

    // When the user saves the new member
    MembersPage.saveMember();

    // Then the new member should be created, and the URL should reflect the member's ID
    MembersPage.verifyMemberCreation();
  });
});
