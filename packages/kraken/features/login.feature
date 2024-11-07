Feature: F012 - Login feature
Esta funcionalidad permite ingresar las credenciales de 
administrador para acceder a las funcionalidades del CSM

@user1 @web
Scenario: E01201 - Inicio de sesión exitoso
  Given I navigate to page "<GHOST_URL>"
  When I wait for 2 seconds
  When I enter email "<ADMIN_USERNAME>"
  And I wait for 2 seconds
  And I enter password "<ADMIN_PASSWORD>"
  And I wait for 2 seconds
  And I click next Sign In
  And I wait for 2 seconds
  Then I should be on the "Dashboard" section

