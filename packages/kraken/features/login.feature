Feature: F012 - Login feature
Esta funcionalidad permite ingresar las credenciales de 
administrador para acceder a las funcionalidades del CSM

@user1 @web
Scenario: E01201 - Inicio de sesión exitoso
  Given I am on the login page
  When I enter email "<ADMIN_USERNAME>"
  And I wait for 1 seconds
  And I enter password "<ADMIN_PASSWORD>"
  And I wait for 1 seconds
  And I click next Sign In
  And I wait for 1 seconds
  Then I should be on the "dashboard" section

@user2 @web
Scenario: E01201 - Inicio de sesión con contraseña incorrecta
  Given I am on the login page
  When I enter email "<ADMIN_USERNAME>"
  And I wait for 1 seconds
  And I enter password "$string_wrong-pass"
  And I wait for 1 seconds
  And I click next Sign In
  And I wait for 1 seconds
  Then an error message is shown
  And a retry button is shown
