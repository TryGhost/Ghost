Feature: Login feature

@user1 @web
Scenario: Successful login as administrator
  Given I navigate to page "<GHOST_URL>"
  When I wait for 2 seconds
  When I enter email "<ADMIN_USERNAME>"
  And I wait for 2 seconds
  And I enter password "<ADMIN_PASSWORD>"
  And I wait for 2 seconds
  And I click next Sign In
  And I wait for 2 seconds
  Then I should be on the "Dashboard" section

@user2 @web
Scenario: View Profile Staff
  Given I navigate to page "<GHOST_URL>"
  When I wait for 2 seconds
  When I enter email "<ADMIN_USERNAME>"
  And I wait for 2 seconds
  And I enter password "<ADMIN_PASSWORD>"
  And I wait for 2 seconds
  And I click next Sign In
  And I wait for 2 seconds
  And I click profile icon
  And I wait for 4 seconds
  And I click your profile
  And I wait for 2 seconds
  Then I should be on the profile staff section

@user3 @web
Scenario: Create Page
  Given I navigate to page "<GHOST_URL>"
  When I wait for 2 seconds
  When I enter email "<ADMIN_USERNAME>"
  And I wait for 2 seconds
  And I enter password "<ADMIN_PASSWORD>"
  And I wait for 2 seconds
  And I click next Sign In
  And I wait for 4 seconds
  And I click on pages
  Then I should be on the profile staff section
