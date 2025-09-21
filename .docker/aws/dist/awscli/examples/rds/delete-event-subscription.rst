**To delete an event subscription**

The following ``delete-event-subscription`` example deletes the specified event subscription. ::

    aws rds delete-event-subscription --subscription-name my-instance-events

Output::

    {
        "EventSubscription": {
            "EventSubscriptionArn": "arn:aws:rds:us-east-1:123456789012:es:my-instance-events",
            "CustomerAwsId": "123456789012",
            "Enabled": false,
            "SourceIdsList": [
                "test-instance"
            ],
            "SourceType": "db-instance",
            "EventCategoriesList": [
                "backup",
                "recovery"
            ],
            "SubscriptionCreationTime": "2018-07-31 23:22:01.893",
            "CustSubscriptionId": "my-instance-events",
            "SnsTopicArn": "arn:aws:sns:us-east-1:123456789012:interesting-events",
            "Status": "deleting"
        }
    }
