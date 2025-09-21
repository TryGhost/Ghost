**To list the subscriptions associated with a topic**

The following ``list-subscriptions-by-topic`` retrieves a list of SNS subscriptions associated with the specified topic. ::

    aws sns list-subscriptions-by-topic \
        --topic-arn "arn:aws:sns:us-west-2:123456789012:my-topic"

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
