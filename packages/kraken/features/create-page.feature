Feature: F006 - Crear página estática


@user5 @web
Scenario: E00601 - Crear página estática
  Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"
  And I am on the page editor page
  When I create and publish a page with title "$name_post-title" and url "$name_post-url"
  And I navigate to the page url "$$name_post-url"
  Then I should see a page with the page title "$$name_post-title"
  And I wait for 2 seconds


@user6 @web
Scenario: E00602 - Crear página estática y no se ve en homepage
  Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"
  And I am on the page editor page
  When I create and publish a page with title "$name_post-title" and url "$name_post-url"
  And I navigate to the home page
  Then I shouldn't see a page in home page with title "$$name_post-title"
  And I wait for 2 seconds





