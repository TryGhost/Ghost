**To create a user**

The following ``admin-create-user`` example creates a user with the specified settings email address and phone number. ::

    aws cognito-idp admin-create-user \
        --user-pool-id us-west-2_aaaaaaaaa \
        --username diego \
        --user-attributes Name=email,Value=diego@example.com Name=phone_number,Value="+15555551212" \
        --message-action SUPPRESS

Output::

    {
        "User": {
            "Username": "diego",
            "Attributes": [
                {
                    "Name": "sub",
                    "Value": "7325c1de-b05b-4f84-b321-9adc6e61f4a2"
                },
                {
                    "Name": "phone_number",
                    "Value": "+15555551212"
                },
                {
                    "Name": "email",
                    "Value": "diego@example.com"
                }
            ],
            "UserCreateDate": 1548099495.428,
            "UserLastModifiedDate": 1548099495.428,
            "Enabled": true,
            "UserStatus": "FORCE_CHANGE_PASSWORD"
        }
    }