class DashboardPage {
    verifyDashboard() {
      cy.url().should('include', '/ghost/#/dashboard');
      cy.get('.gh-nav').should('be.visible');
    }
  
    navigateToMembers() {
      cy.get('a[href="#/members/"]').first().click();
    }
  }
  
  export default new DashboardPage();