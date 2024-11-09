class MembersPage {
    openNewMemberForm() {
      cy.get('a[href="#/members/new/"]').click();
      cy.url().should('include', '/#/members/new');
    }
  
    fillMemberDetails(name, email) {
      cy.get('input[name="name"]').type(name);
      cy.get('input[name="email"]').type(email);
    }
  
    saveMember() {
      cy.get('button.gh-btn-primary').click();
    }
  
    verifyMemberCreation() {
      cy.url().should('match', /http:\/\/localhost:2368\/ghost\/#\/members\/[a-z0-9]{24}/);
    }
  }
  
  export default new MembersPage();