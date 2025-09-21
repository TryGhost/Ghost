**To update an app client**

The following ``update-user-pool-client`` example updates the configuration of the requested app client. ::

    aws cognito-idp update-user-pool-client \
        --user-pool-id us-west-2_EXAMPLE \
        --client-id 1example23456789 \
        --client-name my-test-app \
        --refresh-token-validity 30 \
        --access-token-validity 60 \
        --id-token-validity 60 \
        --token-validity-units AccessToken=minutes,IdToken=minutes,RefreshToken=days \
        --read-attributes "address" "birthdate" "email" "email_verified" "family_name" "gender" "locale" "middle_name" "name" "nickname" "phone_number" "phone_number_verified" "picture" "preferred_username" "profile" "updated_at" "website" "zoneinfo" \
        --write-attributes "address" "birthdate" "email" "family_name" "gender" "locale" "middle_name" "name" "nickname" "phone_number" "picture" "preferred_username" "profile" "updated_at" "website" "zoneinfo" \
        --explicit-auth-flows "ALLOW_ADMIN_USER_PASSWORD_AUTH" "ALLOW_CUSTOM_AUTH" "ALLOW_REFRESH_TOKEN_AUTH" "ALLOW_USER_PASSWORD_AUTH" "ALLOW_USER_SRP_AUTH" \
        --supported-identity-providers "MySAML" "COGNITO" "Google" \
        --callback-urls "https://www.example.com" "https://app2.example.com" \
        --logout-urls "https://auth.example.com/login?client_id=1example23456789&response_type=code&redirect_uri=https%3A%2F%2Fwww.example.com" "https://example.com/logout" \
        --default-redirect-uri "https://www.example.com" \
        --allowed-o-auth-flows "code" "implicit" \
        --allowed-o-auth-scopes "openid" "profile" "aws.cognito.signin.user.admin" \
        --allowed-o-auth-flows-user-pool-client \
        --prevent-user-existence-errors ENABLED \
        --enable-token-revocation \
        --no-enable-propagate-additional-user-context-data \
        --auth-session-validity 3

Output::

    {
        "UserPoolClient": {
            "UserPoolId": "us-west-2_EXAMPLE",
            "ClientName": "my-test-app",
            "ClientId": "1example23456789",
            "LastModifiedDate": "2025-01-31T14:40:12.498000-08:00",
            "CreationDate": "2023-09-13T16:26:34.408000-07:00",
            "RefreshTokenValidity": 30,
            "AccessTokenValidity": 60,
            "IdTokenValidity": 60,
            "TokenValidityUnits": {
                "AccessToken": "minutes",
                "IdToken": "minutes",
                "RefreshToken": "days"
            },
            "ReadAttributes": [
                "website",
                "zoneinfo",
                "address",
                "birthdate",
                "email_verified",
                "gender",
                "profile",
                "phone_number_verified",
                "preferred_username",
                "locale",
                "middle_name",
                "picture",
                "updated_at",
                "name",
                "nickname",
                "phone_number",
                "family_name",
                "email"
            ],
            "WriteAttributes": [
                "website",
                "zoneinfo",
                "address",
                "birthdate",
                "gender",
                "profile",
                "preferred_username",
                "locale",
                "middle_name",
                "picture",
                "updated_at",
                "name",
                "nickname",
                "phone_number",
                "family_name",
                "email"
            ],
            "ExplicitAuthFlows": [
                "ALLOW_CUSTOM_AUTH",
                "ALLOW_USER_PASSWORD_AUTH",
                "ALLOW_ADMIN_USER_PASSWORD_AUTH",
                "ALLOW_USER_SRP_AUTH",
                "ALLOW_REFRESH_TOKEN_AUTH"
            ],
            "SupportedIdentityProviders": [
                "Google",
                "COGNITO",
                "MySAML"
            ],
            "CallbackURLs": [
                "https://www.example.com",
                "https://app2.example.com"
            ],
            "LogoutURLs": [
                "https://example.com/logout",
                "https://auth.example.com/login?client_id=1example23456789&response_type=code&redirect_uri=https%3A%2F%2Fwww.example.com"
            ],
            "DefaultRedirectURI": "https://www.example.com",
            "AllowedOAuthFlows": [
                "implicit",
                "code"
            ],
            "AllowedOAuthScopes": [
                "aws.cognito.signin.user.admin",
                "openid",
                "profile"
            ],
            "AllowedOAuthFlowsUserPoolClient": true,
            "PreventUserExistenceErrors": "ENABLED",
            "EnableTokenRevocation": true,
            "EnablePropagateAdditionalUserContextData": false,
            "AuthSessionValidity": 3
        }
    }

For more information, see `Application-specific settings with app clients <https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html>`__ in the *Amazon Cognito Developer Guide*.