**To sign in a user as an admin**

The following ``admin-initiate-auth`` example signs in the user diego@example.com. This example also includes metadata for threat protection and ClientMetadata for Lambda triggers. The user is configured for TOTP MFA and receives a challenge to provide a code from their authenticator app before they can complete authentication. ::

    aws cognito-idp admin-initiate-auth \
        --user-pool-id us-west-2_EXAMPLE \
        --client-id 1example23456789 \
        --auth-flow ADMIN_USER_PASSWORD_AUTH \
        --auth-parameters USERNAME=diego@example.com,PASSWORD="My@Example$Password3!",SECRET_HASH=ExampleEncodedClientIdSecretAndUsername= \
        --context-data="{\"EncodedData\":\"abc123example\",\"HttpHeaders\":[{\"headerName\":\"UserAgent\",\"headerValue\":\"Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0\"}],\"IpAddress\":\"192.0.2.1\",\"ServerName\":\"example.com\",\"ServerPath\":\"/login\"}" \
        --client-metadata="{\"MyExampleKey\": \"MyExampleValue\"}"

Output::

    {
        "ChallengeName": "SOFTWARE_TOKEN_MFA",
        "Session": "AYABeExample...",
        "ChallengeParameters": {
            "FRIENDLY_DEVICE_NAME": "MyAuthenticatorApp",
            "USER_ID_FOR_SRP": "diego@example.com"
        }
    }

For more information, see `Admin authentication flow <https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html#amazon-cognito-user-pools-admin-authentication-flow>`__ in the *Amazon Cognito Developer Guide*.
