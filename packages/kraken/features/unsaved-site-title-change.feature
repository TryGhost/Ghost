Feature: F005 - Modificar titulo del sitio

@user7 @web
Scenario: E00103 -Mostrar un modal al salir de configuraciones sin guardar cambios en el título
  Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"
  And I am in the Settings page
  When I click the edit title and description option
  And I modify the title to "$name_site-title"
  And I click the exit Settings button
  And I wait for 1 seconds
  Then I should see the unsaved changes modal
  And I wait for 2 seconds