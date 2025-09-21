**To update user attributes**

This example updates the user attribute "nickname".

Command::

  aws cognito-idp update-user-attributes --access-token ACCESS_TOKEN --user-attributes Name="nickname",Value="Dan"
