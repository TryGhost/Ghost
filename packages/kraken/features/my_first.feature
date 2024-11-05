Feature: My feature

@user1 @mobile
Scenario: My scenario 1
  Given I wait
  When I send a signal to user 2 containing "hi"

@user2 @web
Scenario: My scenario 2
  Given I wait for a signal containing "hi"
  When I wait