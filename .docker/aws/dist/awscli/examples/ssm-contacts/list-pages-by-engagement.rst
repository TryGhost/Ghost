**To list pages to contact channels started from an engagement.**

The following ``list-pages-by-engagement`` example lists the pages that occurred while engaging the defined engagement plan. ::

    aws ssm-contacts list-pages-by-engagement \
        --engagement-id "arn:aws:ssm-contacts:us-east-2:111122223333:engagement/akuam/78a29753-3674-4ac5-9f83-0468563567f0"

Output::

    {
        "Pages": [
            {
                "PageArn": "arn:aws:ssm-contacts:us-east-2:111122223333:page/akuam/ad0052bd-e606-498a-861b-25726292eb93",
                "EngagementArn": "arn:aws:ssm-contacts:us-east-2:111122223333:engagement/akuam/78a29753-3674-4ac5-9f83-0468563567f0",
                "ContactArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/akuam",
                "Sender": "cli",
                "SentTime": "2021-05-18T18:40:27.245000+00:00"
            }
        ]
    }

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.