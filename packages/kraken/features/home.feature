Feature: Home feaure

@user1 @web
Scenario: Navigate to University page
  Given I navigate to page "https://losestudiantes.com/"

  When I click on first univeristy
  And I see that the University page is loaded

