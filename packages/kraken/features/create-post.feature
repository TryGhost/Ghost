Feature: F002 - Crear post

@user1 @web
Scenario: E00201 - Crear un post y publicarlo
  Given I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"
  And I am on the post editor page
  When I create and publish a post with title "$name_post-title" and url "$name_post-url"
  And I navigate to the post url "$$name_post-url"
  Then I should see a page with the post title "$$name_post-title"
  And I wait for 2 seconds



