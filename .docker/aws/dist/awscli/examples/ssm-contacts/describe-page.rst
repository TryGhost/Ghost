**To list the details of a page to a contact channel**

The following ``describe-page`` example lists details of a page to a contact channel. The page will include the subject and content provided. ::

    aws ssm-contacts describe-page \
        --page-id "arn:aws:ssm-contacts:us-east-2:111122223333:page/akuam/ad0052bd-e606-498a-861b-25726292eb93"

Output::

    {
        "PageArn": "arn:aws:ssm-contacts:us-east-2:111122223333:page/akuam/ad0052bd-e606-498a-861b-25726292eb93",
        "EngagementArn": "arn:aws:ssm-contacts:us-east-2:111122223333:engagement/akuam/78a29753-3674-4ac5-9f83-0468563567f0",
        "ContactArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/akuam",
        "Sender": "cli",
        "Subject": "cli-test",
        "Content": "Testing engagements via CLI",
        "PublicSubject": "cli-test",
        "PublicContent": "Testing engagements va CLI",
        "SentTime": "2021-05-18T18:43:29.301000+00:00",
        "ReadTime": "2021-05-18T18:43:55.708000+00:00",
        "DeliveryTime": "2021-05-18T18:43:55.265000+00:00"
    }

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.