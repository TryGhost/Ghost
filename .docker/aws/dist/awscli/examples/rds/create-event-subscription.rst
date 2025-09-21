**To create an event subscription**

The following ``create-event-subscription`` example creates a subscription for backup and recovery events for DB instances in the current AWS account. Notifications are sent to an Amazon Simple Notification Service topic, specified by ``--sns-topic-arn``. ::

    aws rds create-event-subscription \
        --subscription-name my-instance-events \
        --source-type db-instance \
        --event-categories '["backup","recovery"]' \
        --sns-topic-arn arn:aws:sns:us-east-1:123456789012:interesting-events

Output::

    {
        "EventSubscription": {
            "Status": "creating",
            "CustSubscriptionId": "my-instance-events",
            "SubscriptionCreationTime": "Tue Jul 31 23:22:01 UTC 2018",
            "EventCategoriesList": [
                "backup",
                "recovery"
            ],
            "SnsTopicArn": "arn:aws:sns:us-east-1:123456789012:interesting-events",
            "CustomerAwsId": "123456789012",
            "EventSubscriptionArn": "arn:aws:rds:us-east-1:123456789012:es:my-instance-events",
            "SourceType": "db-instance",
            "Enabled": true
        }
    }
