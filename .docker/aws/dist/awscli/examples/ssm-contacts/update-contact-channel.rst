**To update a contact channel**

The following ``update-contact-channel`` example updates the name and delivery address of a contact channel. ::

    aws ssm-contacts update-contact-channel \
        --contact-channel-id "arn:aws:ssm-contacts:us-east-2:111122223333:contact-channel/akuam/49f3c24d-5f9f-4638-ae25-3f49e04229ad" \
        --name "akuas voice channel" \
        --delivery-address '{"SimpleAddress": "+15005550198"}'

This command produces no output.

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.