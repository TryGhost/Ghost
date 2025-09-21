**To subscribe to a topic**

The following ``subscribe`` command subscribes an email address to the specified topic. ::

    aws sns subscribe \
        --topic-arn arn:aws:sns:us-west-2:123456789012:my-topic \
        --protocol email \
        --notification-endpoint my-email@example.com

Output::

    {
        "SubscriptionArn": "pending confirmation"
    }
