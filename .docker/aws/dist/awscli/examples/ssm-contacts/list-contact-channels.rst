**To list the contact channels of a contact**

The following ``list-contact-channels`` example lists the available contact channels of the specified contact. ::

    aws ssm-contacts list-contact-channels \
        --contact-id "arn:aws:ssm-contacts:us-east-2:111122223333:contact/akuam"

Output::

    {
        [
            {
                "ContactArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/akuam",
                "Name": "akuas email",
                "Type": "EMAIL",
                "DeliveryAddress": {
                    "SimpleAddress": "akuam@example.com"
                },
                "ActivationStatus": "NOT_ACTIVATED"
            },
            {
                "ContactChannelArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact-channel/akuam/fc7405c4-46b2-48b7-87b2-93e2f225b90d",
                "ContactArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/akuam",
                "Name": "akuas sms",
                "Type": "SMS",
                "DeliveryAddress": {
                    "SimpleAddress": "+15005550100"
                },
                "ActivationStatus": "ACTIVATED"
            }
        ]
    }

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.