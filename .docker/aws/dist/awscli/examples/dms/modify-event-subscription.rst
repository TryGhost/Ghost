**To modify an event subscription**

The following ``modify-event-subscription`` example changes the source type of an event subscription. ::

    aws dms modify-event-subscription \
        --subscription-name "my-dms-events" \
        --source-type replication-task

Output::

    {
        "EventSubscription": {
            "CustomerAwsId": "123456789012",
            "CustSubscriptionId": "my-dms-events",
            "SnsTopicArn": "arn:aws:sns:us-east-1:123456789012:my-sns-topic",
            "Status": "modifying",
            "SubscriptionCreationTime": "2020-05-29 17:04:40.262",
            "SourceType": "replication-task",
            "Enabled": true
        }
    }

For more information, see `Working with Events and Notifications <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Events.html>`__ in the *AWS Database Migration Service User Guide*.
