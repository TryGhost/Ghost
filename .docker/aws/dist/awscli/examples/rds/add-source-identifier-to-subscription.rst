**To add a source identifier to a subscription**

The following ``add-source-identifier`` example adds another source identifier to an existing subscription. ::

    aws rds add-source-identifier-to-subscription \
        --subscription-name my-instance-events \
        --source-identifier test-instance-repl

Output::

    {
        "EventSubscription": {
            "SubscriptionCreationTime": "Tue Jul 31 23:22:01 UTC 2018",
            "CustSubscriptionId": "my-instance-events",
            "EventSubscriptionArn": "arn:aws:rds:us-east-1:123456789012:es:my-instance-events",
            "Enabled": false,
            "Status": "modifying",
            "EventCategoriesList": [
                "backup",
                "recovery"
            ],
            "CustomerAwsId": "123456789012",
            "SnsTopicArn": "arn:aws:sns:us-east-1:123456789012:interesting-events",
            "SourceType": "db-instance",
            "SourceIdsList": [
                "test-instance",
                "test-instance-repl"
            ]
        }
    }
