**Example 1: To respond to a NEW_PASSWORD_REQUIRED challenge**

The following ``respond-to-auth-challenge`` example responds to a NEW_PASSWORD_REQUIRED challenge that `initiate-auth`_ returned. It sets a password for the user ``jane@example.com``. ::

    aws cognito-idp respond-to-auth-challenge \
        --client-id 1example23456789 \
        --challenge-name NEW_PASSWORD_REQUIRED \
        --challenge-responses USERNAME=jane@example.com,NEW_PASSWORD=[Password] \
        --session AYABeEv5HklEXAMPLE

Output::

    {
        "ChallengeParameters": {},
        "AuthenticationResult": {
            "AccessToken": "ACCESS_TOKEN",
            "ExpiresIn": 3600,
            "TokenType": "Bearer",
            "RefreshToken": "REFRESH_TOKEN",
            "IdToken": "ID_TOKEN",
            "NewDeviceMetadata": {
                "DeviceKey": "us-west-2_a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "DeviceGroupKey": "-wt2ha1Zd"
            }
        }
    }

For more information, see `Authentication <https://docs.aws.amazon.com/cognito/latest/developerguide/authentication.html>`__ in the *Amazon Cognito Developer Guide*.

**Example 2: To respond to a SELECT_MFA_TYPE challenge**

The following ``respond-to-auth-challenge`` example chooses TOTP MFA as the MFA option for the current user. The user was prompted to select an MFA type and will next be prompted to enter their MFA code. ::

    aws cognito-idp respond-to-auth-challenge \
        --client-id 1example23456789 
        --session AYABeEv5HklEXAMPLE 
        --challenge-name SELECT_MFA_TYPE 
        --challenge-responses USERNAME=testuser,ANSWER=SOFTWARE_TOKEN_MFA

Output::

    {
        "ChallengeName": "SOFTWARE_TOKEN_MFA",
        "Session": "AYABeEv5HklEXAMPLE",
        "ChallengeParameters": {
            "FRIENDLY_DEVICE_NAME": "transparent"
        }
    }

For more information, see `Adding MFA <https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html>`__ in the *Amazon Cognito Developer Guide*.

**Example 3: To respond to a SOFTWARE_TOKEN_MFA challenge**

The following ``respond-to-auth-challenge`` example provides a TOTP MFA code and completes sign-in. ::

    aws cognito-idp respond-to-auth-challenge \
        --client-id 1example23456789 \
        --session AYABeEv5HklEXAMPLE \
        --challenge-name SOFTWARE_TOKEN_MFA \
        --challenge-responses USERNAME=testuser,SOFTWARE_TOKEN_MFA_CODE=123456

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

For more information, see `Adding MFA <https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html>`__ in the *Amazon Cognito Developer Guide*.
