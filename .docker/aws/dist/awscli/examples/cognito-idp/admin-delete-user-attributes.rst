**To delete a user attribute**

This example deletes a custom attribute CustomAttr1 for user diego@example.com. 

Command::

  aws cognito-idp admin-delete-user-attributes --user-pool-id us-west-2_aaaaaaaaa --username diego@example.com --user-attribute-names "custom:CustomAttr1"

