**To list the authentication factors available to the current user**

The following ``get-user-auth-factors`` example lists the available authentication factors for the currently signed-in user. ::

    aws cognito-idp get-user-auth-factors \
        --access-token eyJra456defEXAMPLE

Output::

    {
        "Username": "testuser",
        "ConfiguredUserAuthFactors": [
            "PASSWORD",
            "EMAIL_OTP",
            "SMS_OTP",
            "WEB_AUTHN"
        ]
    }

For more information, see `Authentication <https://docs.aws.amazon.com/cognito/latest/developerguide/authentication.html>`__ in the *Amazon Cognito Developer Guide*.
