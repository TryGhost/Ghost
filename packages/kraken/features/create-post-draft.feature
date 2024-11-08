Feature: F002 - Crear post

@user1 @web
Scenario: E00202 - Crear un borrador de un post
  Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"
  And I am on the post editor page
  When I type a post title "$name_post-title"
  And I click on the return arrow
  And I wait for 3 seconds
  Then I should see a post "$$name_post-title" in the post list flagged as draft
  And I wait for 2 seconds