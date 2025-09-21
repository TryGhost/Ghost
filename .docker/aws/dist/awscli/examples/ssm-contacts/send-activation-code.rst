**To send an activation code**

The following ``send-activation-code`` example sends an activation code and message to the specified contact channel. ::

    aws ssm-contacts send-activation-code \
        --contact-channel-id "arn:aws:ssm-contacts:us-east-1:111122223333:contact-channel/akuam/8ddae2d1-12c8-4e45-b852-c8587266c400"

This command produces no output.

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.