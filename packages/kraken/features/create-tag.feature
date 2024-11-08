Feature: F010 - Crear tag

@user1 @web
Scenario: E01001 - Crear una nueva etiqueta
  Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"
  And I am in the Tag editor page
  When I create a new tag "$name_tag-name"
  And I navigate to the Tag list page
  Then I should see the new tag name "$$name_tag-name"
  And I wait for 2 seconds

@user2 @web
Scenario: E01002 - Mostrar un modal al salir del formulario sin guardar cambios
  Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"
  And I am in the Tag editor page
  When I type a new tag name "$name_tag-name"
  And I exit the Tag editor page
  Then I should see the unsaved tag changes modal
  And I wait for 2 seconds