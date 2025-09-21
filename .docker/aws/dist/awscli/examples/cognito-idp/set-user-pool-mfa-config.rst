**To configure user pool MFA and WebAuthn**

The following ``set-user-pool-mfa-config`` example configures the requested user pool with optional MFA with all available MFA methods, and sets the WebAuthn configuration. ::

    aws cognito-idp set-user-pool-mfa-config \
        --user-pool-id us-west-2_EXAMPLE \
        --sms-mfa-configuration "SmsAuthenticationMessage=\"Your OTP for MFA or sign-in: use {####}.\",SmsConfiguration={SnsCallerArn=arn:aws:iam::123456789012:role/service-role/test-SMS-Role,ExternalId=a1b2c3d4-5678-90ab-cdef-EXAMPLE11111,SnsRegion=us-west-2}" \
        --software-token-mfa-configuration Enabled=true \
        --email-mfa-configuration "Message=\"Your OTP for MFA or sign-in: use {####}\",Subject=\"OTP test\"" \
        --mfa-configuration OPTIONAL \
        --web-authn-configuration RelyingPartyId=auth.example.com,UserVerification=preferred

Output::

    {
        "EmailMfaConfiguration": {
            "Message": "Your OTP for MFA or sign-in: use {####}",
            "Subject": "OTP test"
        },
        "MfaConfiguration": "OPTIONAL",
        "SmsMfaConfiguration": {
            "SmsAuthenticationMessage": "Your OTP for MFA or sign-in: use {####}.",
            "SmsConfiguration": {
                "ExternalId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "SnsCallerArn": "arn:aws:iam::123456789012:role/service-role/test-SMS-Role",
                "SnsRegion": "us-west-2"
            }
        },
        "SoftwareTokenMfaConfiguration": {
            "Enabled": true
        },
        "WebAuthnConfiguration": {
            "RelyingPartyId": "auth.example.com",
            "UserVerification": "preferred"
        }
    }

For more information, see `Adding MFA <https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html>`__ and `Passkey sign-in <https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow-methods.html#amazon-cognito-user-pools-authentication-flow-methods-passkey>`__ in the *Amazon Cognito Developer Guide*.
