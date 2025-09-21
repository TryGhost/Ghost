**To describe the details of an engagement**

The following ``describe-engagement`` example lists the details of an engagement to a contact or escalation plan. The subject and content are sent to the contact channels. ::

    aws ssm-contacts describe-engagement \
        --engagement-id "arn:aws:ssm-contacts:us-east-2:111122223333:engagement/example_escalation/69e40ce1-8dbb-4d57-8962-5fbe7fc53356"

Output::

    {
        "ContactArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/example_escalation",
        "EngagementArn": "arn:aws:ssm-contacts:us-east-2:111122223333:engagement/example_escalation/69e40ce1-8dbb-4d57-8962-5fbe7fc53356",
        "Sender": "cli",
        "Subject": "cli-test",
        "Content": "Testing engagements via CLI",
        "PublicSubject": "cli-test",
        "PublicContent": "Testing engagements va CLI",
        "StartTime": "2021-05-18T18:25:41.151000+00:00"
    }

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.