Feature: F001 - Modificar titulo del sitio

@user7 @web
Scenario: E00101 - Modificación titulo de sitio web
  Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"
  And I am in the Settings page
  When I click the edit title and description option
  And I modify the title to "$name_site-title"
  And I click the save title button
  And I wait for 1 seconds
  And I navigate to Site page
  And I wait for 1 seconds
  Then the site name should be "$$name_site-title"
  And I wait for 2 seconds