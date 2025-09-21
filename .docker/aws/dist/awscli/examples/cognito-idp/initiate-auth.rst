**To sign in a user**

The following ``initiate-auth`` example signs in a user with the basic username-password flow and no additional challenges. ::

    aws cognito-idp initiate-auth \
        --auth-flow USER_PASSWORD_AUTH \
        --client-id 1example23456789 \
        --analytics-metadata AnalyticsEndpointId=d70b2ba36a8c4dc5a04a0451aEXAMPLE \
        --auth-parameters USERNAME=testuser,PASSWORD=[Password] --user-context-data EncodedData=mycontextdata --client-metadata MyTestKey=MyTestValue

Output::

    {
        "AuthenticationResult": {
            "AccessToken": "eyJra456defEXAMPLE",
            "ExpiresIn": 3600,
            "TokenType": "Bearer",
            "RefreshToken": "eyJra123abcEXAMPLE",
            "IdToken": "eyJra789ghiEXAMPLE",
            "NewDeviceMetadata": {
                "DeviceKey": "us-west-2_a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "DeviceGroupKey": "-v7w9UcY6"
            }
        }
    }

For more information, see `Authentication <https://docs.aws.amazon.com/cognito/latest/developerguide/authentication.html>`__ in the *Amazon Cognito Developer Guide*.
