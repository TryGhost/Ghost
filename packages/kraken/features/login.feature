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

