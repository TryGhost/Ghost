**To delete a contact**

The following ``delete-contact`` example deletes a contact. The contact will no longer be reachable from any escalation plan that refers to them. ::

    aws ssm-contacts delete-contact \
        --contact-id "arn:aws:ssm-contacts:us-east-1:111122223333:contact/alejr"

This command produces no output.

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.