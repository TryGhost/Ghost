class MembersPage {
    openNewMemberForm() {
      cy.get('a[href="#/members/new/"]').click();
      cy.url().should('include', '/#/members/new');
    }
  
    fillMemberDetailsComplete(name, email) {
      cy.get('input[name="name"]').type(name);
      cy.get('input[name="email"]').type(email);
    }

    
    fillMemberDetails(name) {
      cy.get('input[name="name"]').type(name);     
    }
  
    saveMember() {
      cy.get('button.gh-btn-primary').click();
    }
  
    verifyMemberCreation() {
        // Validate the URL using a regular expression pattern
        cy.url().should('match', /http:\/\/localhost:2368\/ghost\/#\/members\/[a-z0-9]{24}/);
    }
    

    verifyEmailError() {
      cy.get('input[name="email"]').parent().should('have.class', 'error');
    }
  }
  
  export default new MembersPage();