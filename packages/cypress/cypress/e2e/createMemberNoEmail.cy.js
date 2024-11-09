describe('Ghost Admin Login', () => {
    // Configura los datos de inicio de sesión
    const email = 'g.orozcos@uniandes.edu.co'; // Cambia por el correo de tu cuenta de Ghost
    const password = 'Go20192099038'; // Cambia por la contraseña de tu cuenta de Ghost
  
    beforeEach(() => {
      // Visita la página de inicio de sesión de Ghost
      cy.visit('http://localhost:2368/ghost/#/signin'); // Cambia la URL si tu instancia de Ghost está en otro dominio o puerto
    });
  
    it('should log in to Ghost admin successfully', () => {
      // Completa el formulario de inicio de sesión
      cy.get('input[name="identification"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('button.login').click();
      cy.wait(5000); // Espera explícita para permitir la redirección
  
      // Verifica que se haya iniciado sesión correctamente
      cy.url().should('include', '/ghost/#/dashboard'); // Ajusta la URL de redirección según tu versión de Ghost
      cy.get('.gh-nav').should('be.visible'); // Verifica que el menú de navegación esté visible después de iniciar sesión
      cy.get('a[href="#/members/"]').first().click(); 
  
      cy.get('a[href="#/members/new/"]').click();
      cy.url().should('include', '/#/members/new'); // Verify we are on the "New Member" page
  
       // Fill in the member details
       const memberName = 'New Member Cypress';
       //const memberEmail = `newmember${Date.now()}@example.com`;
   
       cy.get('input[name="name"]').type(memberName);
       //cy.get('input[name="email"]').type(memberEmail);
   
       // Click the save button to create the member
       cy.get('button.gh-btn-primary').click();
  
         // Optionally, you can also verify the presence of an error indicator or the specific error message related to the email field
       cy.get('input[name="email"]').parent().should('have.class', 'error');
  
  
    });
  
  });
  