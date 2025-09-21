**To delete an event subscription**

The following ``delete-event-subscription`` example deletes a subscription to an Amazon SNS topic. ::

    aws dms delete-event-subscription \
        --subscription-name "my-dms-events"

Output::

    {
        "EventSubscription": {
            "CustomerAwsId": "123456789012",
            "CustSubscriptionId": "my-dms-events",
            "SnsTopicArn": "arn:aws:sns:us-east-1:123456789012:my-sns-topic",
            "Status": "deleting",
            "SubscriptionCreationTime": "2020-05-21 21:58:38.598",
            "Enabled": true
        }
    }

For more information, see `Working with Events and Notifications <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Events.html>`__ in the *AWS Database Migration Service User Guide*.
