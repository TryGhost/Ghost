**To list passkey credentials**

The following ``list-web-authn-credentials`` example lists passkey, or WebAuthn, credentials for the current user. They have one registered device. ::

    aws cognito-idp list-web-authn-credentials \
        --access-token eyJra456defEXAMPLE

Output::

    {
        "Credentials": [
            {
                "AuthenticatorAttachment": "cross-platform",
                "CreatedAt": 1736293876.115,
                "CredentialId": "8LApgk4-lNUFHbhm2w6Und7-uxcc8coJGsPxiogvHoItc64xWQc3r4CEXAMPLE",
                "FriendlyCredentialName": "Roaming passkey",
                "RelyingPartyId": "auth.example.com"
            }
        ]
    }

For more information, see `Passkey sign-in <https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow-methods.html#amazon-cognito-user-pools-authentication-flow-methods-passkey>`__ in the *Amazon Cognito Developer Guide*.
