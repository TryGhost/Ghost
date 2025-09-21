**To list page receipts**

The following ``command-name`` example lists whether a page was received or not by a contact. ::

    aws ssm-contacts list-page-receipts \
        --page-id "arn:aws:ssm-contacts:us-east-2:111122223333:page/akuam/94ea0c7b-56d9-46c3-b84a-a37c8b067ad3"

Output::

    {
        "Receipts": [
            {
                "ContactChannelArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact-channel/akuam/fc7405c4-46b2-48b7-87b2-93e2f225b90d",
                "ReceiptType": "DELIVERED",
                "ReceiptInfo": "425440",
                "ReceiptTime": "2021-05-18T20:42:57.485000+00:00"
            },
            {
                "ContactChannelArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact-channel/akuam/fc7405c4-46b2-48b7-87b2-93e2f225b90d",
                "ReceiptType": "READ",
                "ReceiptInfo": "425440",
                "ReceiptTime": "2021-05-18T20:42:57.907000+00:00"
            },
            {
                "ContactChannelArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact-channel/akuam/fc7405c4-46b2-48b7-87b2-93e2f225b90d",
                "ReceiptType": "SENT",
                "ReceiptInfo": "SM6656c19132f1465f9c9c1123a5dde7c9",
                "ReceiptTime": "2021-05-18T20:40:52.962000+00:00"
            }
        ]
    }

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.