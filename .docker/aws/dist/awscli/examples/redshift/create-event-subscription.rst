**To create a notification subscription for an event**

The following ``create-event-subscription`` example creates an event notification subscription. ::

    aws redshift create-event-subscription \
        --subscription-name mysubscription \
        --sns-topic-arn arn:aws:sns:us-west-2:123456789012:MySNStopic \
        --source-type cluster \
        --source-ids mycluster

Output::

    {
            "EventSubscription": {
            "CustomerAwsId": "123456789012",
            "CustSubscriptionId": "mysubscription",
            "SnsTopicArn": "arn:aws:sns:us-west-2:123456789012:MySNStopic",
            "Status": "active",
            "SubscriptionCreationTime": "2019-12-09T20:05:19.365Z",
            "SourceType": "cluster",
            "SourceIdsList": [
                "mycluster"
            ],
            "EventCategoriesList": [],
            "Severity": "INFO",
            "Enabled": true,
            "Tags": []
        }
    }

For more information, see `Subscribing to Amazon Redshift Event Notifications <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-event-notifications.html>`__ in the *Amazon Redshift Cluster Management Guide*.
