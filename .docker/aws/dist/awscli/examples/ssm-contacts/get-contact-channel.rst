**To list the details of a contact channel**

The following ``get-contact-channel`` example lists the details of a contact channel. ::

    aws ssm-contacts get-contact-channel \
        --contact-channel-id "arn:aws:ssm-contacts:us-east-2:111122223333:contact-channel/akuam/fc7405c4-46b2-48b7-87b2-93e2f225b90d"

Output::

    {
        "ContactArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/akuam",
        "ContactChannelArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact-channel/akuam/fc7405c4-46b2-48b7-87b2-93e2f225b90d",
        "Name": "akuas sms",
        "Type": "SMS",
        "DeliveryAddress": {
            "SimpleAddress": "+15005550199"
        },
        "ActivationStatus": "ACTIVATED"
    }

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.