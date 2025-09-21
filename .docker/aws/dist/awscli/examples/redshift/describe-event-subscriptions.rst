**To describe event subscriptions**

The following ``describe-event-subscriptions`` example displays event notification subscriptions for the specified subscription. ::

    aws redshift describe-event-subscriptions \
        --subscription-name mysubscription

Output::

    {
        "EventSubscriptionsList": [
            {
                "CustomerAwsId": "123456789012",
                "CustSubscriptionId": "mysubscription",
                "SnsTopicArn": "arn:aws:sns:us-west-2:123456789012:MySNStopic",
                "Status": "active",
                "SubscriptionCreationTime": "2019-12-09T21:50:21.332Z",
                "SourceIdsList": [],
                "EventCategoriesList": [
                    "management"
                ],
                "Severity": "ERROR",
                "Enabled": true,
                "Tags": []
            }
        ]
    }

For more information, see `Subscribing to Amazon Redshift Event Notifications <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-event-notifications.html>`__ in the *Amazon Redshift Cluster Management Guide*.
