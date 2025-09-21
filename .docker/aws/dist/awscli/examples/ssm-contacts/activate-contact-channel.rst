**Activate a contact's contact channel**

The following ``activate-contact-channel`` example activates a contact channel and makes it usable as part of an incident. ::

    aws ssm-contacts activate-contact-channel \
        --contact-channel-id "arn:aws:ssm-contacts:us-east-2:111122223333:contact-channel/akuam/fc7405c4-46b2-48b7-87b2-93e2f225b90d" \
        --activation-code "466136"

This command produces no output.

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.