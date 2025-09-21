**To delete a contact channel**

The following ``delete-contact-channel`` example deletes a contact channel. Deleting a contact channel ensures the contact channel will not be paged during an incident. ::

    aws ssm-contacts delete-contact-channel \
        --contact-channel-id "arn:aws:ssm-contacts:us-east-1:111122223333:contact-channel/akuam/13149bad-52ee-45ea-ae1e-45857f78f9b2"

This command produces no output.

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.