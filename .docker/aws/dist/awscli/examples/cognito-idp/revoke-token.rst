**To revoke a refresh token**

The following ``revoke-token`` revokes the requested refresh token and associated access tokens. ::

    aws cognito-idp revoke-token \
        --token eyJjd123abcEXAMPLE \
        --client-id 1example23456789

This command produces no output.

For more information, see `Revoking tokens <https://docs.aws.amazon.com/cognito/latest/developerguide/token-revocation.html>`__ in the *Amazon Cognito Developer Guide*.
