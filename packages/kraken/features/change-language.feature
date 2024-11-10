Feature: F005 - Configurar lenguaje de publicación

@user7 @web
Scenario: E00501 - Modificar lenguaje de ghost
  Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"
  And I wait for 2 seconds
  And I click in admin setting
  And I wait for 2 seconds
  And I click in edit language
  And I wait for 2 seconds
  And I edit language "es"
  And I wait for 2 seconds
  When I click in save language
  And I wait for 2 seconds
  Then I verify the language "es"

@user8 @web
Scenario: E00502 -  Modificar lenguaje con espacios en blanco
  Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"
  And I wait for 2 seconds
  And I click in admin setting
  And I wait for 2 seconds
  And I click in edit language
  And I wait for 2 seconds
  And I edit language "es      "
  And I wait for 2 seconds
  When I click in save language
  And I wait for 2 seconds
  Then I verify the language "es      "



