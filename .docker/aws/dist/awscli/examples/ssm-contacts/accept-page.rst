**To accept a page during and engagement**

The following ``accept-page`` example uses an accept code sent to the contact channel to accept a page. ::

    aws ssm-contacts accept-page \
        --page-id "arn:aws:ssm-contacts:us-east-2:682428703967:page/akuam/94ea0c7b-56d9-46c3-b84a-a37c8b067ad3" \
        --accept-type READ \
        --accept-code 425440 

This command produces no output

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.