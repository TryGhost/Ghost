**To describe event subscriptions**

The following ``describe-event-subscriptions`` example lists the event subscriptions to an Amazon SNS topic. ::

    aws dms describe-event-subscriptions

Output::

    {
        "EventSubscriptionsList": [
            {
                "CustomerAwsId": "123456789012",
                "CustSubscriptionId": "my-dms-events",
                "SnsTopicArn": "arn:aws:sns:us-east-1:123456789012:my-sns-topic",
                "Status": "deleting",
                "SubscriptionCreationTime": "2020-05-21 22:28:51.924",
                "Enabled": true
            }
        ]
    }

For more information, see `Working with Events and Notifications <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Events.html>`__ in the *AWS Database Migration Service User Guide*.
