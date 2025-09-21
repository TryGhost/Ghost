**To force a password change**

The following ``forgot-password`` example sends a message to jane@example.com to change their password. ::

    aws cognito-idp forgot-password --client-id 38fjsnc484p94kpqsnet7mpld0 --username jane@example.com

Output::

    {
        "CodeDeliveryDetails": {
            "Destination": "j***@e***.com",
            "DeliveryMedium": "EMAIL",
            "AttributeName": "email"
        }
    }
