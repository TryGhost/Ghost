**To get passkey registration information for a signed-in user**

The following ``start-web-authn-registration`` example generates WebAuthn registration options for the current user. ::

    aws cognito-idp start-web-authn-registration \
        --access-token eyJra456defEXAMPLE

Output::

    {
        "CredentialCreationOptions": {
            "authenticatorSelection": {
                "requireResidentKey": true,
                "residentKey": "required",
                "userVerification": "preferred"
            },
            "challenge": "wxvbDicyqQqvF2EXAMPLE",
            "excludeCredentials": [
                {
                    "id": "8LApgk4-lNUFHbhm2w6Und7-uxcc8coJGsPxiogvHoItc64xWQc3r4CEXAMPLE",
                    "type": "public-key"
                }
            ],
            "pubKeyCredParams": [
                {
                    "alg": -7,
                    "type": "public-key"
                },
                {
                    "alg": -257,
                    "type": "public-key"
                }
            ],
            "rp": {
                "id": "auth.example.com",
                "name": "auth.example.com"
            },
            "timeout": 60000,
            "user": {
                "displayName": "testuser",
                "id": "ZWFhZDAyMTktMjExNy00MzlmLThkNDYtNGRiMjBlNEXAMPLE",
                "name": "testuser"
            }
        }
    }

For more information, see `Passkey sign-in <https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow-methods.html#amazon-cognito-user-pools-authentication-flow-methods-passkey>`__ in the *Amazon Cognito Developer Guide*.
