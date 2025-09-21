**To resend a confirmation code**

The following ``resend-confirmation-code`` example sends a confirmation code to the user ``jane``. ::

    aws cognito-idp resend-confirmation-code \
        --client-id 12a3b456c7de890f11g123hijk \
        --username jane

Output::

    {
        "CodeDeliveryDetails": {
            "Destination": "j***@e***.com",
            "DeliveryMedium": "EMAIL",
            "AttributeName": "email"
        }
    }

For more information, see `Signing up and confirming user accounts <https://docs.aws.amazon.com/cognito/latest/developerguide/signing-up-users-in-your-app.html>`__ in the *Amazon Cognito Developer Guide*.