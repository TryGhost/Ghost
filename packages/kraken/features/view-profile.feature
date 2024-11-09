Feature: F004 - Ver perfil de staff

@user9 @web
Scenario: E00401 - Ver perfil desde panel administrativo
  Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"
  And I wait for 2 seconds
  And I click in admin setting
  And I wait for 4 seconds
  And I click your profile
  And I wait for 2 seconds
  Then I should be on the profile staff section



