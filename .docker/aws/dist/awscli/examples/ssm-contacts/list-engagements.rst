**To list all engagements**

The following ``list-engagements`` example lists engagements to escalation plans and contacts.  You can also list engagements for a single incident. ::

    aws ssm-contacts list-engagements

Output::

    {
        "Engagements": [
            {
                "EngagementArn": "arn:aws:ssm-contacts:us-east-2:111122223333:engagement/akuam/91792571-0b53-4821-9f73-d25d13d9e529",
                "ContactArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/akuam",
                "Sender": "cli",
                "StartTime": "2021-05-18T20:37:50.300000+00:00"
            },
            {
                "EngagementArn": "arn:aws:ssm-contacts:us-east-2:111122223333:engagement/akuam/78a29753-3674-4ac5-9f83-0468563567f0",
                "ContactArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/akuam",
                "Sender": "cli",
                "StartTime": "2021-05-18T18:40:26.666000+00:00"
            },
            {
                "EngagementArn": "arn:aws:ssm-contacts:us-east-2:111122223333:engagement/example_escalation/69e40ce1-8dbb-4d57-8962-5fbe7fc53356",
                "ContactArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/example_escalation",
                "Sender": "cli",
                "StartTime": "2021-05-18T18:25:41.151000+00:00"
            },
            {
                "EngagementArn": "arn:aws:ssm-contacts:us-east-2:111122223333:engagement/akuam/607ced0e-e8fa-4ea7-8958-a237b8803f8f",
                "ContactArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/akuam",
                "Sender": "cli",
                "StartTime": "2021-05-18T18:20:58.093000+00:00"
            }
        ]
    }

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.