Feature: F002 - Crear post

@user1 @web
Scenario: E00201 - Crear un post y publicarlo
  Given I navigate to page "<GHOST_URL>"
  And I am an admin logged in with email "<ADMIN_USERNAME>" and password "<ADMIN_PASSWORD>"
  When I click the "Posts" section
  And I click the "Create Post" button
  And I type a post title "$string_post-title"
  And I type a random content "$string_post-content"
  And I click the "Settings" button
  And I type a random page url "$string_post-url"
  And I click the "Settings" button
  And I click the "Publish" editor button
  And I click the "Continue" button
  And I click the "Confirm publish" button
  And I wait for 2 seconds
  And I click the post bookmark link
  And I wait for 2 seconds
  Then I should see a page with the post title "$$string_post-title"
  And I wait for 2 seconds




