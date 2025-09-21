**To confirm registration of a TOTP authenticator**

The following ``verify-software-token`` example completes TOTP registration for the current user. ::

    aws cognito-idp verify-software-token \
        --access-token eyJra456defEXAMPLE \
        --user-code 123456

Output::

    {
        "Status": "SUCCESS"
    }

For more information, see `Adding MFA to a user pool <https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html>`__ in the *Amazon Cognito Developer Guide*.