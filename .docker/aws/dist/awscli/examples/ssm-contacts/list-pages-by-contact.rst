**To list pages by contact**

The following ``list-pages-by-contact`` example lists all pages to the specified contact. ::

    aws ssm-contacts list-pages-by-contact \
        --contact-id "arn:aws:ssm-contacts:us-east-2:111122223333:contact/akuam"

Output::

    {
        "Pages": [
            {
                "PageArn": "arn:aws:ssm-contacts:us-east-2:111122223333:page/akuam/ad0052bd-e606-498a-861b-25726292eb93",
                "EngagementArn": "arn:aws:ssm-contacts:us-east-2:111122223333:engagement/akuam/78a29753-3674-4ac5-9f83-0468563567f0",
                "ContactArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/akuam",
                "Sender": "cli",
                "SentTime": "2021-05-18T18:43:29.301000+00:00",
                "DeliveryTime": "2021-05-18T18:43:55.265000+00:00",
                "ReadTime": "2021-05-18T18:43:55.708000+00:00"
            }
        ]
    }

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.