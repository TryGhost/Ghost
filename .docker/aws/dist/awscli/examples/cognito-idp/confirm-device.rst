**To confirm a user device**

The following ``confirm-device`` example adds a new remembered device for the current user. ::

     aws cognito-idp confirm-device \
        --access-token eyJra456defEXAMPLE \
        --device-key us-west-2_a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
        --device-secret-verifier-config PasswordVerifier=TXlWZXJpZmllclN0cmluZw,Salt=TXlTUlBTYWx0

Output::

    {
         "UserConfirmationNecessary": false
    }

For more information, see `Working with user devices in your user pool <https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-device-tracking.html>`__ in the *Amazon Cognito Developer Guide*.
