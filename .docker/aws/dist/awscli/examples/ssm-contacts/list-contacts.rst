**To list all escalation plans and contacts**

The following ``list-contacts`` example lists the contacts and escalation plans in your account. ::

    aws ssm-contacts list-contacts

Output::

    {
        "Contacts": [
            {
                "ContactArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/akuam",
                "Alias": "akuam",
                "DisplayName": "Akua Mansa",
                "Type": "PERSONAL"
            },
            {
                "ContactArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/alejr",
                "Alias": "alejr",
                "DisplayName": "Alejandro Rosalez",
                "Type": "PERSONAL"
            },
            {
                "ContactArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/anasi",
                "Alias": "anasi",
                "DisplayName": "Ana Carolina Silva",
                "Type": "PERSONAL"
            },
            {
                "ContactArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/example_escalation",
                "Alias": "example_escalation",
                "DisplayName": "Example Escalation",
                "Type": "ESCALATION"
            }
        ]
    }

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.