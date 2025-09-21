**To get a user**

This example gets information about username jane@example.com. 

Command::

  aws cognito-idp admin-get-user --user-pool-id us-west-2_aaaaaaaaa --username jane@example.com

Output::

  {
    "Username": "4320de44-2322-4620-999b-5e2e1c8df013",
    "Enabled": true,
    "UserStatus": "FORCE_CHANGE_PASSWORD",
    "UserCreateDate": 1548108509.537,
    "UserAttributes": [
        {
            "Name": "sub",
            "Value": "4320de44-2322-4620-999b-5e2e1c8df013"
        },
        {
            "Name": "email_verified",
            "Value": "true"
        },
        {
            "Name": "phone_number_verified",
            "Value": "true"
        },
        {
            "Name": "phone_number",
            "Value": "+01115551212"
        },
        {
            "Name": "email",
            "Value": "jane@example.com"
        }
    ],
    "UserLastModifiedDate": 1548108509.537
  }