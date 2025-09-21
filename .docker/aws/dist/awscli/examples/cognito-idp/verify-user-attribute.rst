**To verify an attribute change**

The following ``verify-user-attribute`` example verifies a change to the current user's email attribute. ::

    aws cognito-idp verify-user-attribute \
        --access-token eyJra456defEXAMPLE \
        --attribute-name email \
        --code 123456

For more information, see `Configuring email or phone verification <https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-email-phone-verification.html>`__ in the *Amazon Cognito Developer Guide*.
