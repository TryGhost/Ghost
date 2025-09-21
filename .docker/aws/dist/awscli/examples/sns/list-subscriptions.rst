**To list your SNS subscriptions**

The following ``list-subscriptions`` example displays a list of the SNS subscriptions in your AWS account. ::

    aws sns list-subscriptions

Output::

    {
        "Subscriptions": [
            {
                "Owner": "123456789012",
                "Endpoint": "my-email@example.com",
                "Protocol": "email",
                "TopicArn": "arn:aws:sns:us-west-2:123456789012:my-topic",
                "SubscriptionArn": "arn:aws:sns:us-west-2:123456789012:my-topic:8a21d249-4329-4871-acc6-7be709c6ea7f"
            }
        ]
    }
