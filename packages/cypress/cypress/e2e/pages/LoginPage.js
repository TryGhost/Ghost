class LoginPage {
    visit() {
      cy.visit('http://localhost:2368/ghost/#/signin');
    }
  
    fillEmail(email) {
      cy.get('input[name="identification"]').type(email);
    }
  
    fillPassword(password) {
      cy.get('input[name="password"]').type(password);
    }
  
    submit() {
      cy.get('button.login').click();
    }
  }
  
  export default new LoginPage();