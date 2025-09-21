**To get the details of the current user**

The following ``get-user`` example displays the profile of the currently signed-in user. ::

    aws cognito-idp get-user \
        --access-token eyJra456defEXAMPLE

Output::

    {
        "Username": "johndoe",
        "UserAttributes": [
            {
                "Name": "sub",
                "Value": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
            },
            {
                "Name": "identities",
                "Value": "[{\"userId\":\"a1b2c3d4-5678-90ab-cdef-EXAMPLE22222\",\"providerName\":\"SignInWithApple\",\"providerType\":\"SignInWithApple\",\"issuer\":null,\"primary\":false,\"dateCreated\":1701125599632}]"
            },
            {
                "Name": "email_verified",
                "Value": "true"
            },
            {
                "Name": "custom:state",
                "Value": "Maine"
            },
            {
                "Name": "name",
                "Value": "John Doe"
            },
            {
                "Name": "phone_number_verified",
                "Value": "true"
            },
            {
                "Name": "phone_number",
                "Value": "+12065551212"
            },
            {
                "Name": "preferred_username",
                "Value": "jamesdoe"
            },
            {
                "Name": "locale",
                "Value": "EMEA"
            },
            {
                "Name": "email",
                "Value": "jamesdoe@example.com"
            }
        ]
    }

For more information, see `Managing users <https://docs.aws.amazon.com/cognito/latest/developerguide/managing-users.html>`__ in the *Amazon Cognito Developer Guide*.
