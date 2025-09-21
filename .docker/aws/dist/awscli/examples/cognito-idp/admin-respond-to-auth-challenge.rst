**To respond to an authentication challenge**

There are many ways to respond to different authentication challenges, depending on your authentication flow, user pool configuration, and user settings. The following ``admin-respond-to-auth-challenge`` example provides a TOTP MFA code for diego@example.com and completes sign-in. This user pool has device remembering turned on, so the authentication result also returns a new device key. ::

    aws cognito-idp admin-respond-to-auth-challenge \
        --user-pool-id us-west-2_EXAMPLE \
        --client-id 1example23456789 \
        --challenge-name SOFTWARE_TOKEN_MFA \
        --challenge-responses USERNAME=diego@example.com,SOFTWARE_TOKEN_MFA_CODE=000000 \
        --session AYABeExample...

Output::

    {
        "ChallengeParameters": {},
        "AuthenticationResult": {
            "AccessToken": "eyJra456defEXAMPLE",
            "ExpiresIn": 3600,
            "TokenType": "Bearer",
            "RefreshToken": "eyJra123abcEXAMPLE",
            "IdToken": "eyJra789ghiEXAMPLE",
            "NewDeviceMetadata": {
                "DeviceKey": "us-west-2_a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "DeviceGroupKey": "-ExAmPlE1"
            }
        }
    }

For more information, see `Admin authentication flow <https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html#amazon-cognito-user-pools-admin-authentication-flow>`__ in the *Amazon Cognito Developer Guide*.
