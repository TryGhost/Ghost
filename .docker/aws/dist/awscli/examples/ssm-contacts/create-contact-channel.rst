**To create a contact channel**

Creates a contact channel of type SMS for the contact Akua Mansa. Contact channels can be created of type SMS, EMAIL, or VOICE. ::

    aws ssm-contacts create-contact-channel \
        --contact-id "arn:aws:ssm-contacts:us-east-1:111122223333:contact/akuam" \
        --name "akuas sms-test" \
        --type SMS \
        --delivery-address '{"SimpleAddress": "+15005550199"}'

Output::

    {
        "ContactChannelArn": "arn:aws:ssm-contacts:us-east-1:111122223333:contact-channel/akuam/02f506b9-ea5d-4764-af89-2daa793ff024"
    }

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.