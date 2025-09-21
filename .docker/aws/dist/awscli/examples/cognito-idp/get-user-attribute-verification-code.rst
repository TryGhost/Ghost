**To send an attribute verification code to the current user**

The following ``get-user-attribute-verification-code`` example sends an attribute verification code to the currently signed-in user's email address. ::

    aws cognito-idp get-user-attribute-verification-code \
        --access-token eyJra456defEXAMPLE \
        --attribute-name email

Output::

    {
        "CodeDeliveryDetails": {
            "Destination": "a***@e***",
            "DeliveryMedium": "EMAIL",
            "AttributeName": "email"
        }
    }

For more information, see `Signing up and confirming user accounts <https://docs.aws.amazon.com/cognito/latest/developerguide/signing-up-users-in-your-app.html>`__ in the *Amazon Cognito Developer Guide*.
