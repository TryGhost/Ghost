**To sign up a user**

This example signs up jane@example.com.

Command::

  aws cognito-idp sign-up --client-id 3n4b5urk1ft4fl3mg5e62d9ado --username jane@example.com --password PASSWORD --user-attributes Name="email",Value="jane@example.com" Name="name",Value="Jane"

Output::

  {
    "UserConfirmed": false,
    "UserSub": "e04d60a6-45dc-441c-a40b-e25a787d4862"
  }
