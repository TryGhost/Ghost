Feature: F006 - Create page


@user5 @web
Scenario: Create Page
  Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"
  And I am on the page editor page
  When I create and publish a page with title "$name_post-title" and url "$name_post-url"
  And I navigate to the page url "$$name_post-url"
  Then I should see a page with the page title "$$name_post-title"
  And I wait for 2 seconds


@user6 @web
Scenario: Create Page and I can't see in home page
  Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"
  And I am on the page editor page
  When I create and publish a page with title "$name_post-title" and url "$name_post-url"
  And I navigate to the home page
  Then I shouldn't see a page in home page with title "$$name_post-title"
  And I wait for 2 seconds





