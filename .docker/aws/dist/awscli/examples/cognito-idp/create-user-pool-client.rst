**To create a user pool client**

The following ``create-user-pool-client`` example creates a new user pool client with a client secret, explicit read and write attributes, sign in with username-password and SRP flows, sign-in with three IdPs, access to a subset of OAuth scopes, PinPoint analytics, and an extended authentication session validity. ::

    aws cognito-idp create-user-pool-client \
        --user-pool-id us-west-2_EXAMPLE \
        --client-name MyTestClient \
        --generate-secret \
        --refresh-token-validity 10 \
        --access-token-validity 60 \
        --id-token-validity 60 \
        --token-validity-units AccessToken=minutes,IdToken=minutes,RefreshToken=days \
        --read-attributes email phone_number email_verified phone_number_verified \
        --write-attributes email phone_number \
        --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
        --supported-identity-providers Google Facebook MyOIDC \
        --callback-urls https://www.amazon.com https://example.com http://localhost:8001 myapp://example \
        --allowed-o-auth-flows code implicit \
        --allowed-o-auth-scopes openid profile aws.cognito.signin.user.admin solar-system-data/asteroids.add \
        --allowed-o-auth-flows-user-pool-client \
        --analytics-configuration ApplicationArn=arn:aws:mobiletargeting:us-west-2:767671399759:apps/thisisanexamplepinpointapplicationid,UserDataShared=TRUE \
        --prevent-user-existence-errors ENABLED \
        --enable-token-revocation \
        --enable-propagate-additional-user-context-data \
        --auth-session-validity 4

Output::

    {
        "UserPoolClient": {
            "UserPoolId": "us-west-2_EXAMPLE",
            "ClientName": "MyTestClient",
            "ClientId": "123abc456defEXAMPLE",
            "ClientSecret": "this1234is5678my91011example1213client1415secret",
            "LastModifiedDate": 1726788459.464,
            "CreationDate": 1726788459.464,
            "RefreshTokenValidity": 10,
            "AccessTokenValidity": 60,
            "IdTokenValidity": 60,
            "TokenValidityUnits": {
                "AccessToken": "minutes",
                "IdToken": "minutes",
                "RefreshToken": "days"
            },
            "ReadAttributes": [
                "email_verified",
                "phone_number_verified",
                "phone_number",
                "email"
            ],
            "WriteAttributes": [
                "phone_number",
                "email"
            ],
            "ExplicitAuthFlows": [
                "ALLOW_USER_PASSWORD_AUTH",
                "ALLOW_USER_SRP_AUTH",
                "ALLOW_REFRESH_TOKEN_AUTH"
            ],
            "SupportedIdentityProviders": [
                "Google",
                "MyOIDC",
                "Facebook"
            ],
            "CallbackURLs": [
                "https://example.com",
                "https://www.amazon.com",
                "myapp://example",
                "http://localhost:8001"
            ],
            "AllowedOAuthFlows": [
                "implicit",
                "code"
            ],
            "AllowedOAuthScopes": [
                "aws.cognito.signin.user.admin",
                "openid",
                "profile",
                "solar-system-data/asteroids.add"
            ],
            "AllowedOAuthFlowsUserPoolClient": true,
            "AnalyticsConfiguration": {
                "ApplicationArn": "arn:aws:mobiletargeting:us-west-2:123456789012:apps/thisisanexamplepinpointapplicationid",
                "RoleArn": "arn:aws:iam::123456789012:role/aws-service-role/cognito-idp.amazonaws.com/AWSServiceRoleForAmazonCognitoIdp",
                "UserDataShared": true
            },
            "PreventUserExistenceErrors": "ENABLED",
            "EnableTokenRevocation": true,
            "EnablePropagateAdditionalUserContextData": true,
            "AuthSessionValidity": 4
        }
    }

For more information, see `Application-specific settings with app clients <https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html>`__ in the *Amazon Cognito Developer Guide*.
