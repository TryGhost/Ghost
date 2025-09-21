**To modify an event subscription**

The following ``modify-event-subscription`` example disables the specified event subscription, so that it no longer publishes notifications to the specified Amazon Simple Notification Service topic. ::

    aws rds modify-event-subscription \
        --subscription-name my-instance-events \
        --no-enabled

Output::

    {
        "EventSubscription": {
            "EventCategoriesList": [
                "backup",
                "recovery"
            ],
            "CustomerAwsId": "123456789012",
            "SourceType": "db-instance",
            "SubscriptionCreationTime": "Tue Jul 31 23:22:01 UTC 2018",
            "EventSubscriptionArn": "arn:aws:rds:us-east-1:123456789012:es:my-instance-events",
            "SnsTopicArn": "arn:aws:sns:us-east-1:123456789012:interesting-events",
            "CustSubscriptionId": "my-instance-events",
            "Status": "modifying",
            "Enabled": false
        }
    }
