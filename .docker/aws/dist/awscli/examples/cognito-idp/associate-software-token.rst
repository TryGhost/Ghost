**To generate a secret key for an MFA authenticator app**

The following ``associate-software-token`` example generates a TOTP private key for a user who has signed in and received an access token. The resulting private key can be manually entered into an authenticator app, or applications can render it as a QR code that the user can scan. ::

    aws cognito-idp associate-software-token \
        --access-token eyJra456defEXAMPLE

Output::

    {
        "SecretCode": "QWERTYUIOP123456EXAMPLE"
    }

For more information, see `TOTP software token MFA <https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa-totp.html>`__ in the *Amazon Cognito Developer Guide*.
