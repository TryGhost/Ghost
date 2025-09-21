**To display the multi-factor authentication and WebAuthn settings of a user pool**

The following ``get-user-pool-mfa-config`` example displays the MFA and WebAuthn configuration of the requested user pool. ::

    aws cognito-idp get-user-pool-mfa-config \
        --user-pool-id us-west-2_EXAMPLE

Output::

    {
        "SmsMfaConfiguration": {
            "SmsAuthenticationMessage": "Your OTP for MFA or sign-in: use {####}.",
            "SmsConfiguration": {
                "SnsCallerArn": "arn:aws:iam::123456789012:role/service-role/my-SMS-Role",
                "ExternalId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "SnsRegion": "us-west-2"
            }
        },
        "SoftwareTokenMfaConfiguration": {
            "Enabled": true
        },
        "EmailMfaConfiguration": {
            "Message": "Your OTP for MFA or sign-in: use {####}",
            "Subject": "OTP test"
        },
        "MfaConfiguration": "OPTIONAL",
        "WebAuthnConfiguration": {
            "RelyingPartyId": "auth.example.com",
            "UserVerification": "preferred"
        }
    }

For more information, see `Adding MFA <https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html>`__ in the *Amazon Cognito Developer Guide*.
